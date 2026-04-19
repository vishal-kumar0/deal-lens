import { useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart,
} from 'recharts';
import { fmt, fmtCurrency } from '../modules/insightEngine';

const COLORS = {
  navy: '#1E3A5F',
  green: '#2D6B4A',
  red: '#8B1C1C',
  amber: '#C47A2C',
  muted: '#8A837A',
  navyLight: '#AABBD4',
  greenLight: '#8DC4A4',
  redLight: '#D4888A',
};

const LineTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        p.value !== null && p.value !== undefined && (
          <div key={i} className="tt-row">
            <span className="tt-name">{p.name}</span>
            <span className="tt-value" style={{ color: p.color }}>
              {p.name === 'ARPU' ? fmtCurrency(p.value)
                : p.name.includes('%') || p.name === 'NRR' || p.name === 'GRR' ? `${fmt(p.value)}%`
                : p.value.toLocaleString()}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

const CustomerTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="custom-tooltip">
      <div className="tt-label">{label}</div>
      {payload.map((p, i) => (
        p.value !== null && p.value !== undefined && p.value !== 0 && (
          <div key={i} className="tt-row">
            <span className="tt-name">{p.name}</span>
            <span className="tt-value" style={{ color: p.color || p.fill }}>
              {p.name === 'Lost' ? `−${Math.abs(p.value)}` : p.value}
            </span>
          </div>
        )
      ))}
    </div>
  );
};

