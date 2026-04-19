import { BarChart, Bar, Cell, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, ReferenceLine } from 'recharts';
import { computeCAGR, detectGrowthTrend } from '../modules/metricCalculator';
import { fmt, fmtCurrency } from '../modules/insightEngine';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="item" style={{ color: p.color }}>
          {p.name}: {p.name.includes('%') || p.name.includes('Growth') ? `${fmt(p.value)}%` : fmtCurrency(p.value)}
        </div>
      ))}
    </div>
  );
};

export default function GrowthTab({ data, metricsData, ltm, bridge, benchmark }) {
  const cagr = computeCAGR(metricsData);
  const trend = detectGrowthTrend(metricsData);

  const chartData = data.map((d) => ({
    name: d.dateLabel,
    Revenue: Math.round(d.revenue),
    'Growth %': d.revenueMoM !== null && d.revenueMoM !== undefined ? parseFloat(d.revenueMoM?.toFixed?.(1) ?? d.revenueMoM) : null,
  }));

  // Growth driver: volume vs price
  const volumeContrib = ltm?.customerGrowth ?? 0;
  const priceContrib = ltm?.arpuChange ?? 0;

  return (
    <div>
      <div className="chart-section">
        <div className="chart-panel">
          <div className="chart-title">Revenue Over Time</div>
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar yAxisId="left" dataKey="Revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} opacity={0.8} />
              <Line yAxisId="right" dataKey="Growth %" stroke="var(--chart-2)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-panel">
          <div className="insight-title">Growth Insights</div>
          <div className="insight-item">
            <div>
              <div className="insight-label">LTM Revenue</div>
              <div className="insight-value">{ltm ? fmtCurrency(ltm.ltmRevenue) : 'N/A'}</div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">LTM Growth Rate</div>
              <div className="insight-value" style={{ color: ltm?.revenueGrowth >= benchmark.revenueGrowth.amber ? 'var(--green)' : 'var(--amber)' }}>
                {ltm?.revenueGrowth !== null ? `${fmt(ltm.revenueGrowth)}%` : 'N/A'}
              </div>
            </div>
          </div>
          {cagr !== null && (
            <div className="insight-item">
              <div>
                <div className="insight-label">Revenue CAGR</div>
                <div className="insight-value">{fmt(cagr)}%</div>
              </div>
            </div>
          )}
          <div className="insight-item">
            <div>
              <div className="insight-label">Growth Trajectory</div>
              <div className="insight-value" style={{
                color: trend === 'accelerating' ? 'var(--green)' : trend === 'decelerating' ? 'var(--amber)' : 'var(--text-primary)',
              }}>
                {trend === 'accelerating' ? '↗ Accelerating' : trend === 'decelerating' ? '↘ Decelerating' : trend === 'stable' ? '→ Stable' : 'Insufficient data'}
              </div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">Growth Driver</div>
              <div style={{ fontSize: 13, marginTop: 4, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Volume (customers): {volumeContrib >= 0 ? '+' : ''}{fmt(volumeContrib)}%<br />
                Price (ARPU): {priceContrib >= 0 ? '+' : ''}{fmt(priceContrib)}%<br />
                <span style={{ color: volumeContrib > Math.abs(priceContrib) ? 'var(--amber)' : 'var(--green)' }}>
                  {volumeContrib > Math.abs(priceContrib) ? '→ Volume-driven growth' : '→ Price-driven growth'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* EBITDA Bridge */}
      {bridge && (
        <div className="chart-panel" style={{ marginTop: 20 }}>
          <div className="chart-title">EBITDA Movement: Prior LTM → Current LTM</div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={bridge.items} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                {bridge.items.map((entry, i) => (
                  <Cell key={i} fill={entry.isTotal ? 'var(--chart-1)' : entry.value >= 0 ? 'var(--green)' : 'var(--red)'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
