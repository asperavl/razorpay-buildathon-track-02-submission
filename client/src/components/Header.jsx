import React from 'react';

export function Header({ isConnected, activeSpike, onOpenUpload, onExportReport }) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-IN', { hour12: false });

  return (
    <header
      style={{
        borderBottom: '1px solid var(--rule)',
        background: 'var(--bg-panel)',
        display: 'flex',
        alignItems: 'stretch',
        height: '36px',
        overflow: 'hidden',
      }}
      role="banner"
    >
      {/* Masthead */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderRight: '1px solid var(--rule)',
          background: 'var(--amber)',
          flexShrink: 0,
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 700,
            fontSize: 13,
            letterSpacing: '0.12em',
            color: '#000',
            textTransform: 'uppercase',
          }}
        >
          FRAUDPULSE
        </span>
      </div>

      {/* Track label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderRight: '1px solid var(--rule)',
          color: 'var(--text-secondary)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        AI RISK MANAGER · TRACK 02
      </div>

      {/* Active spike alert */}
      {activeSpike && (
        <div
          className="red-pulse"
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            borderRight: '1px solid var(--rule)',
            background: 'var(--red-dim)',
            color: 'var(--red)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            gap: 6,
            flexShrink: 0,
          }}
          role="status"
          aria-live="assertive"
        >
          <span className="blink">▶</span>
          SPIKE: {activeSpike.replace(/_/g, ' ').toUpperCase()}
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Action buttons */}
      <button
        onClick={onOpenUpload}
        aria-label="Upload transaction dataset for batch analysis"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderLeft: '1px solid var(--rule)',
          color: 'var(--text-secondary)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          gap: 6,
          transition: 'color 0.1s, background 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--amber)'; e.currentTarget.style.background = 'var(--amber-dim)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
      >
        ↑ UPLOAD
      </button>

      <button
        onClick={onExportReport}
        aria-label="Export compliance audit report as JSON"
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderLeft: '1px solid var(--rule)',
          color: 'var(--text-secondary)',
          fontSize: 10,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          gap: 6,
          transition: 'color 0.1s, background 0.1s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--green)'; e.currentTarget.style.background = 'var(--green-dim)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; }}
      >
        ↓ EXPORT
      </button>

      {/* Live status */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderLeft: '1px solid var(--rule)',
          gap: 6,
          fontSize: 10,
          letterSpacing: '0.06em',
          color: isConnected ? 'var(--green)' : 'var(--red)',
          flexShrink: 0,
        }}
        role="status"
        aria-label={isConnected ? 'Live stream connected' : 'Stream disconnected'}
      >
        <span style={{ fontSize: 8 }}>{isConnected ? '●' : '○'}</span>
        {isConnected ? 'LIVE' : 'OFFLINE'}
      </div>

      {/* Clock */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderLeft: '1px solid var(--rule)',
          color: 'var(--text-secondary)',
          fontSize: 10,
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.04em',
          flexShrink: 0,
        }}
        aria-label="Current time"
      >
        {timeStr}
      </div>
    </header>
  );
}
