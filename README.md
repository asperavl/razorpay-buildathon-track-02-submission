# FraudPulse — Real-Time Fraud-Spike Detector

> **Razorpay Buildathon — Track 02: AI Risk Manager**
> Defense-Only · Honest Metrics · Explainable Alerts

![Dashboard](https://img.shields.io/badge/stack-FastAPI%20%2B%20React-blue)
![License](https://img.shields.io/badge/scope-defense--only-green)

FraudPulse monitors live Indian merchant transaction streams, detects sudden anomalies using a production-grade ML ensemble, and reports evaluation metrics including the **cost of false positives in ₹**.

---

## Architecture

```
  Synthetic Transaction Generator
  (IST diurnal rhythm · injected spikes · Gaussian noise)
              │
              ▼
  ┌───────────────────────────────────────────────┐
  │         FraudSpikeDetector                    │
  │                                               │
  │  ① 60-second rolling window feature extract  │
  │     txn_count · total_amount · mean_amount    │
  │     std_amount · unique_cards · reuse_ratio   │
  │     high_val_count · max_card_velocity        │
  │     velocity_gini (Herfindahl-Hirschman)      │
  │                                               │
  │  ② StandardScaler pipeline (joblib-cached)   │
  │                                               │
  │  ③ Isolation Forest  (global outlier)        │
  │     + Local Outlier Factor  (density)        │
  │     → double-gate ensemble vote               │
  │                                               │
  │  ④ Z-score XAI attribution                   │
  │     "Max card velocity 8.3σ above baseline"  │
  │                                               │
  │  ⑤ EWMA drift adaptation (α=0.05)            │
  │     Baseline updates on normal windows only  │
  └──────────────────┬────────────────────────────┘
                     │
          ┌──────────┴──────────┐
    WebSocket (1 Hz)       REST API
          │                    │
  ┌───────▼───────┐   ┌────────▼────────┐
  │  Risk Ops     │   │  Honest Eval    │
  │  Terminal UI  │   │  (P/R/F1/Cost)  │
  └───────────────┘   └─────────────────┘
```

---

## ML Design Decisions

| Decision | Choice | Why |
|---|---|---|
| Feature space | 9-dimensional rolling window | Captures velocity, concentration, and distribution shape simultaneously |
| Ensemble | IF + LOF double-gate | IF detects global outliers; LOF detects local density anomalies; both must agree to alert |
| Threshold | ROC-optimal (F1-maximizing) | Computed from held-out set — not hardcoded |
| Baseline update | EWMA on normal windows only | Prevents contaminating the baseline with fraud patterns |
| XAI | Sigmoid Z-score attribution | Each alert prints the exact feature that triggered it and its σ magnitude |
| Variance floor | `max(std, √mean)` Poisson regularizer | Prevents division-by-zero on low-traffic windows |
| Feature persistence | joblib-cached scaler + stats | Instant warm-start; consistent normalization across restarts |

---

## Honest Evaluation

The model is evaluated on a **held-out 3-hour test stream** (never seen during training) with injected fraud spikes at random intervals and magnitudes. No random seed is fixed — each run produces a genuinely different test distribution.

Reported metrics on every load:

| Metric | Meaning |
|---|---|
| **Precision** | What fraction of flagged windows were real fraud |
| **Recall** | What fraction of real fraud windows were caught |
| **F1 Score** | Harmonic mean of Precision and Recall |
| **ROC-Optimal Threshold** | The decision cutoff that maximises F1 on held-out data |
| **Detection Delay** | Seconds from spike start to first alert |
| **False-Positive Cost ₹** | FP count × ₹350 avg order value — the real merchant friction cost |

The **Live Session Matrix** updates in real time as you interact with the dashboard, giving a second evaluation dimension distinct from the held-out benchmark.

---

## Features

- **WebSocket stream** at 1 Hz delivering rolling transaction features and anomaly predictions
- **Three attack vectors** injectable from the dashboard: Volume Surge (10×), Card Velocity Ring, High-Value Anomaly
- **Explainable alerts** — every flagged window surfaces the exact Z-score trigger with human-readable text
- **Dual-view metrics** — toggle between the held-out benchmark and the live session matrix
- **CSV Upload** — drag-drop any merchant CSV for batch anomaly analysis through the same IF+LOF pipeline
- **JSON Audit Export** — client-side snapshot of the live session state; SIEM-compatible (Splunk / Datadog)

---

## Running Locally

### Prerequisites

- Python 3.10+
- Node.js 18+

### Backend (FastAPI)

```powershell
cd server
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

| Endpoint | Description |
|---|---|
| `GET /api/metrics` | Held-out evaluation metrics + confusion matrix |
| `POST /api/demo/inject-spike` | Trigger a fraud spike (`type`, `duration_s`) |
| `POST /api/upload-csv` | Batch-analyze a merchant CSV |
| `GET /api/export` | Generate audit report JSON |
| `WS /ws/transactions` | Live 1 Hz transaction stream |

### Frontend (Vite + React)

```powershell
cd client
npm install
npm run dev
```

Open `http://localhost:5173`

### Demo Dataset

Generate a realistic 6-hour transaction CSV for the Upload feature:

```powershell
python generate_demo_csv.py
# → demo_transactions.csv (≈2,000 rows, 5 injected spikes)
```

---

## Project Structure

```
razorpay_buildathon/
├── server/
│   └── app/
│       ├── models/
│       │   ├── detector.py       # IF + LOF ensemble, EWMA, XAI
│       │   ├── evaluator.py      # ROC-optimal threshold, detection delay
│       │   └── velocity_store.py # Per-card rolling velocity + Gini
│       ├── data/
│       │   └── generator.py      # IST diurnal stream + spike injector
│       └── routes/
│           ├── metrics.py        # Held-out evaluation endpoint
│           ├── export.py         # Audit report endpoint
│           └── upload.py         # CSV batch analysis endpoint
├── client/
│   └── src/
│       ├── components/           # Risk terminal UI components
│       └── hooks/
│           └── useTransactionStream.js  # WebSocket + live matrix logic
└── generate_demo_csv.py          # Demo data generator
```