export default function CustomersTab({ data, metricsData, ltm, benchmark, config }) {
  const hasNewCustomers = data.some((d) => d.newCustomers !== null && d.newCustomers !== undefined && d.newCustomers > 0);
  const customerPanelData = config?.customerPanelData;

  const accountChartData = data.map((d) => ({
    name: d.dateLabel,
    Accounts: d.customers ?? 0,
    New: d.newCustomers ?? 0,
    Lost: d.lostCustomers ? -d.lostCustomers : 0,
    Retained: d.retainedCustomers ?? 0,
  }));

  const arpuData = data.map((d) => ({
    name: d.dateLabel,
    ARPU: Math.round(d.arpu),
  }));

  const retentionData = useMemo(() => {
    if (!customerPanelData || customerPanelData.length === 0) return [];
    return customerPanelData
      .filter((d) => d.nrr > 0 || d.grr > 0)
      .map((d) => ({
        name: d.dateLabel || d.date,
        NRR: d.nrr || null,
        GRR: d.grr || null,
      }));
  }, [customerPanelData]);

  const latestNRR = retentionData.length ? retentionData[retentionData.length - 1]?.NRR : null;
  const latestGRR = retentionData.length ? retentionData[retentionData.length - 1]?.GRR : null;

  const firstCustomers = metricsData?.[0]?.customers;
  const lastCustomers = metricsData?.[metricsData.length - 1]?.customers;
  const customerCAGR = firstCustomers && lastCustomers && metricsData.length > 1
    ? (((lastCustomers / firstCustomers) ** (12 / (metricsData.length - 1))) - 1) * 100
    : null;

  const firstARPU = metricsData?.[0]?.arpu;
  const lastARPU = metricsData?.[metricsData.length - 1]?.arpu;
  const arpuTotalChange = firstARPU && lastARPU ? ((lastARPU - firstARPU) / firstARPU) * 100 : null;

  const volumeContrib = ltm?.customerGrowth ?? 0;
  const priceContrib = ltm?.arpuChange ?? 0;
  const isPriceDriven = Math.abs(priceContrib) > Math.abs(volumeContrib);

  const retentionNarrative = (() => {
    if (!latestNRR && !latestGRR) return null;
    const parts = [];
    if (latestNRR) {
      parts.push(latestNRR >= 110
        ? `NRR of ${fmt(latestNRR)}% indicates strong expansion — existing accounts are growing their spend, net of any churn.`
        : latestNRR >= 100
        ? `NRR of ${fmt(latestNRR)}% — existing accounts are stable, with modest expansion offsetting churn.`
        : `NRR of ${fmt(latestNRR)}% is below 100%, meaning the revenue base is eroding from existing accounts. Requires investigation.`
      );
    }
    if (latestGRR) {
      parts.push(latestGRR >= 90
        ? `GRR of ${fmt(latestGRR)}% reflects low gross churn — the revenue base is well-anchored.`
        : `GRR of ${fmt(latestGRR)}% suggests some revenue loss from existing accounts before expansion.`
      );
    }
    return parts.join(' ');
  })();

  const growthDecompNote = volumeContrib !== 0 || priceContrib !== 0
    ? `Year-on-year revenue growth is ${isPriceDriven ? 'primarily price-driven' : 'primarily volume-driven'}. Account base ${volumeContrib >= 0 ? 'grew' : 'declined'} ${fmt(Math.abs(volumeContrib))}% while ARPU ${priceContrib >= 0 ? 'increased' : 'declined'} ${fmt(Math.abs(priceContrib))}%. ${isPriceDriven ? 'Price-led growth is higher quality but may face resistance at renewal.' : 'Volume-led growth is scalable but ARPU compression is a risk to watch.'}`
    : null;

  const chartHeadline = lastCustomers
    ? `${lastCustomers.toLocaleString()} accounts${customerCAGR !== null ? ` — growing at ${fmt(customerCAGR)}% annually` : ''}`
    : 'Customer base over time';

  return (
    <div>
      {/* Retention KPIs — most important, shown first if available */}
      {(latestNRR || latestGRR) && (
        <div style={{ marginBottom: 20 }}>
          <div className="section-title" style={{ marginBottom: 12 }}>
            Retention Metrics<div className="line" />
          </div>
          <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 0 }}>
            {latestNRR && (
              <div className="kpi-card">
                <div className="kpi-label">Net Revenue Retention</div>
                <div className="kpi-value">{latestNRR.toFixed(1)}%</div>
                <div className={`kpi-change ${latestNRR >= 120 ? 'green' : latestNRR >= 100 ? 'amber' : 'red'}`}>
                  <span className={`severity-dot ${latestNRR >= 120 ? 'green' : latestNRR >= 100 ? 'amber' : 'red'}`} />
                  {latestNRR >= 120 ? 'Best-in-class' : latestNRR >= 100 ? 'Stable / expanding' : 'Below 100% — eroding'}
                </div>
                <div className="kpi-benchmark">Benchmark &gt;110% NRR</div>
              </div>
            )}
            {latestGRR && (
              <div className="kpi-card">
                <div className="kpi-label">Gross Revenue Retention</div>
                <div className="kpi-value">{latestGRR.toFixed(1)}%</div>
                <div className={`kpi-change ${latestGRR >= 90 ? 'green' : latestGRR >= 80 ? 'amber' : 'red'}`}>
                  <span className={`severity-dot ${latestGRR >= 90 ? 'green' : latestGRR >= 80 ? 'amber' : 'red'}`} />
                  {latestGRR >= 90 ? 'Low gross churn' : latestGRR >= 80 ? 'Moderate attrition' : 'High gross churn'}
                </div>
                <div className="kpi-benchmark">Benchmark &gt;85% GRR</div>
              </div>
            )}
            <div className="kpi-card">
              <div className="kpi-label">ARPU (Latest)</div>
              <div className="kpi-value">{ltm?.latestARPU ? fmtCurrency(ltm.latestARPU) : '—'}</div>
              {arpuTotalChange !== null && (
                <div className={`kpi-change ${arpuTotalChange >= 0 ? 'green' : 'red'}`}>
                  <span className={`severity-dot ${arpuTotalChange >= 0 ? 'green' : 'red'}`} />
                  {arpuTotalChange >= 0 ? '+' : ''}{fmt(arpuTotalChange)}% over full period
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Account count chart + narrative */}
      <div className="chart-section">
        <div className="chart-panel">
          <div className="chart-title-headline">{chartHeadline}</div>
          <div className="chart-title-sub">
            {hasNewCustomers
              ? 'Total account base with new additions and lost accounts shown separately'
              : 'Total active account count over time'}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            {hasNewCustomers ? (
              <ComposedChart data={accountChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<CustomerTooltip />} />
                <Bar dataKey="Retained" stackId="above" fill={COLORS.navyLight} maxBarSize={18} name="Retained" />
                <Bar dataKey="New" stackId="above" fill={COLORS.green} radius={[2, 2, 0, 0]} maxBarSize={18} name="New" />
                <Bar dataKey="Lost" fill={COLORS.redLight} radius={[0, 0, 2, 2]} maxBarSize={18} name="Lost" />
              </ComposedChart>
            ) : (
              <AreaChart data={accountChartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="acctGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.navy} stopOpacity={0.12} />
                    <stop offset="95%" stopColor={COLORS.navy} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} interval={5} />
                <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} width={36} />
                <Tooltip content={<LineTooltip />} />
                <Area dataKey="Accounts" stroke={COLORS.navy} fill="url(#acctGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.navy, strokeWidth: 0 }} />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="insight-panel">
          <div className="insight-title">Customer Analysis</div>
          {retentionNarrative && <div className="narrative-insight">{retentionNarrative}</div>}
          {growthDecompNote && <div className="narrative-insight">{growthDecompNote}</div>}
          <div className="metric-row">
            <span className="metric-label">Current Accounts</span>
            <span className="metric-value">{ltm?.latestCustomers?.toLocaleString() ?? '—'}</span>
          </div>
          <div className="metric-row">
            <span className="metric-label">YoY Account Growth</span>
            <span className="metric-value">
              {ltm?.customerGrowth !== null && ltm?.customerGrowth !== undefined ? (
                <>
                  {ltm.customerGrowth >= 0 ? '+' : ''}{fmt(ltm.customerGrowth)}%
                  <span className={`metric-delta ${ltm.customerGrowth >= benchmark.customerGrowth.green ? 'pos' : ltm.customerGrowth >= benchmark.customerGrowth.amber ? 'neu' : 'neg'}`}>
                    {ltm.customerGrowth >= benchmark.customerGrowth.green ? '↑' : '~'}
                  </span>
                </>
              ) : '—'}
            </span>
          </div>
          {customerCAGR !== null && (
            <div className="metric-row">
              <span className="metric-label">Account CAGR</span>
              <span className="metric-value">{fmt(customerCAGR)}%</span>
            </div>
          )}
          <div className="metric-row">
            <span className="metric-label">ARPU (LTM change)</span>
            <span className="metric-value">
              {ltm?.arpuChange !== null && ltm?.arpuChange !== undefined ? (
                <>
                  {ltm.arpuChange >= 0 ? '+' : ''}{fmt(ltm.arpuChange)}%
                  <span className={`metric-delta ${ltm.arpuChange >= 0 ? 'pos' : 'neg'}`}>
                    {ltm.arpuChange >= 0 ? '↑' : '↓'}
                  </span>
                </>
              ) : '—'}
            </span>
          </div>
          <div className="metric-row">
            <span className="metric-label">Growth Driver</span>
            <span className="metric-value" style={{ fontSize: 12 }}>
              {volumeContrib !== 0 || priceContrib !== 0
                ? (isPriceDriven ? 'Price-led' : 'Volume-led')
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* NRR / GRR trend if panel data available */}
      {retentionData.length > 2 && (
        <div className="chart-panel" style={{ marginTop: 16 }}>
          <div className="chart-title-headline">NRR and GRR Trend</div>
          <div className="chart-title-sub">Net and gross revenue retention over time — NRR &gt;100% means existing accounts are growing their spend</div>
          <div className="chart-legend">
            <div className="chart-legend-item">
              <div className="chart-legend-line" style={{ background: COLORS.navy }} />
              NRR %
            </div>
            <div className="chart-legend-item">
              <div className="chart-legend-line" style={{ background: COLORS.amber }} />
              GRR %
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={retentionData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} interval={5} />
              <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={['auto', 'auto']} width={40} />
              <Tooltip content={<LineTooltip />} />
              <Line dataKey="NRR" stroke={COLORS.navy} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.navy, strokeWidth: 0 }} />
              <Line dataKey="GRR" stroke={COLORS.amber} strokeWidth={2} dot={false} strokeDasharray="5 3" activeDot={{ r: 4, fill: COLORS.amber, strokeWidth: 0 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ARPU trend */}
      <div className="chart-panel" style={{ marginTop: 16 }}>
        <div className="chart-title-headline">
          ARPU Trend{arpuTotalChange !== null ? ` — ${arpuTotalChange >= 0 ? '+' : ''}${fmt(arpuTotalChange)}% over full period` : ''}
        </div>
        <div className="chart-title-sub">Average revenue per account — rising ARPU indicates pricing power and/or upsell</div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={arpuData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="arpuGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={COLORS.green} stopOpacity={0.12} />
                <stop offset="95%" stopColor={COLORS.green} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="#E8E3DD" horizontal={true} vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={{ stroke: '#E2DDD6' }} interval={5} />
            <YAxis tick={{ fontSize: 10, fill: COLORS.muted }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtCurrency(v)} width={52} />
            <Tooltip content={<LineTooltip />} />
            <Area dataKey="ARPU" stroke={COLORS.green} fill="url(#arpuGrad)" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: COLORS.green, strokeWidth: 0 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
