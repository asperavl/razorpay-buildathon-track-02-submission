"""
Per-Card Velocity Counter for FraudPulse Abuse Ring Sentinel.

Tracks rolling transaction frequency per card hash in memory.
Detects coordinated carding attacks and bot-driven velocity abuse
that are invisible to single-window feature detectors.
"""

from collections import defaultdict, deque
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import numpy as np


class VelocityStore:
    def __init__(self, max_window_seconds: int = 300):
        """
        Args:
            max_window_seconds: Rolling time window for velocity tracking (default: 5 minutes).
        """
        self.max_window_seconds = max_window_seconds
        # card_hash -> deque of ISO timestamp strings
        self._store: Dict[str, deque] = defaultdict(lambda: deque(maxlen=500))

    def record(self, card_hash: str, timestamp: str):
        """Record a transaction for a card."""
        self._store[card_hash].append(timestamp)

    def record_batch(self, transactions: List[dict]):
        """Record a batch of transactions from a window tick."""
        for tx in transactions:
            self.record(tx["card_hash"], tx["timestamp"])

    def _prune(self, card_hash: str, cutoff: datetime):
        """Remove timestamps older than the cutoff from a card's history."""
        store = self._store[card_hash]
        while store and datetime.fromisoformat(store[0]) < cutoff:
            store.popleft()

    def get_card_velocity(self, card_hash: str, window_seconds: int = None) -> int:
        """Returns number of transactions by a card in the last N seconds."""
        ws = window_seconds or self.max_window_seconds
        cutoff = datetime.now() - timedelta(seconds=ws)
        self._prune(card_hash, cutoff)
        return len(self._store[card_hash])

    def get_window_velocity_features(self, transactions: List[dict]) -> Dict[str, float]:
        """
        Compute velocity-based features across all cards in a transaction window.
        Returns:
            - max_card_velocity: Maximum transactions by a single card in 5-min window
            - velocity_gini: Gini coefficient of card velocity distribution
                            (0 = perfectly equal, 1 = one card doing all transactions = bot attack)
        """
        if not transactions:
            return {"max_card_velocity": 0.0, "velocity_gini": 0.0}

        # Get unique cards in this window batch
        unique_cards = list({tx["card_hash"] for tx in transactions})
        velocities = [self.get_card_velocity(card) for card in unique_cards]

        max_velocity = float(max(velocities)) if velocities else 0.0
        gini = self._gini(velocities)

        return {
            "max_card_velocity": max_velocity,
            "velocity_gini": float(gini)
        }

    @staticmethod
    def _gini(values: List[float]) -> float:
        """
        Compute Gini coefficient of a distribution.
        Used to measure inequality in card velocity distribution.
        High Gini (>0.7) = one card dominates = coordinated attack signal.
        """
        if not values or len(values) == 1:
            return 0.0
        arr = np.array(values, dtype=float)
        arr = np.sort(arr)
        n = len(arr)
        cumulative = np.cumsum(arr)
        return float((2 * np.sum((np.arange(1, n + 1)) * arr) - (n + 1) * cumulative[-1]) /
                     (n * cumulative[-1] + 1e-9))
