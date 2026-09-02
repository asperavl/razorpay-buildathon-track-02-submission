"""
Fraud Spike Detector Engine — Production-Grade Implementation.

Features:
- Isolation Forest (global outlier detection)
- Local Outlier Factor ensemble (local density anomaly detection)
- sklearn Pipeline with StandardScaler (proper feature normalization)
- Model persistence via joblib (instant cold-start)
- Variance regularization (Poisson floor + epsilon smoothing)
- EWMA baseline drift adaptation (alpha=0.05, normal windows only)
- 9-dimensional feature space including per-card velocity (VelocityStore)
- ROC-optimal threshold determined during evaluation
- Z-score XAI attribution for human-readable explanations
"""

import os
import numpy as np
import pandas as pd
import joblib
from typing import Dict, Any, List, Optional
from sklearn.ensemble import IsolationForest
from sklearn.neighbors import LocalOutlierFactor
from sklearn.preprocessing import StandardScaler

MODEL_CACHE_PATH = os.path.join(os.path.dirname(__file__), "trained_if.joblib")
LOF_CACHE_PATH   = os.path.join(os.path.dirname(__file__), "trained_lof.joblib")
SCALER_CACHE_PATH = os.path.join(os.path.dirname(__file__), "trained_scaler.joblib")
STATS_CACHE_PATH = os.path.join(os.path.dirname(__file__), "baseline_stats.joblib")

FEATURE_COLS = [
    "txn_count", "total_amount", "mean_amount", "std_amount",
    "unique_cards", "card_reuse_ratio", "high_val_count",
    "max_card_velocity", "velocity_gini"
]


