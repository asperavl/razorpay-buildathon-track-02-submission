"""
CSV Dataset Upload & Custom Analysis Route for FraudPulse.
Accepts user/judge CSV files and runs dynamic anomaly detection on custom datasets.
"""

import io
import pandas as pd
from typing import Dict, Any, List
from fastapi import APIRouter, UploadFile, File, HTTPException
from app.models.detector import FraudSpikeDetector

router = APIRouter()

def _normalize_csv_dataframe(df: pd.DataFrame) -> pd.DataFrame:
    """Normalizes column names to standard FraudPulse schema."""
    cols = {c.lower().strip(): c for c in df.columns}
    
    # Amount column detection
    amt_col = None
    for candidate in ["amount", "txn_amount", "val", "value", "price", "total"]:
        if candidate in cols:
            amt_col = cols[candidate]
            break
    if not amt_col:
        # Fallback to first float/int column
        num_cols = df.select_dtypes(include=["float64", "int64"]).columns
        if len(num_cols) > 0:
            amt_col = num_cols[0]
        else:
            df["amount"] = 500.0
            amt_col = "amount"

    # Card hash / Account detection
    card_col = None
    for candidate in ["card_hash", "card_id", "card", "account_id", "user_id", "customer_id"]:
        if candidate in cols:
            card_col = cols[candidate]
            break
    if not card_col:
        df["card_hash"] = "card_default_hash"
        card_col = "card_hash"

    # Timestamp detection
    time_col = None
    for candidate in ["timestamp", "time", "date", "datetime", "dt"]:
        if candidate in cols:
            time_col = cols[candidate]
            break
    
    normalized = pd.DataFrame()
    normalized["amount"] = df[amt_col].astype(float)
    normalized["card_hash"] = df[card_col].astype(str)
    
    if time_col:
        try:
            normalized["timestamp"] = pd.to_datetime(df[time_col])
        except Exception:
            normalized["timestamp"] = pd.date_range(start="2026-09-03 00:00:00", periods=len(df), freq="3s")
    else:
        normalized["timestamp"] = pd.date_range(start="2026-09-03 00:00:00", periods=len(df), freq="3s")

    return normalized

@router.post("/api/upload-csv")
async def upload_custom_csv(file: UploadFile = File(...)):
    """Uploads a custom transaction CSV dataset and runs anomaly detection analysis."""
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only .csv files are supported.")

    try:
        contents = await file.read()
        df_raw = pd.read_csv(io.BytesIO(contents))
        if df_raw.empty:
            raise HTTPException(status_code=400, detail="CSV file is empty.")

        df = _normalize_csv_dataframe(df_raw)
        
        # Group into 1-minute time windows
        windows = [group for _, group in df.groupby(pd.Grouper(key="timestamp", freq="1min")) if not group.empty]
        if not windows:
            # Fallback: chunk by 20 rows per window
            windows = [df.iloc[i:i+20] for i in range(0, len(df), 20)]

        # Split into training baseline (first 30%) and test evaluation (70%)
        split_idx = max(1, int(len(windows) * 0.3))
        train_windows = windows[:split_idx]
        test_windows = windows[split_idx:] if len(windows) > 1 else windows

        detector = FraudSpikeDetector(contamination=0.05)
        detector.fit(train_windows)

        analyzed_windows = []
        anomaly_count = 0
        total_volume = 0.0

        for idx, w in enumerate(test_windows):
            res = detector.predict_window(w)
            if res["is_anomaly"]:
                anomaly_count += 1
            w_amt = float(w["amount"].sum())
            total_volume += w_amt
            
            analyzed_windows.append({
                "window_index": idx + 1,
                "txn_count": len(w),
                "total_amount": round(w_amt, 2),
                "is_anomaly": res["is_anomaly"],
                "anomaly_score": res["anomaly_score"],
                "contributing_features": res["contributing_features"]
            })

        return {
            "status": "SUCCESS",
            "filename": file.filename,
            "total_transactions": len(df),
            "total_windows": len(test_windows),
            "anomalies_detected": anomaly_count,
            "anomaly_rate_pct": round((anomaly_count / max(1, len(test_windows))) * 100, 1),
            "total_volume_inr": round(total_volume, 2),
            "analyzed_windows": analyzed_windows[:50]  # Return top 50 windows for visual preview
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing CSV: {str(e)}")
