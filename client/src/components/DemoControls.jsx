import React, { useState } from 'react';

const SPIKE_TYPES = [
  { key: 'volume_spike',   label: 'VOL SURGE',    sub: '10×',        color: 'var(--amber)', dim: 'var(--amber-dim)', border: 'var(--amber)' },
  { key: 'velocity_spike', label: 'CARD VELOCITY', sub: 'RING',       color: 'var(--cyan)',  dim: 'var(--cyan-dim)',  border: 'var(--cyan)' },
  { key: 'amount_spike',   label: 'HIGH VALUE',   sub: 'ANOMALY',    color: 'var(--red)',   dim: 'var(--red-dim)',   border: 'var(--red)' },
];

export function DemoControls({ onInjectSpike, activeSpike }) {
  const [selectedKey, setSelectedKey] = useState('volume_spike');
  const [loading, setLoading] = useState(false);

  const selected = SPIKE_TYPES.find(t => t.key === selectedKey);
  const isActive = !!activeSpike;

  const handleInject = async () => {
    setLoading(true);
    await onInjectSpike(selectedKey, 15);
    setLoading(false);
  };

  return (
    <div
      style={{
        borderBottom: '1px solid var(--rule)',
        background: 'var(--bg-panel)',
        display: 'flex',
        alignItems: 'stretch',
        height: '32px',
        overflow: 'hidden',
      }}
      role="toolbar"
      aria-label="Attack simulator controls"
    >
      {/* Label */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          borderRight: '1px solid var(--rule)',
          color: 'var(--text-dim)',
          fontSize: 10,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          flexShrink: 0,
        }}
      >
        INJECT
      </div>

      {/* Spike type selectors */}
      <div
        style={{ display: 'flex', alignItems: 'stretch' }}
        role="radiogroup"
        aria-label="Spike type"
      >
        {SPIKE_TYPES.map(t => {
          const active = selectedKey === t.key;
          return (
            <button
              key={t.key}
              role="radio"
              aria-checked={active}
              disabled={isActive}
              onClick={() => setSelectedKey(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '0 14px',
                borderRight: '1px solid var(--rule)',
                background: active ? t.dim : 'transparent',
                color: active ? t.color : 'var(--text-secondary)',
                fontSize: 10,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.1s',
                borderBottom: active ? `2px solid ${t.color}` : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!isActive && !active) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.background = 'var(--bg-row)'; } }}
              onMouseLeave={e => { if (!isActive && !active) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.background = 'transparent'; } }}
            >
              {t.label}
              <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>{t.sub}</span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Execute button */}
      <button
        onClick={handleInject}
        disabled={loading || isActive}
        aria-label={isActive ? 'Fraud spike active' : `Inject ${selected.label} spike`}
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          borderLeft: '1px solid var(--rule)',
          background: isActive ? 'var(--red-dim)' : 'var(--amber-dim)',
          color: isActive ? 'var(--red)' : 'var(--amber)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          gap: 8,
          transition: 'all 0.1s',
          flexShrink: 0,
        }}
        onMouseEnter={e => { if (!isActive && !loading) { e.currentTarget.style.background = 'var(--amber)'; e.currentTarget.style.color = '#000'; } }}
        onMouseLeave={e => { if (!isActive && !loading) { e.currentTarget.style.background = 'var(--amber-dim)'; e.currentTarget.style.color = 'var(--amber)'; } }}
      >
        {isActive ? (
          <><span className="blink">▶</span> SPIKE ACTIVE</>
        ) : (
          <>▶ EXECUTE</>
        )}
      </button>
    </div>
  );
}
