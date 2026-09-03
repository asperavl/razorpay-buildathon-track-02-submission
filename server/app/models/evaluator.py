"""
Honest Evaluator for FraudPulse.

Production-grade evaluation including:
- Precision, Recall, F1, Confusion Matrix
- False-Positive Cost in ₹ (merchant friction quantification)
- ROC Curve with F1-optimal threshold identification
- Detection Delay Metric (seconds from spike start to first alert)
"""

from typing import List, Dict, Any, Optional
import numpy as np


class HonestEvaluator:

    @staticmethod
    def find_optimal_threshold(y_true: List[int], scores: List[float]) -> Dict[str, float]:
        """
        Scans 100 threshold values and returns the one that maximizes F1 score.
        This replaces manually tuned thresholds with a data-driven operating point.
        """
        best_f1 = 0.0
        best_threshold = 0.5
        best_precision = 0.0
        best_recall = 0.0

        thresholds = np.linspace(0.0, 1.0, 100)
        for th in thresholds:
            preds = [1 if s >= th else 0 for s in scores]
            tp = sum(1 for gt, pr in zip(y_true, preds) if gt == 1 and pr == 1)
            fp = sum(1 for gt, pr in zip(y_true, preds) if gt == 0 and pr == 1)
            fn = sum(1 for gt, pr in zip(y_true, preds) if gt == 1 and pr == 0)

            precision = tp / max(1, tp + fp)
            recall = tp / max(1, tp + fn)
            f1 = (2 * precision * recall) / max(1e-9, precision + recall)

            if f1 > best_f1:
                best_f1 = f1
                best_threshold = float(th)
                best_precision = precision
                best_recall = recall

        return {
            "optimal_threshold": round(best_threshold, 3),
            "optimal_f1": round(best_f1, 4),
            "optimal_precision": round(best_precision, 4),
            "optimal_recall": round(best_recall, 4)
        }

    @staticmethod
    def compute_detection_delay(
        window_timestamps: List[str],
        y_true: List[int],
        y_pred: List[int]
    ) -> Optional[float]:
        """
        Computes the detection delay in seconds:
        Time from the first true fraud window to the first correctly flagged prediction.

        Returns None if no fraud windows exist in the test set.
        """
        try:
            from datetime import datetime
            first_fraud_idx = next((i for i, gt in enumerate(y_true) if gt == 1), None)
            first_tp_idx = next(
                (i for i, (gt, pr) in enumerate(zip(y_true, y_pred)) if gt == 1 and pr == 1),
                None
            )

            if first_fraud_idx is None or first_tp_idx is None:
                return None

            t_fraud = datetime.fromisoformat(window_timestamps[first_fraud_idx])
            t_detect = datetime.fromisoformat(window_timestamps[first_tp_idx])
            delay = (t_detect - t_fraud).total_seconds()
            return round(max(0.0, delay), 1)
        except Exception:
            return None

    @staticmethod
    def evaluate(
        y_true: List[int],
        y_pred: List[int],
        scores: List[float],
        amounts: List[float] = None,
        window_timestamps: List[str] = None
    ) -> Dict[str, Any]:
        """Calculates standard classification metrics, ROC curve, and quantified false-positive cost in INR."""
        tp = sum(1 for gt, pr in zip(y_true, y_pred) if gt == 1 and pr == 1)
        fp = sum(1 for gt, pr in zip(y_true, y_pred) if gt == 0 and pr == 1)
        tn = sum(1 for gt, pr in zip(y_true, y_pred) if gt == 0 and pr == 0)
        fn = sum(1 for gt, pr in zip(y_true, y_pred) if gt == 1 and pr == 0)

        precision = tp / max(1, (tp + fp))
        recall = tp / max(1, (tp + fn))
        f1 = (2 * precision * recall) / max(1e-9, (precision + recall))

        # Quantify False Positive Cost
        # 15% friction: lost customer LTV + ops review cost per false flag
        if amounts and len(amounts) == len(y_true):
            fp_amounts = [amt for gt, pr, amt in zip(y_true, y_pred, amounts) if gt == 0 and pr == 1]
            total_fp_volume = sum(fp_amounts)
            false_positive_cost = int(total_fp_volume * 0.15)
        else:
            false_positive_cost = int(fp * 1200 * 0.15)

        # ROC-optimal threshold discovery
        optimal = HonestEvaluator.find_optimal_threshold(y_true, scores)

        # ROC curve (11-point interpolation for visualization)
        thresholds = np.linspace(0.0, 1.0, 11)
        roc_points = []
        for th in thresholds:
            th_preds = [1 if s >= th else 0 for s in scores]
            th_tp = sum(1 for gt, pr in zip(y_true, th_preds) if gt == 1 and pr == 1)
            th_fp = sum(1 for gt, pr in zip(y_true, th_preds) if gt == 0 and pr == 1)
            tpr = th_tp / max(1, (tp + fn))
            fpr = th_fp / max(1, (fp + tn))
            roc_points.append({
                "threshold": round(float(th), 2),
                "fpr": round(float(fpr), 3),
                "tpr": round(float(tpr), 3)
            })

        # Detection delay
        detection_delay_seconds = None
        if window_timestamps:
            detection_delay_seconds = HonestEvaluator.compute_detection_delay(
                window_timestamps, y_true, y_pred
            )

        return {
            "metrics": {
                "precision": round(precision, 4),
                "recall": round(recall, 4),
                "f1_score": round(f1, 4),
                "false_positive_cost_inr": round(false_positive_cost, 2),
            },
            "optimal_threshold": optimal,
            "detection_delay_seconds": detection_delay_seconds,
            "confusion_matrix": {
                "true_positives": tp,
                "false_positives": fp,
                "true_negatives": tn,
                "false_negatives": fn,
            },
            "honest_cost_breakdown": {
                "false_positives_count": fp,
                "total_fp_volume_inr": round(total_fp_volume if amounts else fp * 1200, 2),
                "estimated_friction_loss_inr": round(false_positive_cost, 2),
                "friction_rate": "15% of blocked legitimate transaction volume"
            },
            "roc_curve": roc_points,
            "total_evaluated_windows": len(y_true),
            "defense_compliance": "STRICTLY_DEFENSE_ONLY"
        }
