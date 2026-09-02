"""
REST Metrics Router exposing held-out evaluation performance and model metadata.
Uses ROC-optimal threshold and passes window timestamps for detection delay computation.
"""

import pandas as pd
from fastapi import APIRouter
from app.data.generator import TransactionGenerator
from app.models.detector import FraudSpikeDetector
from app.models.evaluator import HonestEvaluator

router = APIRouter()

@router.get("/api/metrics")
async def get_heldout_metrics():
    """Evaluates detector on a dynamic held-out test set and returns honest metrics."""
    gen = TransactionGenerator()

    # 1. Generate historical baseline for fitting (60 mins, clean)
    baseline_batch = gen.generate_batch(duration_minutes=60, anomalies_count=0)
    df_base = pd.DataFrame(baseline_batch)
    df_base["dt"] = pd.to_datetime(df_base["timestamp"])
    base_windows = [group for _, group in df_base.groupby(pd.Grouper(key="dt", freq="1min")) if not group.empty]

    detector = FraudSpikeDetector(contamination=0.05)
    detector.fit(base_windows)

    # 2. Generate held-out test set (180 mins with 5 injected anomaly bursts)
    test_batch = gen.generate_batch(duration_minutes=180, anomalies_count=5)
    df_test = pd.DataFrame(test_batch)
    df_test["dt"] = pd.to_datetime(df_test["timestamp"])
    test_windows = [group for _, group in df_test.groupby(pd.Grouper(key="dt", freq="1min")) if not group.empty]

    y_true = []
    y_pred = []
    scores = []
    amounts = []
    window_timestamps = []

    # Temporary velocity store for realistic evaluation
    from app.models.velocity_store import VelocityStore
    test_velocity_store = VelocityStore()

    for group in test_windows:
        gt = 1 if (group["is_anomaly"] == 1).any() else 0
        
        group_tx = group.to_dict("records")
        test_velocity_store.record_batch(group_tx)
        v_feats = test_velocity_store.get_window_velocity_features(group_tx)
        
        pred = detector.predict_window(group, velocity_features=v_feats)

        y_true.append(gt)
        y_pred.append(1 if pred["is_anomaly"] else 0)
        scores.append(pred["anomaly_score"])
        amounts.append(float(group["amount"].sum()))
        window_timestamps.append(group["timestamp"].iloc[0])

    eval_result = HonestEvaluator.evaluate(
        y_true=y_true,
        y_pred=y_pred,
        scores=scores,
        amounts=amounts,
        window_timestamps=window_timestamps
    )

    return eval_result
