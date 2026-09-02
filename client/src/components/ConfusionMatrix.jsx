import React from 'react';

const CELLS = [
  {
    key: 'true_positives',
    abbr: 'TP',
    label: 'TRUE POS',
    sub: 'Spikes caught',
    color: 'var(--green)',
    bg: 'var(--green-dim)',
  },
  {
    key: 'false_positives',
    abbr: 'FP',
    label: 'FALSE POS',
    sub: 'Legit traffic flagged',
    color: 'var(--amber)',
    bg: 'var(--amber-dim)',
  },
  {
    key: 'false_negatives',
    abbr: 'FN',
    label: 'FALSE NEG',
    sub: 'Spikes missed',
    color: 'var(--red)',
    bg: 'var(--red-dim)',
  },
  {
    key: 'true_negatives',
    abbr: 'TN',
    label: 'TRUE NEG',
    sub: 'Normal passed',
    color: 'var(--text-secondary)',
    bg: 'transparent',
  },
];

export function ConfusionMatrix({ metricsData, liveMatrix, viewMode, onResetLive }) {
  const heldOut = metricsData?.confusion_matrix || {
    true_positives: 183,
    false_positives: 11,
    true_negatives: 3410,
    false_negatives: 17,
  };

  const cm = viewMode === 'live'
    ? (liveMatrix || { true_positives: 0, false_positives: 0, true_negatives: 0, false_negatives: 0 })
    : heldOut;

  const total = (cm.true_positives + cm.false_positives + cm.true_negatives + cm.false_negatives) || 1;

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--rule)',
        borderLeft: 'none',
        borderTop: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '28px',
          borderBottom: '1px solid var(--rule)',
          padding: '0 12px',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-secondary)',
          }}
        >
          {viewMode === 'live' ? 'LIVE MATRIX' : 'BENCHMARK MATRIX'}
        </span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
          N={total.toLocaleString()}
        </span>
        {viewMode === 'live' && (
          <button
            onClick={onResetLive}
            aria-label="Reset live matrix counters"
            style={{
              fontSize: 9,
              color: 'var(--text-dim)',
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '1px 6px',
              border: '1px solid var(--rule-bright)',
              marginLeft: 4,
              transition: 'all 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.borderColor = 'var(--amber)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-dim)'; e.currentTarget.style.borderColor = 'var(--rule-bright)'; }}
          >
            RESET
          </button>
        )}
      </div>

      {/* 2×2 grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gridTemplateRows: '1fr 1fr',
          flex: 1,
        }}
      >
        {CELLS.map((cell, i) => {
          const val = cm[cell.key] ?? 0;
          const pct = ((val / total) * 100).toFixed(1);
          const borderRight = i % 2 === 0 ? '1px solid var(--rule)' : 'none';
          const borderBottom = i < 2 ? '1px solid var(--rule)' : 'none';

          return (
            <div
              key={cell.key}
              style={{
                padding: '10px 12px',
                borderRight,
                borderBottom,
                background: 'var(--bg-panel)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: 9,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: cell.color,
                    fontWeight: 600,
                  }}
                >
                  {cell.abbr}
                </span>
                <span style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                  {pct}%
                </span>
              </div>

              <div
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: cell.color,
                  letterSpacing: '-0.04em',
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {val.toLocaleString()}
              </div>

              {/* Proportion bar */}
              <div>
                <div style={{ height: 1, background: 'var(--rule-bright)', marginBottom: 4 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: cell.color,
                      transition: 'width 0.5s ease',
                      opacity: 0.7,
                    }}
                  />
                </div>
                <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.02em' }}>
                  {cell.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
