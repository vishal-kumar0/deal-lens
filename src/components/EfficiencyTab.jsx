import { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine, Legend,
} from 'recharts';
import { fmt, fmtCurrency } from '../modules/insightEngine';

const COLORS = {
  navy: '#1E3A5F',
  amber: '#C47A2C',
  green: '#2D6B4A',
  red: '#8B1C1C',
  muted: '#8A837A',
};

const MarginTooltip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="tt-row">
          <span className="tt-name">{p.name}</span>
          <span className="tt-value" style={{ color: p.color }}>{fmt(p.value)}%</span>
        </div>
      ))}
    </div>
  );
};

const WaterfallTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const entry = payload.find((p) => p.dataKey === 'display');
  if (!entry) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      <div className="tt-row">
        <span className="tt-name">EBITDA Impact</span>
        <span className="tt-value" style={{ color: entry.fill }}>
          {entry.payload.rawValue >= 0 ? '+' : ''}{fmtCurrency(entry.payload.rawValue)}
        </span>
      </div>
    </div>
  );
};

export default function EfficiencyTab({ data, metricsData, ltm, bridge, benchmark }) {
  const chartData = data.map((d) => ({
    name: d.dateLabel,
    'Gross Margin': parseFloat((d.grossMargin ?? 0).toFixed(1)),
    'EBITDA Margin': parseFloat((d.ebitdaMargin ?? 0).toFixed(1)),
  }));

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

  // Find trough (margin low-point) and current trend
  const troughPoint = chartData.reduce((minI, d, i) =>
    (i === 0 || d['Gross Margin'] < chartData[minI]['Gross Margin']) ? i : minI, 0);
  const troughLabel = chartData[troughPoint]?.name;

  const gmVsBench = ltm ? ltm.ltmGrossMargin - benchmark.grossMargin.median : null;
  const marginTrend = ltm?.gmDelta !== null && ltm.gmDelta !== undefined
    ? (ltm.gmDelta > 0 ? 'expanding' : ltm.gmDelta < -1 ? 'compressing' : 'stable')
    : null;

  const opLeverageText = (() => {
    if (!ltm?.revenueGrowth || !ltm?.ebitdaMarginDelta) return null;
    if (ltm.revenueGrowth > 0 && ltm.ebitdaMarginDelta > 1)
      return `Operating leverage is building — revenue grew ${fmt(ltm.revenueGrowth)}% while EBITDA margin expanded ${fmt(ltm.ebitdaMarginDelta)}pp. The cost structure is scaling more slowly than the top line.`;
    if (ltm.revenueGrowth > 0 && ltm.ebitdaMarginDelta < -2)
      return `No operating leverage visible in this period — costs are growing faster than revenue, compressing EBITDA margin by ${fmt(Math.abs(ltm.ebitdaMarginDelta))}pp despite top-line growth.`;
    return `Cost structure is scaling roughly in-line with revenue — EBITDA margin ${ltm.ebitdaMarginDelta >= 0 ? 'improved marginally' : 'was broadly flat'} at ${fmt(ltm.ebitdaMarginDelta)}pp.`;
  })();

  const gmNarrative = gmVsBench !== null
    ? `Gross margin of ${fmt(ltm.ltmGrossMargin)}% is ${Math.abs(gmVsBench) < 1 ? 'in-line with' : gmVsBench > 0 ? `${fmt(gmVsBench)}pp above` : `${fmt(Math.abs(gmVsBench))}pp below`} the ${benchmark.label} median of ${benchmark.grossMargin.median}%. Margin is ${marginTrend === 'expanding' ? 'expanding' : marginTrend === 'compressing' ? 'compressing' : 'broadly stable'} on a LTM basis${ltm.gmDelta ? ` (${ltm.gmDelta >= 0 ? '+' : ''}${fmt(ltm.gmDelta)}pp YoY)` : ''}.`
    : null;

  const chartHeadline = ltm
    ? `Gross margin ${fmt(ltm.ltmGrossMargin)}% · EBITDA margin ${fmt(ltm.ltmEBITDAMargin)}%`
    : 'Margin profile over time';

  return (
    <div>
      {/* Combined margin chart + narrative panel */}
      <div className="chart-section">
        <div className="chart-panel">
          <div className="chart-title-headline">{chartHeadline}</div>
          <div className="chart-title-sub">
            The gap between gross margin and EBITDA margin reflects the operating cost burden
          </div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <div className="chart-legend-line" style={{ background: COLORS.navy }} />
              Gross Margin %
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-line" style={{ background: COLORS.amber }} />
              EBITDA Margin %
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: COLORS.muted }}
                tickLine={false}
                axisLine={{ stroke: '#E2DDD6' }}
                interval={5}
              />
              <YAxis
                tick={{ fontSize: 10, fill: COLORS.muted }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
                domain={['auto', 'auto']}
                width={40}
              />
              <Tooltip content={<MarginTooltip />} />
              <ReferenceLine
                y={benchmark.grossMargin.median}
                stroke={COLORS.navy}
                strokeDasharray="4 4"
                strokeOpacity={0.3}
                label={{ value: `GM benchmark ${benchmark.grossMargin.median}%`, position: 'right', fill: COLORS.muted, fontSize: 9 }}
              />
              <Line
                dataKey="Gross Margin"
                stroke={COLORS.navy}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: COLORS.navy, strokeWidth: 0 }}
              />
              <Line
                dataKey="EBITDA Margin"
                stroke={COLORS.amber}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: COLORS.amber, strokeWidth: 0 }}
                strokeDasharray="6 3"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="insight-panel">
          <div className="insight-title">Quality of Earnings</div>
          {gmNarrative && <div className="narrative-insight">{gmNarrative}</div>}
          {opLeverageText && <div className="narrative-insight">{opLeverageText}</div>}
          <div className="metric-row">
            <span className="metric-label">Gross Margin (LTM)</span>
            <span className="metric-value">
              {ltm ? `${fmt(ltm.ltmGrossMargin)}%` : '—'}
              {ltm?.gmDelta !== null && ltm?.gmDelta !== undefined && (
                <span className={`metric-delta ${ltm.gmDelta >= 0 ? 'pos' : 'neg'}`}>
                  {ltm.gmDelta >= 0 ? '+' : ''}{fmt(ltm.gmDelta)}pp
                </span>
              )}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">vs {benchmark.label} Median</span>
            <span className="metric-value" style={{ fontSize: 12 }}>
              {gmVsBench !== null ? (
                <span style={{ color: gmVsBench >= 0 ? COLORS.green : COLORS.red }}>
                  {gmVsBench >= 0 ? '+' : ''}{fmt(gmVsBench)}pp
                </span>
              ) : '—'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">EBITDA Margin (LTM)</span>
            <span className="metric-value">
              {ltm ? `${fmt(ltm.ltmEBITDAMargin)}%` : '—'}
              {ltm?.ebitdaMarginDelta !== null && ltm?.ebitdaMarginDelta !== undefined && (
                <span className={`metric-delta ${ltm.ebitdaMarginDelta >= 0 ? 'pos' : 'neg'}`}>
                  {ltm.ebitdaMarginDelta >= 0 ? '+' : ''}{fmt(ltm.ebitdaMarginDelta)}pp
                </span>
              )}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">EBITDA Benchmark</span>
            <span className="metric-value" style={{ fontSize: 12, color: COLORS.muted }}>
              {benchmark.ebitdaMargin.median}% median
            </span>
          </div>
          {ltm?.ruleOf40 !== null && ltm?.ruleOf40 !== undefined && benchmark.useRuleOf40 && (
            <div className="metric-row">
              <span className="metric-label">Rule of 40</span>
              <span className="metric-value">
                {fmt(ltm.ruleOf40)}
                <span className={`metric-delta ${ltm.ruleOf40 >= 40 ? 'pos' : ltm.ruleOf40 >= 30 ? 'neu' : 'neg'}`}>
                  {ltm.ruleOf40 >= 40 ? '✓' : ''}
                </span>
              </span>
            </div>
          )}
        </div>
      </div>

      {/* EBITDA Bridge — floating waterfall */}
      {bridge && waterfallData.length > 0 && (
        <div className="chart-panel" style={{ marginTop: 16 }}>
          <div className="chart-title-headline">EBITDA Bridge: Prior LTM → Current LTM</div>
          <div className="chart-title-sub">Decomposition of EBITDA movement by driver — revenue growth, gross margin, and operating cost changes</div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: COLORS.green }} />
              Positive contribution
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: COLORS.red }} />
              Headwind / cost drag
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-dot" style={{ background: COLORS.navy }} />
              Opening / closing total
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={waterfallData} barCategoryGap="32%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} />
              <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}K`} width={48} />
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

      {/* Cost structure — EBITDA margin trend standalone */}
      <div className="chart-panel" style={{ marginTop: 16 }}>
        <div className="chart-title-headline">EBITDA Margin Progression</div>
        <div className="chart-title-sub">
          Absolute EBITDA margin over the full period — benchmark {benchmark.ebitdaMargin.median}% shown as reference
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={data.map((d) => ({ name: d.dateLabel, 'EBITDA Margin': parseFloat((d.ebitdaMargin ?? 0).toFixed(1)) }))} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="ebitdaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.amber} stopOpacity={0.12} />
                <stop offset="95%" stopColor={COLORS.amber} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} interval={5} />
            <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} width={36} />
            <Tooltip content={({ active, payload, label }) => {
              if (!active || !payload?.length) return null;
              return (
                <div className="custom-tooltip">
                  <div className="tt-label">{label}</div>
                  <div className="tt-row">
                    <span className="tt-name">EBITDA Margin</span>
                    <span className="tt-value">{fmt(payload[0].value)}%</span>
                  </div>
                </div>
              );
            }} />
            <ReferenceLine
              y={benchmark.ebitdaMargin.median}
              stroke={COLORS.amber}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              label={{ value: `Benchmark ${benchmark.ebitdaMargin.median}%`, position: 'right', fill: COLORS.muted, fontSize: 9 }}
            />
            <Area dataKey="EBITDA Margin" stroke={COLORS.amber} fill="url(#ebitdaGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.amber, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