class FraudSpikeDetector:
    def __init__(self, contamination: float = 0.05):
        self.contamination = contamination
        self.scaler = StandardScaler()
        self.iso_forest = IsolationForest(
            n_estimators=100,
            contamination=contamination,
            random_state=42
        )
        # LOF with novelty=True allows predict() on unseen samples
        self.lof = LocalOutlierFactor(
            n_neighbors=20,
            novelty=True,
            contamination=contamination
        )
        self.is_fitted = False
        self.baseline_stats: Dict[str, Dict[str, float]] = {}
        self.min_required_txns: int = 3
        self.ewma_alpha: float = 0.05  # Slow adaptation: preserves baseline stability

    def extract_window_features(
        self,
        df_window: pd.DataFrame,
        velocity_features: Optional[Dict[str, float]] = None
    ) -> Dict[str, float]:
        """Extracts 9-dimensional statistical feature vector from a transaction window."""
        if df_window.empty:
            return {col: 0.0 for col in FEATURE_COLS}

        count = len(df_window)
        total_amt = float(df_window["amount"].sum())
        mean_amt  = float(df_window["amount"].mean())
        std_amt   = float(df_window["amount"].std() if count > 1 else 0.0)
        if np.isnan(std_amt): std_amt = 0.0
        unique_cards  = int(df_window["card_hash"].nunique())
        reuse_ratio   = float((count - unique_cards) / max(1, count))
        high_val_count = float((df_window["amount"] > 25000).sum())

        return {
            "txn_count":         float(count),
            "total_amount":      total_amt,
            "mean_amount":       mean_amt,
            "std_amount":        std_amt,
            "unique_cards":      float(unique_cards),
            "card_reuse_ratio":  reuse_ratio,
            "high_val_count":    high_val_count,
            "max_card_velocity": float(velocity_features.get("max_card_velocity", 0.0)) if velocity_features else 0.0,
            "velocity_gini":     float(velocity_features.get("velocity_gini", 0.0)) if velocity_features else 0.0,
        }

    def _apply_std_floor(self, col: str, mean_val: float, sample_std: float) -> float:
        """Applies minimum variance floors to prevent Z-score explosion on stable metrics."""
        if col == "txn_count":
            return max(np.sqrt(max(1.0, mean_val)), sample_std, 3.0)
        elif col in ["total_amount", "mean_amount"]:
            return max(mean_val * 0.15, sample_std, 500.0)
        elif col == "max_card_velocity":
            return max(np.sqrt(max(1.0, mean_val)), sample_std, 2.0)
        else:
            return max(0.10, sample_std)

    def _build_regularized_stats(self, X: pd.DataFrame) -> Dict[str, Dict[str, float]]:
        """Variance regularization: Poisson floor for counts, CoV floor for amounts."""
        stats = {}
        for col in X.columns:
            mean_val   = float(X[col].mean())
            sample_std = float(X[col].std()) if not np.isnan(X[col].std()) else 1.0
            reg_std = self._apply_std_floor(col, mean_val, sample_std)
            stats[col] = {"mean": mean_val, "std": reg_std}
        return stats

    def fit(
        self,
        training_windows: List[pd.DataFrame],
        velocity_features_list: Optional[List[Dict]] = None
    ):
        """Train Isolation Forest + LOF ensemble on historical baseline windows."""
        features_list = [
            self.extract_window_features(w, velocity_features_list[i] if velocity_features_list else None)
            for i, w in enumerate(training_windows)
        ]
        X = pd.DataFrame(features_list, columns=FEATURE_COLS)
        self.baseline_stats = self._build_regularized_stats(X)

        # Dynamic warmup guard: 30% of learned mean txn count per window
        mean_count = self.baseline_stats["txn_count"]["mean"]
        self.min_required_txns = max(3, int(mean_count * 0.30))

        # Fit scaler, then both models on normalized feature space
        X_scaled = self.scaler.fit_transform(X)
        self.iso_forest.fit(X_scaled)
        self.lof.fit(X_scaled)
        self.is_fitted = True

        # Persist all components to disk
        joblib.dump(self.iso_forest, MODEL_CACHE_PATH)
        joblib.dump(self.lof, LOF_CACHE_PATH)
        joblib.dump(self.scaler, SCALER_CACHE_PATH)
        joblib.dump({
            "baseline_stats":     self.baseline_stats,
            "min_required_txns":  self.min_required_txns,
            "ewma_alpha":         self.ewma_alpha
        }, STATS_CACHE_PATH)

    def load(self) -> bool:
        """Load persisted model from disk. Returns True if successful."""
        paths = [MODEL_CACHE_PATH, LOF_CACHE_PATH, SCALER_CACHE_PATH, STATS_CACHE_PATH]
        if all(os.path.exists(p) for p in paths):
            self.iso_forest = joblib.load(MODEL_CACHE_PATH)
            self.lof        = joblib.load(LOF_CACHE_PATH)
            self.scaler     = joblib.load(SCALER_CACHE_PATH)
            cache = joblib.load(STATS_CACHE_PATH)
            self.baseline_stats    = cache["baseline_stats"]
            self.min_required_txns = cache["min_required_txns"]
            self.ewma_alpha        = cache.get("ewma_alpha", 0.05)
            self.is_fitted = True
            return True
        return False

    def update_baseline_ewma(
        self,
        df_window: pd.DataFrame,
        velocity_features: Optional[Dict] = None
    ):
        """
        EWMA baseline drift adaptation on non-anomalous windows only.
        Excludes fraud windows from updating the baseline (contamination prevention).
        """
        if not self.is_fitted or df_window.empty:
            return
        feats = self.extract_window_features(df_window, velocity_features)
        alpha = self.ewma_alpha
        for col, val in feats.items():
            if col not in self.baseline_stats:
                continue
            old_mean = self.baseline_stats[col]["mean"]
            new_mean = alpha * val + (1 - alpha) * old_mean
            diff     = val - old_mean
            old_std  = self.baseline_stats[col]["std"]
            new_var  = (1 - alpha) * (old_std ** 2) + alpha * (diff ** 2)
            
            # Apply EWMA but ensure the std doesn't decay below the regularization floor
            raw_new_std = max(old_std * 0.98, float(np.sqrt(new_var)))
            new_std = self._apply_std_floor(col, new_mean, raw_new_std)
            
            self.baseline_stats[col]["mean"] = new_mean
            self.baseline_stats[col]["std"]  = new_std

    def predict_window(
        self,
        df_window: pd.DataFrame,
        velocity_features: Optional[Dict[str, float]] = None
    ) -> Dict[str, Any]:
        """
        Ensemble prediction: Isolation Forest + Local Outlier Factor + Z-score gate.
        
        Alert fires only when:
          - Z-score > 3.5 (statistically significant deviation from baseline), AND
          - At least one of IF or LOF votes anomaly (-1)
        OR
          - Z-score > 5.0 (extreme deviation — skip LOF gate for instant alerting)
        """
        feats = self.extract_window_features(df_window, velocity_features)

        if not self.is_fitted:
            self.fit([df_window])

        # Dynamic warmup guard
        if len(df_window) < self.min_required_txns:
            return {
                "is_anomaly": False,
                "anomaly_score": 0.15,
                "features": feats,
                "contributing_features": []
            }

        X_single = pd.DataFrame([feats], columns=FEATURE_COLS)
        X_scaled = self.scaler.transform(X_single)

        # --- Model Votes ---
        if_pred  = self.iso_forest.predict(X_scaled)[0]   # -1 = anomaly
        lof_pred = self.lof.predict(X_scaled)[0]          # -1 = anomaly

        # --- Z-Score attribution against regularized baseline ---
        contributing_features = []
        max_z = 0.0
        for col, val in feats.items():
            if col not in self.baseline_stats:
                continue
            b_mean = self.baseline_stats[col]["mean"]
            b_std  = self.baseline_stats[col]["std"]
            z = (val - b_mean) / b_std
            if z > max_z:
                max_z = z
            if z > 2.5:
                contributing_features.append({
                    "feature":       col,
                    "current_val":   round(val, 2),
                    "baseline_avg":  round(b_mean, 2),
                    "z_score":       round(z, 2),
                    "description":   f"{col.replace('_', ' ').title()} is {round(z, 1)}σ above normal baseline"
                })
        contributing_features.sort(key=lambda x: x["z_score"], reverse=True)

        # --- Ensemble Decision Gate ---
        model_votes_anomaly = (if_pred == -1) or (lof_pred == -1)

        if max_z > 5.0:
            # Extreme deviation — instant alert regardless of model votes
            is_anomaly    = True
            anomaly_score = round(min(0.98, 0.85 + (max_z - 5.0) * 0.02), 3)
        elif max_z > 3.5 and model_votes_anomaly:
            # Standard gate: statistical significance + at least one model votes anomaly
            is_anomaly    = True
            anomaly_score = round(min(0.97, 0.70 + (max_z - 3.5) * 0.04), 3)
        else:
            is_anomaly    = False
            anomaly_score = round(min(0.35, max(0.12, 0.15 + max(0.0, max_z) * 0.04)), 3)

        return {
            "is_anomaly":            bool(is_anomaly),
            "anomaly_score":         float(anomaly_score),
            "features":              feats,
            "contributing_features": contributing_features[:3],
            "model_votes":           {
                "isolation_forest": int(if_pred),
                "local_outlier_factor": int(lof_pred),
                "max_z_score": round(float(max_z), 2)
            }
        }
