import React, { useState } from 'react';
import { useTransactionStream } from './hooks/useTransactionStream';
import { Header } from './components/Header';
import { DemoControls } from './components/DemoControls';
import { TransactionChart } from './components/TransactionChart';
import { AnomalyAlerts } from './components/AnomalyAlerts';
import { MetricsPanel } from './components/MetricsPanel';
import { ConfusionMatrix } from './components/ConfusionMatrix';
import { CSVUploader } from './components/CSVUploader';

export function App() {
  const {
    dataPoints,
    latestFrame,
    alerts,
    isConnected,
    metrics,
    liveMatrix,
    activeSpike,
    injectSpike,
    resetLiveMatrix,
    uploadCSV,
    exportReport,
  } = useTransactionStream();

  const [viewMode, setViewMode]     = useState('held_out');
  const [isUploadOpen, setUploadOpen] = useState(false);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
      }}
    >
      {/* ── Header strip ─────────────────────────────────────── */}
      <Header
        isConnected={isConnected}
        activeSpike={activeSpike}
        onOpenUpload={() => setUploadOpen(true)}
        onExportReport={exportReport}
      />

      {/* ── Demo controls strip ───────────────────────────────── */}
      <DemoControls onInjectSpike={injectSpike} activeSpike={activeSpike} />

      {/* ── Main body ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Row 1: Chart (60%) + Alerts (40%) ──────────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            flex: '1 1 340px',
            minHeight: 320,
          }}
        >
          <TransactionChart
            dataPoints={dataPoints}
            latestFrame={latestFrame}
            optimalThreshold={metrics?.optimal_threshold}
          />
          <AnomalyAlerts alerts={alerts} />
        </div>

        {/* ── Row 2: Metrics (60%) + Confusion (40%) ─────────── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '3fr 2fr',
            flex: '0 0 auto',
          }}
        >
          <MetricsPanel
            metricsData={metrics}
            liveMatrix={liveMatrix}
            viewMode={viewMode}
            setViewMode={setViewMode}
          />
          <ConfusionMatrix
            metricsData={metrics}
            liveMatrix={liveMatrix}
            viewMode={viewMode}
            onResetLive={resetLiveMatrix}
          />
        </div>

        {/* ── Footer status bar ────────────────────────────────── */}
        <div
          style={{
            borderTop: '1px solid var(--rule)',
            background: 'var(--bg-panel)',
            display: 'flex',
            alignItems: 'center',
            height: '24px',
            padding: '0 12px',
            gap: 16,
            fontSize: 10,
            color: 'var(--text-dim)',
            letterSpacing: '0.04em',
            flexShrink: 0,
          }}
          role="contentinfo"
        >
          <span style={{ color: 'var(--amber)', fontWeight: 600 }}>FRAUDPULSE</span>
          <span style={{ color: 'var(--rule-bright)' }}>│</span>
          <span>IF + LOF ENSEMBLE</span>
          <span style={{ color: 'var(--rule-bright)' }}>│</span>
          <span>EWMA DRIFT ADAPTATION</span>
          <span style={{ color: 'var(--rule-bright)' }}>│</span>
          <span>VELOCITY SENTINEL</span>
          <div style={{ flex: 1 }} />
          <span>RAZORPAY BUILDATHON 2026</span>
          <span style={{ color: 'var(--rule-bright)' }}>│</span>
          <span style={{ color: 'var(--green)' }}>DEFENSE-ONLY</span>
        </div>
      </div>

      {/* ── CSV Modal ─────────────────────────────────────────── */}
      <CSVUploader
        isOpen={isUploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploadCSV={uploadCSV}
      />
    </div>
  );
}

export default App;
