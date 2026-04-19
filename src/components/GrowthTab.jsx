import { useMemo } from 'react';
import {
  AreaChart, Area, BarChart, Bar, Cell,
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import { computeCAGR, detectGrowthTrend } from '../modules/metricCalculator';
import { fmt, fmtCurrency } from '../modules/insightEngine';

const COLORS = {
  navy: '#1E3A5F',
  green: '#2D6B4A',
  red: '#8B1C1C',
};

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        p.value !== null && p.value !== undefined && (
          <div key={i} className="tt-row">
            <span className="tt-name">{p.name}</span>
            <span className="tt-value" style={{ color: p.color }}>
              {p.name === 'Revenue' ? fmtCurrency(p.value) : `${fmt(p.value)}%`}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

const WaterfallTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const entry = payload.find((p) => p.dataKey === 'display');
  if (!entry) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      <div className="tt-row">
        <span className="tt-name">Impact</span>
        <span className="tt-value" style={{ color: entry.fill }}>
          {entry.payload.rawValue >= 0 ? '+' : ''}{fmtCurrency(entry.payload.rawValue)}
        </span>
      </div>
    </div>
  );
};

function groupByYear(metricsData) {
  const byYear = {};
  metricsData.forEach((d) => {
    const yr = d.dateLabel ? '20' + d.dateLabel.slice(-2) : null;
    if (!yr) return;
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(d);
  });
  return Object.entries(byYear).sort(([a], [b]) => a - b).map(([year, months]) => ({
    year,
    revenue: months.reduce((s, m) => s + (m.revenue || 0), 0),
  }));
}

