"""
WebSocket Stream & Spike Injection Routes for Real-Time Transaction Monitoring.
Integrates VelocityStore for per-card abuse ring detection and EWMA baseline drift adaptation.
"""

import asyncio
import json
import pandas as pd
from datetime import datetime, timedelta
from typing import List, Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from app.data.generator import TransactionGenerator
from app.models.detector import FraudSpikeDetector
from app.models.velocity_store import VelocityStore

router = APIRouter()

# Global singletons
generator = TransactionGenerator()
detector = FraudSpikeDetector(contamination=0.05)
velocity_store = VelocityStore(max_window_seconds=300)

def _fit_detector_on_history():
    """Generates 60 minutes of baseline historical data and fits detector on 1-minute windows."""
    # Try loading persisted model first (fast path)
    if detector.load():
        return

    # Cold-start: generate baseline and fit
    history = generator.generate_batch(duration_minutes=60, anomalies_count=0)
    df_hist = pd.DataFrame(history)
    df_hist["dt"] = pd.to_datetime(df_hist["timestamp"])
    
    windows = []
    velocity_features_list = []
    
    # Simulate rolling stream to build velocity state
    for _, group in df_hist.groupby(pd.Grouper(key="dt", freq="1min")):
        if group.empty: continue
        group_tx = group.to_dict("records")
        velocity_store.record_batch(group_tx)
        v_feats = velocity_store.get_window_velocity_features(group_tx)
        
        windows.append(group)
        velocity_features_list.append(v_feats)
        
    detector.fit(windows, velocity_features_list)

_fit_detector_on_history()

active_spike_until: datetime = None
active_spike_type: str = "volume_spike"

class SpikeRequest(BaseModel):
    spike_type: str = "volume_spike"
    duration_seconds: int = 15

@router.post("/api/demo/inject-spike")
async def inject_spike(req: SpikeRequest):
    """Trigger an intentional fraud spike in the live stream for demo purposes."""
    global active_spike_until, active_spike_type
    active_spike_until = datetime.now() + timedelta(seconds=req.duration_seconds)
    active_spike_type = req.spike_type
    return {
        "status": "SPIKE_INJECTED",
        "spike_type": req.spike_type,
        "duration_seconds": req.duration_seconds,
        "expires_at": active_spike_until.isoformat()
    }

@router.websocket("/ws/transactions")
async def websocket_transaction_stream(websocket: WebSocket):
    await websocket.accept()

    # Hydrate window buffer with 60 seconds of baseline to avoid cold-start ramp-up
    init_batch = generator.generate_batch(duration_minutes=1, anomalies_count=0)
    window_buffer: List[Dict[str, Any]] = list(init_batch)

    # Pre-fill velocity store with hydration batch
    velocity_store.record_batch(init_batch)

    try:
        while True:
            now = datetime.now()
            is_active_spike = active_spike_until is not None and now < active_spike_until

            # Transaction burst count per 1-second tick
            if is_active_spike:
                if active_spike_type == "volume_spike":
                    tx_count = 16
                elif active_spike_type == "velocity_spike":
                    tx_count = 10
                else:  # amount_spike
                    tx_count = 4
            else:
                base_rate = generator._get_base_rate(now)
                import random
                # Generator averages 2.5 * base_rate txns every 4 seconds = 0.625 * base_rate per second
                if random.random() < (0.625 * base_rate):
                    tx_count = 1
                else:
                    tx_count = 0

            new_transactions = []
            for _ in range(tx_count):
                tx = generator.generate_single_transaction(
                    dt=now,
                    is_anomaly=is_active_spike,
                    anomaly_type=active_spike_type if is_active_spike else "normal"
                )
                new_transactions.append(tx)
                window_buffer.append(tx)

            # Record new transactions in velocity store
            velocity_store.record_batch(new_transactions)

            # Keep window buffer to last 60 seconds
            cutoff = now - timedelta(seconds=60)
            window_buffer = [
                t for t in window_buffer
                if datetime.fromisoformat(t["timestamp"]) >= cutoff
            ]

            # Ground truth: any spike transactions still in the 60s rolling window?
            window_has_spike = any(t.get("is_anomaly") == 1 for t in window_buffer)

            # Get velocity features from VelocityStore for this window's cards
            v_feats = velocity_store.get_window_velocity_features(window_buffer)

            # Analyze rolling window with velocity-augmented features
            df_window = pd.DataFrame(window_buffer) if window_buffer else pd.DataFrame()
            pred = detector.predict_window(df_window, velocity_features=v_feats)

            # EWMA baseline drift update on clean (non-anomalous) windows only.
            # We use the GROUND TRUTH (window_has_spike) to prevent the death spiral.
            # If the model falsely flags normal traffic, it MUST update the baseline to learn.
            if not window_has_spike:
                detector.update_baseline_ewma(df_window, v_feats)

            payload = {
                "timestamp": now.isoformat(),
                "batch_transactions": new_transactions,
                "window_summary": pred["features"],
                "is_anomaly": pred["is_anomaly"],
                "anomaly_score": pred["anomaly_score"],
                "contributing_features": pred["contributing_features"],
                "active_spike": active_spike_type if window_has_spike else None,
                "velocity_features": v_feats
            }

            await websocket.send_text(json.dumps(payload))
            await asyncio.sleep(1.0)

    except WebSocketDisconnect:
        pass
