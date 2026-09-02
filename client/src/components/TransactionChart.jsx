import React from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';

const TerminalTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--amber)',
        padding: '6px 10px',
        fontFamily: 'inherit',
        fontSize: 11,
        lineHeight: 1.6,
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: 4 }}>{label}</div>
      <div style={{ color: 'var(--text-primary)' }}>
        TXN COUNT  <span style={{ color: 'var(--amber)', fontWeight: 600 }}>{d.count}</span>
      </div>
      <div style={{ color: 'var(--text-primary)' }}>
        VOLUME     <span style={{ color: 'var(--amber)', fontWeight: 600 }}>₹{d.amount?.toLocaleString()}</span>
      </div>
      <div
        style={{
          borderTop: '1px solid var(--rule)',
          marginTop: 4,
          paddingTop: 4,
          color: d.isAnomaly ? 'var(--red)' : 'var(--green)',
        }}
      >
        SCORE      <span style={{ fontWeight: 600 }}>{(d.score * 100).toFixed(1)}%</span>
        {d.isAnomaly && <span style={{ marginLeft: 8, color: 'var(--red-bright)' }}>◀ ANOMALY</span>}
      </div>
    </div>
  );
};

export function TransactionChart({ dataPoints, latestFrame, optimalThreshold }) {
  const isAnomaly = latestFrame?.is_anomaly;
  const threshold = optimalThreshold?.optimal_threshold ?? 0.65;

  return (
    <div
      style={{
        background: 'var(--bg-panel)',
        border: '1px solid var(--rule)',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
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
          gap: 16,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: isAnomaly ? 'var(--red)' : 'var(--amber)',
          }}
        >
          {isAnomaly ? '▶ ANOMALY DETECTED' : '● TXN STREAM'}
        </span>
        <span style={{ color: 'var(--rule-bright)', fontSize: 10 }}>│</span>
        <span style={{ color: 'var(--text-secondary)', fontSize: 10 }}>
          VELOCITY · ANOMALY SCORE
        </span>
        <div style={{ flex: 1 }} />
        {/* Legend */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 10, color: 'var(--text-dim)' }}>
          <span style={{ color: 'var(--amber)' }}>━</span> TXN/MIN
          <span style={{ color: 'var(--red)', opacity: 0.7 }}>╌</span> SCORE THRESHOLD {(threshold * 100).toFixed(0)}%
        </div>
      </div>

      {/* Chart */}
      <div style={{ flex: 1, minHeight: 0, padding: '8px 4px 4px 0' }}>
        {dataPoints.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dataPoints} margin={{ top: 8, right: 12, left: -24, bottom: 0 }}>
              <defs>
                <linearGradient id="fillAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f5a623" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#f5a623" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="fillRed" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f04444" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#f04444" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="1 4"
                stroke="var(--rule)"
                vertical={false}
              />
              <XAxis
                dataKey="time"
                tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                axisLine={{ stroke: 'var(--rule)' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                tick={{ fill: 'var(--text-dim)', fontSize: 10, fontFamily: 'IBM Plex Mono' }}
                axisLine={{ stroke: 'var(--rule)' }}
                tickLine={false}
              />
              <YAxis yAxisId="right" orientation="right" domain={[0, 1]} hide />
              <Tooltip content={<TerminalTooltip />} />
              <ReferenceLine
                yAxisId="right"
                y={threshold}
                stroke="var(--red)"
                strokeDasharray="3 3"
                strokeWidth={1}
                strokeOpacity={0.6}
              />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="count"
                stroke="var(--amber)"
                strokeWidth={1.5}
                fill="url(#fillAmber)"
                isAnimationActive={false}
                dot={false}
              />
              <Area
                yAxisId="right"
                type="monotone"
                dataKey="score"
                stroke="var(--red)"
                strokeWidth={1}
                strokeOpacity={0.7}
                fill="url(#fillRed)"
                isAnimationActive={false}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-dim)',
              fontSize: 11,
              letterSpacing: '0.06em',
            }}
          >
            CONNECTING TO STREAM<span className="blink">_</span>
          </div>
        )}
      </div>
    </div>
  );
}
