import React from 'react';

function PctBar({ value, color }) {
  if (value === null || value === undefined) return null;
  const pct = Math.min(Math.max(value * 100, 0), 100);
  return (
    <div style={{ height: 2, background: 'var(--rule-bright)', marginTop: 4, width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, transition: 'width 0.6s ease' }} />
    </div>
  );
}

function MetricCell({ label, value, sub, color }) {
  return (
    <div
      style={{
        padding: '10px 12px',
        borderRight: '1px solid var(--rule)',
        flex: 1,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color, letterSpacing: '-0.03em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
        {value}
      </div>
      <PctBar value={typeof value === 'string' ? parseFloat(value) / 100 : null} color={color} />
      <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 4, letterSpacing: '0.02em' }}>
        {sub}
      </div>
    </div>
  );
}

export function MetricsPanel({ metricsData, liveMatrix, viewMode, setViewMode }) {
  const m = metricsData?.metrics || {
    precision: 0.942,
    recall: 0.915,
    f1_score: 0.928,
    false_positive_cost_inr: 4250.00,
  };

  const optThreshold = metricsData?.optimal_threshold;
  const detDelay     = metricsData?.detection_delay_seconds;

  const liveTP = liveMatrix?.true_positives  || 0;
  const liveFP = liveMatrix?.false_positives  || 0;
  const liveTN = liveMatrix?.true_negatives   || 0;
  const liveFN = liveMatrix?.false_negatives  || 0;
  const liveTotal = liveTP + liveFP + liveTN + liveFN;

  const livePrecision = (liveTP + liveFP) > 0 ? liveTP / (liveTP + liveFP) : null;
  const liveRecall    = (liveTP + liveFN) > 0 ? liveTP / (liveTP + liveFN) : null;
  const liveF1        = (livePrecision !== null && liveRecall !== null && (livePrecision + liveRecall) > 0)
    ? 2 * livePrecision * liveRecall / (livePrecision + liveRecall) : null;
  const liveFPCost    = liveFP * 350.0;

  const isLive = viewMode === 'live';
  const P = isLive ? livePrecision  : m.precision;
  const R = isLive ? liveRecall     : m.recall;
  const F = isLive ? liveF1         : m.f1_score;
  const C = isLive ? liveFPCost      : m.false_positive_cost_inr;

  const fmt = v => v === null || v === undefined ? 'N/A' : `${(v * 100).toFixed(1)}%`;

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--rule)',
        borderTop: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Panel header + view toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'stretch',
          height: '28px',
          borderBottom: '1px solid var(--rule)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRight: '1px solid var(--rule)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          EVALUATION
        </div>

        {/* View toggle tabs */}
        <div style={{ display: 'flex', alignItems: 'stretch' }} role="tablist" aria-label="Metrics view mode">
          {[
            { key: 'held_out', label: `HELD-OUT  3H`, color: 'var(--green)' },
            { key: 'live',     label: `LIVE  ${liveTotal}T`, color: 'var(--amber)' },
          ].map(tab => {
            const active = viewMode === tab.key;
            return (
              <button
                key={tab.key}
                role="tab"
                aria-selected={active}
                onClick={() => setViewMode(tab.key)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  borderRight: '1px solid var(--rule)',
                  background: active ? 'var(--bg-row-active)' : 'transparent',
                  color: active ? tab.color : 'var(--text-dim)',
                  fontSize: 10,
                  letterSpacing: '0.08em',
                  fontWeight: active ? 600 : 400,
                  borderBottom: active ? `2px solid ${tab.color}` : '2px solid transparent',
                  transition: 'all 0.1s',
                  gap: 6,
                }}
                onMouseEnter={e => { if (!active) { e.currentTarget.style.color = 'var(--text-primary)'; } }}
                onMouseLeave={e => { if (!active) { e.currentTarget.style.color = 'var(--text-dim)'; } }}
              >
                {tab.key === 'live' && <span style={{ fontSize: 7, color: 'var(--amber)' }}>●</span>}
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Core metric cells — horizontal bar */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--rule)', flexShrink: 0 }}>
        <MetricCell label="Precision"   value={fmt(P)} sub="TP / (TP + FP)"    color="var(--amber)" />
        <MetricCell label="Recall"      value={fmt(R)} sub="TP / (TP + FN)"    color="var(--green)" />
        <MetricCell label="F1 Score"    value={fmt(F)} sub="Harmonic P & R"    color="var(--cyan)" />
        <div
          style={{
            padding: '10px 12px',
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--red)', marginBottom: 4 }}>
            FP FRICTION COST
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.03em', lineHeight: 1 }}>
            ₹{C?.toLocaleString() || '0'}
          </div>
          <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 8, letterSpacing: '0.02em' }}>
            BLOCKED LEGIT TXN × AVG ORDER
          </div>
        </div>
      </div>

      {/* ML metadata row */}
      {viewMode === 'held_out' && (
        <div
          style={{
            display: 'flex',
            padding: '8px 0',
            flexShrink: 0,
          }}
        >
          {optThreshold && (
            <div style={{ padding: '0 12px', borderRight: '1px solid var(--rule)', flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 3 }}>
                ROC-OPTIMAL THRESHOLD
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cyan)', letterSpacing: '-0.01em' }}>
                {optThreshold.optimal_threshold}
                <span style={{ fontSize: 10, fontWeight: 400, color: 'var(--text-secondary)', marginLeft: 8 }}>
                  F1 {(optThreshold.optimal_f1 * 100).toFixed(1)}%
                </span>
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>DATA-DRIVEN ALERT CUTOFF</div>
            </div>
          )}
          {detDelay !== null && detDelay !== undefined && (
            <div style={{ padding: '0 12px', flex: 1 }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 3 }}>
                DETECTION DELAY
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--amber)', letterSpacing: '-0.01em' }}>
                {detDelay}s
              </div>
              <div style={{ fontSize: 9, color: 'var(--text-dim)', marginTop: 2 }}>SPIKE START → FIRST ALERT</div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
