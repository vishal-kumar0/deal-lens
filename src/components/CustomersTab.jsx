import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Cell } from 'recharts';
import { fmt, fmtCurrency } from '../modules/insightEngine';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload) return null;
  return (
    <div className="custom-tooltip">
      <div className="label">{label}</div>
      {payload.map((p, i) => (
        <div key={i} className="item" style={{ color: p.color }}>
          {p.name}: {typeof p.value === 'number' ? (p.name === 'ARPU' ? fmtCurrency(p.value) : p.value.toLocaleString()) : p.value}
        </div>
      ))}
    </div>
  );
};

export default function CustomersTab({ data, metricsData, ltm, benchmark, config }) {
  const hasNewCustomers = data.some((d) => d.newCustomers !== null && d.newCustomers !== undefined && d.newCustomers > 0);

  // Chart data for stacked bar
  const chartData = data.map((d) => ({
    name: d.dateLabel,
    Retained: d.retainedCustomers ?? d.customers,
    New: d.newCustomers ?? 0,
    Lost: d.lostCustomers ? -d.lostCustomers : 0,
    ARPU: Math.round(d.arpu),
  }));

  // ARPU chart data
  const arpuData = data.map((d) => ({
    name: d.dateLabel,
    ARPU: Math.round(d.arpu),
  }));

  // Retention proxy signal
  let retentionSignal = null;
  if (ltm?.revenueGrowth !== null && ltm?.customerGrowth !== null) {
    const diff = ltm.revenueGrowth - ltm.customerGrowth;
    if (diff > 3) {
      retentionSignal = { color: 'green', text: `Revenue growing ${fmt(diff)}pp faster than customer base — existing customer monetisation is strengthening` };
    } else if (diff < -3) {
      retentionSignal = { color: 'amber', text: `Revenue growing ${fmt(Math.abs(diff))}pp slower than customer base — new customers are lower-value or pricing is declining` };
    } else {
      retentionSignal = { color: 'green', text: `Revenue and customer growth are proportional — healthy volume growth` };
    }
  }

  return (
    <div>
      {/* Customer stacked bar chart */}
      <div className="chart-section">
        <div className="chart-panel">
          <div className="chart-title">
            {hasNewCustomers ? 'Customer Composition: New + Retained / Lost' : 'Customer Count Over Time'}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            {hasNewCustomers ? (
              <ComposedChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Retained" stackId="above" fill="var(--chart-1)" opacity={0.8} />
                <Bar dataKey="New" stackId="above" fill="var(--green)" radius={[4, 4, 0, 0]} opacity={0.8} />
                <Bar dataKey="Lost" fill="var(--red)" opacity={0.7} radius={[0, 0, 4, 4]} />
              </ComposedChart>
            ) : (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="Retained" fill="var(--chart-1)" radius={[4, 4, 0, 0]} opacity={0.8} />
              </BarChart>
            )}
          </ResponsiveContainer>
          {!hasNewCustomers && (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8, padding: '8px 12px', background: 'var(--bg-surface)', borderRadius: 6 }}>
              💡 Upload a <strong>new_customers</strong> column to unlock the New / Retained / Lost decomposition view.
            </div>
          )}
        </div>

        <div className="insight-panel">
          <div className="insight-title">Customer Insights</div>
          <div className="insight-item">
            <div>
              <div className="insight-label">Current Customers</div>
              <div className="insight-value">{ltm?.latestCustomers?.toLocaleString() ?? 'N/A'}</div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">LTM Customer Growth</div>
              <div className="insight-value" style={{
                color: ltm?.customerGrowth >= benchmark.customerGrowth.green ? 'var(--green)' :
                  ltm?.customerGrowth >= benchmark.customerGrowth.amber ? 'var(--amber)' : 'var(--red)',
              }}>
                {ltm?.customerGrowth !== null ? `${ltm.customerGrowth >= 0 ? '+' : ''}${fmt(ltm.customerGrowth)}%` : 'N/A'}
              </div>
            </div>
          </div>
          <div className="insight-item">
            <div>
              <div className="insight-label">ARPU Trend (LTM)</div>
              <div className="insight-value" style={{
                color: ltm?.arpuChange >= 0 ? 'var(--green)' : ltm?.arpuChange >= benchmark.arpuChange.amber ? 'var(--amber)' : 'var(--red)',
              }}>
                {ltm?.arpuChange !== null ? `${ltm.arpuChange >= 0 ? '+' : ''}${fmt(ltm.arpuChange)}%` : 'N/A'}
              </div>
            </div>
          </div>
          {retentionSignal && (
            <div className="insight-item">
              <div>
                <div className="insight-label">Retention Proxy</div>
                <div style={{ fontSize: 13, color: `var(--${retentionSignal.color})`, lineHeight: 1.5, marginTop: 4 }}>
                  {retentionSignal.text}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ARPU chart */}
      <div className="chart-panel" style={{ marginTop: 20 }}>
        <div className="chart-title">ARPU Over Time</div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={arpuData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickFormatter={(v) => `${v}`} />
            <Tooltip content={<CustomTooltip />} />
            <Line dataKey="ARPU" stroke="var(--chart-3)" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