export default function GrowthTab({ data, metricsData, ltm, bridge, benchmark }) {
  const cagr = computeCAGR(metricsData);
  const trend = detectGrowthTrend(metricsData);

  const chartData = data.map((d) => ({
    name: d.dateLabel,
    Revenue: Math.round(d.revenue),
  }));

  const annualBars = useMemo(() => groupByYear(metricsData), [metricsData]);

  const waterfallData = useMemo(() => {
    if (!bridge) return [];
    let running = 0;
    return bridge.items.map((item) => {
      if (item.isTotal) {
        return { name: item.name, base: 0, display: item.value, rawValue: item.value, isTotal: true };
      }
      const base = item.value >= 0 ? running : running + item.value;
      running += item.value;
      return { name: item.name, base, display: Math.abs(item.value), rawValue: item.value, isTotal: false };
    });
  }, [bridge]);

  const volumeContrib = ltm?.customerGrowth ?? 0;
  const priceContrib = ltm?.arpuChange ?? 0;

  const troughIdx = chartData.reduce((minI, d, i) =>
    (i === 0 || d.Revenue < chartData[minI].Revenue) ? i : minI, 0);
  const peakIdx = chartData.reduce((maxI, d, i) =>
    (i === 0 || d.Revenue > chartData[maxI].Revenue) ? i : maxI, 0);

  const chartHeadline = cagr !== null
    ? `Revenue CAGR ${fmt(cagr)}% over ${metricsData.length} months${trend === 'decelerating' ? ' — growth rate normalising' : trend === 'accelerating' ? ' — growth accelerating' : ''}`
    : 'Revenue trend';

  const trendDesc = trend === 'accelerating'
    ? "Growth rate is accelerating — each year's revenue base is compounding faster than the prior year."
    : trend === 'decelerating'
    ? 'Growth rate is decelerating — consistent with a business reaching scale. The key question is whether margins are expanding as growth moderates.'
    : 'Growth rate is stable — consistent, predictable revenue expansion.';

  const driverNote = ltm?.customerGrowth !== null && ltm?.arpuChange !== null
    ? `Current growth is ${Math.abs(volumeContrib) > Math.abs(priceContrib) ? 'primarily volume-driven' : 'primarily price-driven'}. Customer base ${volumeContrib >= 0 ? 'grew' : 'declined'} ${fmt(Math.abs(volumeContrib))}% while ARPU ${priceContrib >= 0 ? 'rose' : 'fell'} ${fmt(Math.abs(priceContrib))}% year-on-year.`
    : null;

  return (
    <div>
      {/* Revenue area chart + insight panel */}
      <div className="chart-section">
        <div className="chart-panel">
          <div className="chart-title-headline">{chartHeadline}</div>
          <div className="chart-title-sub">
            {metricsData.length} months of revenue data
            {ltm?.revenueGrowth !== null ? ` · LTM growth ${ltm.revenueGrowth >= 0 ? '+' : ''}${fmt(ltm.revenueGrowth)}%` : ''}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.12} />
                  <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: '#8A837A' }}
                tickLine={false}
                axisLine={{ stroke: '#E2DDD6' }}
                interval={5}
              />
              <YAxis
                tick={{ fontSize: 10, fill: '#8A837A' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `£${(v / 1000).toFixed(0)}K`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                dataKey="Revenue"
                stroke={COLORS.navy}
                fill="url(#revGrad)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: COLORS.navy, strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-panel">
          <div className="insight-title">Growth Analysis</div>
          <div className="narrative-insight">{trendDesc}</div>
          {driverNote && <div className="narrative-insight">{driverNote}</div>}
          <div className="metric-row">
            <span className="metric-label">LTM Revenue</span>
            <span className="metric-value">{ltm ? fmtCurrency(ltm.ltmRevenue) : '—'}</span>
          </div>
          {cagr !== null && (
            <div className="metric-row">
              <span className="metric-label">Revenue CAGR</span>
              <span className="metric-value">
                {fmt(cagr)}%
              </span>
            </div>
          )}
          <div className="metric-row">
            <span className="metric-label">LTM YoY Growth</span>
            <span className="metric-value">
              {ltm?.revenueGrowth !== null ? (
                <>
                  {ltm.revenueGrowth >= 0 ? '+' : ''}{fmt(ltm.revenueGrowth)}%
                  <span className={`metric-delta ${ltm.revenueGrowth >= benchmark.revenueGrowth.green ? 'pos' : ltm.revenueGrowth >= benchmark.revenueGrowth.amber ? 'neu' : 'neg'}`}>
                    {ltm.revenueGrowth >= benchmark.revenueGrowth.green ? '↑' : ltm.revenueGrowth >= benchmark.revenueGrowth.amber ? '~' : '↓'}
                  </span>
                </>
              ) : '—'}
            </span>
          </div>
          {ltm?.customerGrowth !== null && (
            <div className="metric-row">
              <span className="metric-label">Customer Growth</span>
              <span className="metric-value">
                {ltm.customerGrowth >= 0 ? '+' : ''}{fmt(ltm.customerGrowth)}%
              </span>
            </div>
          )}
          {ltm?.arpuChange !== null && (
            <div className="metric-row">
              <span className="metric-label">ARPU Change</span>
              <span className="metric-value">
                {ltm.arpuChange >= 0 ? '+' : ''}{fmt(ltm.arpuChange)}%
                <span className={`metric-delta ${ltm.arpuChange >= 0 ? 'pos' : 'neg'}`}>
                  {ltm.arpuChange >= 0 ? '↑' : '↓'}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Year-over-year annual revenue comparison */}
      {annualBars.length > 1 && (
        <div className="chart-panel" style={{ marginTop: 16 }}>
          <div className="chart-title-headline">Annual Revenue — Year-on-Year</div>
          <div className="chart-title-sub">Full-year totals for each calendar year in the dataset</div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={annualBars} barCategoryGap="40%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
              <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#8A837A' }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8A837A' }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${(v / 1000000).toFixed(1)}M`} width={50} />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const prev = annualBars.findIndex((r) => r.year === label);
                  const prevRev = prev > 0 ? annualBars[prev - 1].revenue : null;
                  const yoy = prevRev ? ((payload[0].value - prevRev) / prevRev) * 100 : null;
                  return (
                    <div className="custom-tooltip">
                      <div className="tt-label">{label}</div>
                      <div className="tt-row">
                        <span className="tt-name">Revenue</span>
                        <span className="tt-value">{fmtCurrency(payload[0].value)}</span>
                      </div>
                      {yoy !== null && (
                        <div className="tt-row">
                          <span className="tt-name">YoY Growth</span>
                          <span className="tt-value" style={{ color: yoy >= 0 ? COLORS.green : COLORS.red }}>
                            {yoy >= 0 ? '+' : ''}{fmt(yoy)}%
                          </span>
                        </div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="revenue" radius={[3, 3, 0, 0]} maxBarSize={80}>
                {annualBars.map((_, i) => (
                  <Cell key={i} fill={i === annualBars.length - 1 ? COLORS.navy : '#AABBD4'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* EBITDA Bridge — floating waterfall */}
      {bridge && waterfallData.length > 0 && (
        <div className="chart-panel" style={{ marginTop: 16 }}>
          <div className="chart-title-headline">EBITDA Bridge: Prior LTM → Current LTM</div>
          <div className="chart-title-sub">What drove the change in absolute EBITDA — revenue growth, margin, and cost impacts</div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: COLORS.green }} />
              Positive contribution
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: COLORS.red }} />
              Negative drag
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: COLORS.navy }} />
              Total / base
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfallData} barCategoryGap="30%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#8A837A' }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} />
              <YAxis tick={{ fontSize: 10, fill: '#8A837A' }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}K`} width={48} />
              <Tooltip content={<WaterfallTooltip />} />
              <Bar dataKey="base" stackId="wf" fill="transparent" />
              <Bar dataKey="display" stackId="wf" radius={[2, 2, 0, 0]}>
                {waterfallData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.isTotal ? COLORS.navy : entry.rawValue >= 0 ? COLORS.green : COLORS.red}
                    opacity={entry.isTotal ? 1 : 0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
