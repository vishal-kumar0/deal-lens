import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine } from 'recharts';
import { fmt, fmtCurrency } from '../modules/insightEngine';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="item" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? (p.name.includes('£') || p.name.includes('EBITDA') ? fmtCurrency(p.value) : `${fmt(p.value)}%`) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function EfficiencyTab({ data, metricsData, ltm, bridge, benchmark }) {
  const chartData = data.map((d) => ({
    name: d.dateLabel,
    'Gross Margin %': parseFloat((d.grossMargin ?? 0).toFixed(1)),
    'EBITDA Margin %': parseFloat((d.ebitdaMargin ?? 0).toFixed(1)),
    'OpEx % Revenue': parseFloat((d.opexPctRevenue ?? 0).toFixed(1)),
  }));

  // Operating leverage signal
  let opLeverage = null;
  if (ltm?.revenueGrowth !== null && ltm?.ebitdaMarginDelta !== null) {
    if (ltm.revenueGrowth > 0 && ltm.ebitdaMarginDelta > 0) {
      opLeverage = { color: 'green', text: 'Operating leverage is building — revenue is growing while EBITDA margin expands' };
    } else if (ltm.revenueGrowth > 0 && ltm.ebitdaMarginDelta < -2) {
      opLeverage = { color: 'red', text: 'No operating leverage — OpEx is growing faster than revenue, compressing EBITDA' };
    } else {
      opLeverage = { color: 'amber', text: 'Limited operating leverage — cost structure is scaling roughly in-line with revenue' };
    }
  }

  return (
    <div>
      {/* Gross Margin with benchmark */}
      <div className="chart-section">
        <div className="chart-panel">
          <div className="chart-title">Gross Margin % Over Time</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis domain={['auto', 'auto']} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine
                y={benchmark.grossMargin.median}
                stroke="var(--amber)"
                strokeDasharray="6 4"
                label={{ value: `${benchmark.label} median: ${benchmark.grossMargin.median}%`, position: 'right', fill: 'var(--amber)', fontSize: 10 }}
              />
              <Line dataKey="Gross Margin %" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-panel">
          <div className="insight-title">Efficiency Insights</div>
          <div className="insight-item">
            <div>
              <div className="insight-label">LTM Gross Margin</div>
              <div className="insight-value" style={{
                color: ltm?.ltmGrossMargin >= benchmark.grossMargin.green ? 'var(--green)' :
                  ltm?.ltmGrossMargin >= benchmark.grossMargin.amber ? 'var(--amber)' : 'var(--red)',
              }}>
                {ltm ? `${fmt(ltm.ltmGrossMargin)}%` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">vs. Industry Benchmark</div>
              <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5, marginTop: 2 }}>
                {ltm ? (
                  ltm.ltmGrossMargin >= benchmark.grossMargin.median
                    ? `${fmt(ltm.ltmGrossMargin - benchmark.grossMargin.median)}pp above ${benchmark.label} median`
                    : `${fmt(Math.abs(ltm.ltmGrossMargin - benchmark.grossMargin.median))}pp below ${benchmark.label} median`
                ) : 'N/A'}
              </div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">Margin Trend (LTM)</div>
              <div className="insight-value" style={{
                color: ltm?.gmDelta >= 0 ? 'var(--green)' : ltm?.gmDelta >= benchmark.gmDelta.amber ? 'var(--amber)' : 'var(--red)',
              }}>
                {ltm?.gmDelta !== null ? `${ltm.gmDelta >= 0 ? '+' : ''}${fmt(ltm.gmDelta)}pp` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">EBITDA Margin</div>
              <div className="insight-value">
                {ltm ? `${fmt(ltm.ltmEBITDAMargin)}%` : 'N/A'}
                {ltm?.ebitdaMarginDelta !== null && (
                  <span style={{ fontSize: 12, marginLeft: 8, color: ltm.ebitdaMarginDelta >= 0 ? 'var(--green)' : 'var(--red)' }}>
                    ({ltm.ebitdaMarginDelta >= 0 ? '+' : ''}{fmt(ltm.ebitdaMarginDelta)}pp)
                  </span>
                )}
              </div>
            </div>
          </div>
          {opLeverage && (
            <div className="insight-item">
              <div>
                <div className="insight-label">Operating Leverage</div>
                <div style={{ fontSize: 13, color: `var(--${opLeverage.color})`, lineHeight: 1.5, marginTop: 4 }}>
                  {opLeverage.text}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* EBITDA Margin chart */}
      <div className="chart-panel" style={{ marginTop: 20 }}>
        <div className="chart-title">EBITDA Margin % Over Time</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine
              y={benchmark.ebitdaMargin.median}
              stroke="var(--amber)"
              strokeDasharray="6 4"
            />
            <Line dataKey="EBITDA Margin %" stroke="var(--chart-3)" strokeWidth={2.5} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* OpEx % of Revenue */}
      <div className="chart-panel" style={{ marginTop: 20 }}>
        <div className="chart-title">Operating Costs as % of Revenue</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
            <Tooltip content={<CustomTooltip />} />
            <Area dataKey="OpEx % Revenue" stroke="var(--chart-4)" fill="var(--chart-4)" fillOpacity={0.15} strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* EBITDA Bridge */}
      {bridge && (
        <div className="chart-panel" style={{ marginTop: 20 }}>
          <div className="chart-title">EBITDA Bridge: Prior LTM → Current LTM</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bridge.items}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {bridge.items.map((entry, i) => (
                  <rect key={i} fill={entry.isTotal ? 'var(--chart-1)' : entry.value >= 0 ? 'var(--green)' : 'var(--red)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
