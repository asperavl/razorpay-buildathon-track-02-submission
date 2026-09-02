import React, { useState } from 'react';

export function CSVUploader({ onUploadCSV, isOpen, onClose }) {
  const [file, setFile] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0];
    if (selected) { setFile(selected); setError(null); }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const selected = e.dataTransfer.files?.[0];
    if (selected?.name.endsWith('.csv')) { setFile(selected); setError(null); }
    else setError('INVALID FILE TYPE — .csv required');
  };

  const handleSubmit = async () => {
    if (!file) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await onUploadCSV(file);
      setResult(res);
    } catch (err) {
      setError(err.message || 'ANALYSIS FAILED — check server connection');
    } finally {
      setIsLoading(false);
    }
  };

  const btn = (label, onClick, disabled, accent) => (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '6px 16px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        border: `1px solid ${accent || 'var(--rule-bright)'}`,
        color: accent ? '#000' : 'var(--text-secondary)',
        background: accent || 'transparent',
        fontFamily: 'inherit',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.1s',
      }}
      onMouseEnter={e => { if (!disabled && !accent) { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.borderColor = 'var(--text-dim)'; } }}
      onMouseLeave={e => { if (!disabled && !accent) { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--rule-bright)'; } }}
    >
      {label}
    </button>
  );

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--amber)',
          width: '100%',
          maxWidth: 560,
          maxHeight: '90vh',
          overflowY: 'auto',
          fontFamily: "'IBM Plex Mono', monospace",
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Upload transaction dataset"
      >
        {/* Title bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            height: 32,
            padding: '0 12px',
            borderBottom: '1px solid var(--rule)',
            background: 'var(--amber)',
            gap: 8,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: '#000', textTransform: 'uppercase' }}>
            UPLOAD DATASET
          </span>
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            aria-label="Close dialog"
            style={{
              fontFamily: 'inherit',
              fontSize: 12,
              color: '#000',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 4px',
              opacity: 0.6,
              fontWeight: 700,
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!result ? (
            <>
              {/* Drop zone */}
              <div
                onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => document.getElementById('csv-file-input')?.click()}
                style={{
                  border: `1px dashed ${isDragOver ? 'var(--amber)' : file ? 'var(--green)' : 'var(--rule-bright)'}`,
                  background: isDragOver ? 'var(--amber-dim)' : file ? 'var(--green-dim)' : 'var(--bg-base)',
                  padding: '28px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  marginBottom: 12,
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 24, marginBottom: 8, color: file ? 'var(--green)' : 'var(--text-dim)' }}>
                  {file ? '✓' : '↑'}
                </div>
                <div style={{ fontSize: 11, color: file ? 'var(--green)' : 'var(--text-primary)', fontWeight: 600, marginBottom: 4 }}>
                  {file ? file.name : 'DROP .CSV FILE HERE OR CLICK TO BROWSE'}
                </div>
                <div style={{ fontSize: 10, color: 'var(--text-dim)' }}>
                  REQUIRED COLUMNS: timestamp · amount · card_hash / account_id
                </div>
                <input id="csv-file-input" type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFileChange} />
              </div>

              {/* Error */}
              {error && (
                <div style={{
                  padding: '8px 12px',
                  marginBottom: 12,
                  border: '1px solid var(--red)',
                  background: 'var(--red-dim)',
                  color: 'var(--red)',
                  fontSize: 10,
                  letterSpacing: '0.04em',
                }}>
                  ▶ {error}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                {btn('Cancel', onClose, false, null)}
                {btn(isLoading ? 'ANALYZING…' : 'ANALYZE', handleSubmit, !file || isLoading, file && !isLoading ? 'var(--amber)' : null)}
              </div>
            </>
          ) : (
            <>
              {/* Result header */}
              <div style={{
                padding: '8px 12px',
                marginBottom: 16,
                border: '1px solid var(--green)',
                background: 'var(--green-dim)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--green)', letterSpacing: '0.08em' }}>
                    ● ANALYSIS COMPLETE
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{result.filename}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--red)', letterSpacing: '-0.02em' }}>
                    {result.anomalies_detected}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.04em' }}>
                    ANOMALIES ({result.anomaly_rate_pct}%)
                  </div>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', borderTop: '1px solid var(--rule)', borderLeft: '1px solid var(--rule)', marginBottom: 16 }}>
                {[
                  { label: 'TRANSACTIONS', value: result.total_transactions, color: 'var(--amber)' },
                  { label: 'WINDOWS', value: result.total_windows, color: 'var(--cyan)' },
                  { label: 'VOLUME', value: `₹${result.total_volume_inr?.toLocaleString()}`, color: 'var(--green)' },
                ].map(s => (
                  <div key={s.label} style={{ padding: '10px 12px', borderRight: '1px solid var(--rule)', borderBottom: '1px solid var(--rule)' }}>
                    <div style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em', marginBottom: 4 }}>{s.label}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: s.color, letterSpacing: '-0.02em' }}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Window list */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 9, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-dim)', marginBottom: 8 }}>
                  WINDOW PREVIEW (TOP 10)
                </div>
                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--rule)' }}>
                  {/* Column headers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '40px 1fr 1fr 60px', padding: '4px 10px', background: 'var(--bg-base)', borderBottom: '1px solid var(--rule)', gap: 8 }}>
                    {['WIN', 'TXN', 'VOLUME', 'SCORE'].map(h => (
                      <span key={h} style={{ fontSize: 9, color: 'var(--text-dim)', letterSpacing: '0.08em' }}>{h}</span>
                    ))}
                  </div>
                  {result.analyzed_windows?.slice(0, 10).map((win, i) => (
                    <div
                      key={i}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '40px 1fr 1fr 60px',
                        padding: '5px 10px',
                        borderBottom: '1px solid var(--rule)',
                        background: win.is_anomaly ? 'var(--red-dim)' : 'transparent',
                        gap: 8,
                        fontSize: 10,
                      }}
                    >
                      <span style={{ color: 'var(--text-dim)', fontVariantNumeric: 'tabular-nums' }}>#{win.window_index}</span>
                      <span style={{ color: 'var(--text-primary)' }}>{win.txn_count}</span>
                      <span style={{ color: 'var(--text-primary)' }}>₹{win.total_amount?.toLocaleString()}</span>
                      <span style={{ color: win.is_anomaly ? 'var(--red)' : 'var(--text-secondary)', fontWeight: win.is_anomaly ? 700 : 400, textAlign: 'right' }}>
                        {(win.anomaly_score * 100).toFixed(0)}%{win.is_anomaly ? ' ◀' : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, paddingTop: 4, borderTop: '1px solid var(--rule)' }}>
                {btn('UPLOAD ANOTHER', () => setResult(null), false, null)}
                {btn('DONE', onClose, false, 'var(--amber)')}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
