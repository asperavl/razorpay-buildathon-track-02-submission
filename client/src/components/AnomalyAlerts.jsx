import React from 'react';

export function AnomalyAlerts({ alerts }) {
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--rule)',
        borderLeft: 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Panel header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          height: '28px',
          borderBottom: '1px solid var(--rule)',
          padding: '0 12px',
          flexShrink: 0,
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: alerts.length > 0 ? 'var(--red)' : 'var(--text-secondary)',
          }}
        >
          ALERT LOG
        </span>
        <div style={{ flex: 1 }} />
        <span
          style={{
            fontSize: 10,
            color: alerts.length > 0 ? 'var(--red)' : 'var(--text-dim)',
            letterSpacing: '0.04em',
          }}
          aria-live="polite"
        >
          {alerts.length} FLAGGED
        </span>
      </div>

      {/* Column headers */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '68px 1fr 56px',
          padding: '0 12px',
          height: '22px',
          alignItems: 'center',
          borderBottom: '1px solid var(--rule)',
          background: 'var(--bg-base)',
          flexShrink: 0,
          gap: 8,
        }}
      >
        {['TIME', 'EVENT', 'CONF'].map(h => (
          <span
            key={h}
            style={{
              fontSize: 9,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-dim)',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {/* Feed */}
      <div
        style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}
        role="log"
        aria-label="Anomaly alerts"
        aria-live="polite"
      >
        {alerts.length > 0 ? (
          alerts.map((alert, i) => (
            <div
              key={alert.id}
              className={i === 0 ? 'alert-drop' : ''}
              style={{
                display: 'grid',
                gridTemplateColumns: '68px 1fr 56px',
                padding: '6px 12px',
                borderBottom: '1px solid var(--rule)',
                background: i === 0 ? 'var(--red-dim)' : 'transparent',
                alignItems: 'start',
                gap: 8,
                transition: 'background 0.3s',
              }}
            >
              {/* Timestamp */}
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--text-dim)',
                  fontVariantNumeric: 'tabular-nums',
                  paddingTop: 1,
                }}
              >
                {alert.timestamp}
              </span>

              {/* Event detail */}
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--red-bright)',
                    letterSpacing: '0.02em',
                    marginBottom: 2,
                  }}
                >
                  {alert.spikeType.replace(/_/g, ' ').toUpperCase()}
                </div>
                {alert.triggers?.slice(0, 2).map((t, idx) => (
                  <div
                    key={idx}
                    style={{
                      fontSize: 10,
                      color: 'var(--text-secondary)',
                      lineHeight: 1.4,
                    }}
                  >
                    › {t.description}
                  </div>
                ))}
              </div>

              {/* Confidence */}
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: 'var(--red)',
                  textAlign: 'right',
                  fontVariantNumeric: 'tabular-nums',
                  paddingTop: 1,
                }}
              >
                {(alert.anomalyScore * 100).toFixed(0)}%
              </span>
            </div>
          ))
        ) : (
          /* Idle state */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 8,
              color: 'var(--text-dim)',
            }}
          >
            <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              MONITORING<span className="blink">_</span>
            </div>
            <div
              style={{
                fontSize: 10,
                color: 'var(--green)',
                letterSpacing: '0.06em',
              }}
            >
              ● BASELINE NORMAL
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
