import { useMemo } from 'react';
import { getSignalColor } from '../modules/benchmarks';
import { fmt, fmtCurrency } from '../modules/insightEngine';
import QualitativeOverlay from './QualitativeOverlay';

function groupByYear(metricsData) {
  if (!metricsData || metricsData.length === 0) return [];
  const byYear = {};
  metricsData.forEach((d) => {
    const yr = d.dateLabel ? '20' + d.dateLabel.slice(-2) : null;
    if (!yr) return;
    if (!byYear[yr]) byYear[yr] = [];
    byYear[yr].push(d);
  });
  return Object.entries(byYear)
    .sort(([a], [b]) => a - b)
    .map(([year, months]) => {
      const revenue = months.reduce((s, m) => s + (m.revenue || 0), 0);
      const gmAvg = months.reduce((s, m) => s + (m.grossMargin || 0), 0) / months.length;
      const ebitdaAvg = months.reduce((s, m) => s + (m.ebitdaMargin || 0), 0) / months.length;
      return { year, revenue, gmAvg, ebitdaAvg, count: months.length };
    });
}

export default function ExecutiveSummary({ ltm, insights, benchmark, qualitative, setQualitative, cimText, customerPanelData, metricsData }) {
  const annualData = useMemo(() => {
    const rows = groupByYear(metricsData);
    return rows.map((row, i) => ({
      ...row,
      yoy: i > 0 ? ((row.revenue - rows[i - 1].revenue) / rows[i - 1].revenue) * 100 : null,
    }));
  }, [metricsData]);

  const thesisHtml = insights.thesis.replace(
    /\[Needs further double-click[^\]]*\]/g,
    (match) => `<span class="double-click">${match}</span>`
  );

  const strengthSignals = insights.signals.filter((s) => s.severity === 'green');
  const riskSignals = insights.signals.filter((s) => s.severity !== 'green');

  const allRisks = [
    ...riskSignals,
    ...(insights.composites || []).filter((c) => c.severity !== 'green'),
  ];
  const allStrengths = [
    ...strengthSignals,
    ...(insights.composites || []).filter((c) => c.severity === 'green'),
  ];

  const ebitdaColor = ltm.ltmEBITDAMargin >= benchmark.ebitdaMargin.green ? 'green'
    : ltm.ltmEBITDAMargin >= benchmark.ebitdaMargin.amber ? 'amber' : 'red';
  const revColor = ltm.revenueGrowth !== null
    ? (ltm.revenueGrowth >= benchmark.revenueGrowth.green ? 'green'
      : ltm.revenueGrowth >= benchmark.revenueGrowth.amber ? 'amber' : 'red')
    : 'amber';

  return (
    <div>
      {/* Deal at a Glance — 3 headline numbers */}
      <div className="section">
        <div className="section-title">Deal at a Glance<div className="line" /></div>
        <div className="deal-snapshot">
          <div className="snapshot-metric">
            <div className="snapshot-label">LTM Revenue</div>
            <div className="snapshot-value">{fmtCurrency(ltm.ltmRevenue)}</div>
            <div className="snapshot-change">
              {ltm.revenueGrowth !== null && (
                <>
                  <span className={`delta-${revColor === 'green' ? 'pos' : revColor === 'red' ? 'neg' : 'neu'}`}>
                    {ltm.revenueGrowth >= 0 ? '+' : ''}{fmt(ltm.revenueGrowth)}%
                  </span>
                  {' '}year-on-year
                </>
              )}
            </div>
          </div>
          <div className="snapshot-metric">
            <div className="snapshot-label">EBITDA Margin</div>
            <div className="snapshot-value">{fmt(ltm.ltmEBITDAMargin)}%</div>
            <div className="snapshot-change">
              {ltm.ebitdaMarginDelta !== null && (
                <>
                  <span className={`delta-${ltm.ebitdaMarginDelta >= 0 ? 'pos' : 'neg'}`}>
                    {ltm.ebitdaMarginDelta >= 0 ? '+' : ''}{fmt(ltm.ebitdaMarginDelta)}pp
                  </span>
                  {' '}vs prior year — benchmark {benchmark.ebitdaMargin.median}%
                </>
              )}
            </div>
          </div>
          <div className="snapshot-metric">
            <div className="snapshot-label">
              {ltm.latestCustomers ? 'Customers / Accounts' : 'Gross Margin'}
            </div>
            <div className="snapshot-value">
              {ltm.latestCustomers
                ? ltm.latestCustomers.toLocaleString()
                : `${fmt(ltm.ltmGrossMargin)}%`}
            </div>
            <div className="snapshot-change">
              {ltm.latestCustomers && ltm.customerGrowth !== null ? (
                <>
                  <span className={`delta-${ltm.customerGrowth >= 0 ? 'pos' : 'neg'}`}>
                    {ltm.customerGrowth >= 0 ? '+' : ''}{fmt(ltm.customerGrowth)}%
                  </span>
                  {' '}YoY — ARPU {ltm.latestARPU ? fmtCurrency(ltm.latestARPU) : '—'}
                </>
              ) : ltm.gmDelta !== null ? (
                <>
                  <span className={`delta-${ltm.gmDelta >= 0 ? 'pos' : 'neg'}`}>
                    {ltm.gmDelta >= 0 ? '+' : ''}{fmt(ltm.gmDelta)}pp
                  </span>
                  {' '}vs prior year — benchmark {benchmark.grossMargin.median}%
                </>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Annual P&L Summary */}
      {annualData.length > 0 && (
        <div className="section">
          <div className="section-title">Annual P&amp;L Summary<div className="line" /></div>
          <div className="annual-table-wrap">
            <table className="annual-table">
              <thead>
                <tr>
                  <th></th>
                  {annualData.map((row) => (
                    <th key={row.year}>{row.year}</th>
                  ))}
                  <th>LTM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Revenue</td>
                  {annualData.map((row) => (
                    <td key={row.year} className={row === annualData[annualData.length - 1] ? '' : ''}>
                      {fmtCurrency(row.revenue)}
                    </td>
                  ))}
                  <td style={{ fontWeight: 600 }}>{fmtCurrency(ltm.ltmRevenue)}</td>
                </tr>
                <tr>
                  <td>YoY Growth</td>
                  {annualData.map((row) => (
                    <td key={row.year} style={{ color: row.yoy === null ? 'var(--text-muted)' : row.yoy >= 0 ? 'var(--green)' : 'var(--red)', fontWeight: row.yoy !== null ? 600 : 400 }}>
                      {row.yoy === null ? '—' : `${row.yoy >= 0 ? '+' : ''}${fmt(row.yoy)}%`}
                    </td>
                  ))}
                  <td style={{ color: ltm.revenueGrowth !== null ? (ltm.revenueGrowth >= 0 ? 'var(--green)' : 'var(--red)') : 'var(--text-muted)', fontWeight: 600 }}>
                    {ltm.revenueGrowth !== null ? `${ltm.revenueGrowth >= 0 ? '+' : ''}${fmt(ltm.revenueGrowth)}%` : '—'}
                  </td>
                </tr>
                <tr>
                  <td>Gross Margin</td>
                  {annualData.map((row) => (
                    <td key={row.year}>{fmt(row.gmAvg)}%</td>
                  ))}
                  <td style={{ fontWeight: 600 }}>{fmt(ltm.ltmGrossMargin)}%</td>
                </tr>
                <tr>
                  <td>EBITDA Margin</td>
                  {annualData.map((row) => (
                    <td key={row.year}>{fmt(row.ebitdaAvg)}%</td>
                  ))}
                  <td style={{ fontWeight: 600 }}>{fmt(ltm.ltmEBITDAMargin)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Deal Thesis */}
      <div className="section">
        <div className="section-title">Deal Thesis<div className="line" /></div>
        <div className="thesis-block">
          <p dangerouslySetInnerHTML={{ __html: thesisHtml }} />
        </div>
      </div>

      {/* Strengths & Risks — two columns */}
      {(allStrengths.length > 0 || allRisks.length > 0) && (
        <div className="section">
          <div className="section-title">Strengths &amp; Risks<div className="line" /></div>
          <div className="signals-grid">
            <div>
              <div className="signals-column-label strengths">
                Strengths ({allStrengths.length})
              </div>
              <div className="signals-list">
                {allStrengths.length > 0 ? allStrengths.map((signal, i) => (
                  <div key={i} className="signal-item green">
                    <span className="severity-dot green" />
                    {signal.text}
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No material strengths identified from the data.</div>
                )}
              </div>
            </div>
            <div>
              <div className="signals-column-label risks">
                Risks &amp; Questions ({allRisks.length})
              </div>
              <div className="signals-list">
                {allRisks.length > 0 ? allRisks.map((signal, i) => (
                  <div key={i} className={`signal-item ${signal.severity}`}>
                    <span className={`severity-dot ${signal.severity}`} />
                    {signal.text}
                  </div>
                )) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>No material risks identified from the data provided.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Retention Panel — from customer panel data */}
      {customerPanelData && customerPanelData.length > 0 && (() => {
        const nrrRows = customerPanelData.filter((r) => r.nrr > 0);
        const grrRows = customerPanelData.filter((r) => r.grr > 0);
        const latestNRR = nrrRows.length ? nrrRows[nrrRows.length - 1].nrr : null;
        const latestGRR = grrRows.length ? grrRows[grrRows.length - 1].grr : null;
        const churnRows = customerPanelData.filter((r) => r.churnedCustomers !== undefined && r.activeCustomers > 0);
        const latestChurnPct = churnRows.length
          ? ((churnRows[churnRows.length - 1].churnedCustomers / churnRows[churnRows.length - 1].activeCustomers) * 100 * 12)
          : null;
        if (!latestNRR && !latestGRR && !latestChurnPct) return null;
        return (
          <div className="section">
            <div className="section-title">Retention Metrics — Wholesale Panel<div className="line" /></div>
            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
              {latestNRR && (
                <div className="kpi-card">
                  <div className="kpi-label">Net Revenue Retention</div>
                  <div className="kpi-value">{latestNRR.toFixed(1)}%</div>
                  <div className={`kpi-change ${latestNRR >= 120 ? 'green' : latestNRR >= 100 ? 'amber' : 'red'}`}>
                    <span className={`severity-dot ${latestNRR >= 120 ? 'green' : latestNRR >= 100 ? 'amber' : 'red'}`} />
                    {latestNRR >= 120 ? 'Best-in-class expansion' : latestNRR >= 100 ? 'Stable — accounts growing' : 'Revenue eroding from base'}
                  </div>
                  <div className="kpi-benchmark">SaaS benchmark &gt;110%</div>
                </div>
              )}
              {latestGRR && (
                <div className="kpi-card">
                  <div className="kpi-label">Gross Revenue Retention</div>
                  <div className="kpi-value">{latestGRR.toFixed(1)}%</div>
                  <div className={`kpi-change ${latestGRR >= 90 ? 'green' : latestGRR >= 80 ? 'amber' : 'red'}`}>
                    <span className={`severity-dot ${latestGRR >= 90 ? 'green' : latestGRR >= 80 ? 'amber' : 'red'}`} />
                    {latestGRR >= 90 ? 'Low gross churn' : latestGRR >= 80 ? 'Moderate revenue attrition' : 'Elevated churn — investigate'}
                  </div>
                  <div className="kpi-benchmark">SaaS benchmark &gt;85%</div>
                </div>
              )}
              {latestChurnPct !== null && (
                <div className="kpi-card">
                  <div className="kpi-label">Annualised Logo Churn</div>
                  <div className="kpi-value">{latestChurnPct.toFixed(1)}%</div>
                  <div className={`kpi-change ${latestChurnPct < 10 ? 'green' : latestChurnPct < 20 ? 'amber' : 'red'}`}>
                    <span className={`severity-dot ${latestChurnPct < 10 ? 'green' : latestChurnPct < 20 ? 'amber' : 'red'}`} />
                    {latestChurnPct < 10 ? 'Low account attrition' : latestChurnPct < 20 ? 'Mid-market typical range' : 'Elevated — requires diligence'}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* Qualitative Overlay */}
      {qualitative && setQualitative && (
        <div className="section">
          <div className="section-title">Analyst Assessment<div className="line" /></div>
          <QualitativeOverlay qualitative={qualitative} setQualitative={setQualitative} />
        </div>
      )}

      {/* CIM Context */}
      {cimText && (
        <div className="section">
          <div className="section-title">CIM — Extracted Text<div className="line" /></div>
          <details className="cim-block">
            <summary className="cim-summary">View raw CIM text (analyst reference only)</summary>
            <pre className="cim-text">{cimText}</pre>
          </details>
        </div>
      )}

      {/* Key Diligence Questions */}
      <div className="section">
        <div className="section-title">Key Diligence Questions<div className="line" /></div>
        <div className="watch-list">
          {insights.watchList.map((item, i) => (
            <div key={i} className="watch-item">
              <div className="watch-item-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="watch-item-body">
                <div className="claim">{item.claim}</div>
                <div className="question">{item.question}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
