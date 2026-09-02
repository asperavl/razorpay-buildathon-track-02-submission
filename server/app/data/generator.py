"""
Synthetic Transaction Data Generator for FraudPulse.
Simulates realistic Indian merchant transaction streams with diurnal variations
and controllable fraud spike injection (Volume, Velocity, Amount spikes).
"""

import time
import random
import math
import hashlib
from datetime import datetime, timedelta
from typing import List, Dict, Any, Generator

MERCHANT_CATEGORIES = ["e_commerce", "food_delivery", "gaming", "travel", "utility_bills"]

class TransactionGenerator:
    def __init__(self, seed: int = 42):
        random.seed(seed)
        self.card_pool = [
            hashlib.sha256(f"card_{i}".encode()).hexdigest()[:16]
            for i in range(500)
        ]
        self.abusive_card_pool = [
            hashlib.sha256(f"fraud_card_{i}".encode()).hexdigest()[:16]
            for i in range(20)
        ]

    def _get_base_rate(self, dt: datetime) -> float:
        """Returns diurnal traffic multiplier based on IST hour (peak 09:00 - 22:00)."""
        hour = dt.hour + (dt.minute / 60.0)
        # Smooth sine wave peaking around 16:00 IST
        multiplier = 0.3 + 0.7 * max(0, math.sin(math.pi * (hour - 6) / 16))
        return multiplier

    def generate_single_transaction(
        self,
        dt: datetime,
        is_anomaly: bool = False,
        anomaly_type: str = "normal"
    ) -> Dict[str, Any]:
        """Generates a single synthetic transaction record."""
        if is_anomaly:
            if anomaly_type == "velocity_spike":
                card_id = random.choice(self.abusive_card_pool)
                amount = round(random.uniform(500, 2500), 2)
            elif anomaly_type == "amount_spike":
                card_id = random.choice(self.card_pool)
                amount = round(random.uniform(45000, 150000), 2)  # Unusually high transaction value
            else:  # volume_spike
                card_id = random.choice(self.card_pool)
                amount = round(random.uniform(100, 3000), 2)
        else:
            card_id = random.choice(self.card_pool)
            amount = round(random.expovariate(1 / 1200.0), 2) + 50.0  # Realistic exponential amount dist

        category = random.choice(MERCHANT_CATEGORIES)
        
        return {
            "timestamp": dt.isoformat(),
            "transaction_id": f"txn_{int(dt.timestamp() * 1000)}_{random.randint(1000, 9999)}",
            "card_hash": card_id,
            "amount": amount,
            "merchant_category": category,
            "is_anomaly": 1 if is_anomaly else 0,
            "anomaly_type": anomaly_type if is_anomaly else "normal",
        }

    def generate_batch(
        self,
        start_time: datetime = None,
        duration_minutes: int = 120,
        anomalies_count: int = 3
    ) -> List[Dict[str, Any]]:
        """Generates a historical batch dataset with periodic injected fraud spikes."""
        if start_time is None:
            start_time = datetime.now() - timedelta(minutes=duration_minutes)

        transactions = []
        current_time = start_time
        end_time = start_time + timedelta(minutes=duration_minutes)

        # Pick random intervals for anomaly spikes
        spike_windows = []
        if duration_minutes > 15:
            step = duration_minutes // (anomalies_count + 1)
            for i in range(1, anomalies_count + 1):
                spike_start = start_time + timedelta(minutes=i * step + random.randint(-3, 3))
                spike_type = random.choice(["volume_spike", "velocity_spike", "amount_spike"])
                spike_windows.append((spike_start, spike_start + timedelta(minutes=3), spike_type))

        while current_time < end_time:
            # Check if inside any anomaly window
            active_spike = None
            for s_start, s_end, s_type in spike_windows:
                if s_start <= current_time <= s_end:
                    active_spike = s_type
                    break

            base_rate = self._get_base_rate(current_time)
            
            if active_spike == "volume_spike":
                # Create a mix of subtle (3x-5x) and massive (15x-25x) volume jumps
                intensity = random.choice([random.uniform(3.0, 5.0), random.uniform(15.0, 25.0)])
                num_txns = int(intensity * base_rate)
            elif active_spike == "velocity_spike":
                # Mix of subtle card testing and aggressive card testing
                intensity = random.choice([random.uniform(2.5, 4.0), random.uniform(8.0, 15.0)])
                num_txns = int(intensity * base_rate)
            else:
                num_txns = max(1, int(random.randint(1, 4) * base_rate))

            for _ in range(num_txns):
                is_anom = active_spike is not None
                tx = self.generate_single_transaction(
                    dt=current_time,
                    is_anomaly=is_anom,
                    anomaly_type=active_spike if is_anom else "normal"
                )
                transactions.append(tx)

            current_time += timedelta(seconds=random.randint(2, 6))

        return transactions
