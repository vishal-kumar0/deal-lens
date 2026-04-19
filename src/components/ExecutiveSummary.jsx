import { getSignalColor } from '../modules/benchmarks';
import { fmt, fmtCurrency } from '../modules/insightEngine';
import QualitativeOverlay from './QualitativeOverlay';

export default function ExecutiveSummary({ ltm, insights, benchmark, qualitative, setQualitative }) {
  const gmColor = getSignalColor(ltm.ltmGrossMargin, benchmark.grossMargin);
  const ebitdaColor = ltm.ltmEBITDAMargin >= benchmark.ebitdaMargin.green ? 'green' : ltm.ltmEBITDAMargin >= benchmark.ebitdaMargin.amber ? 'amber' : 'red';
  const revColor = ltm.revenueGrowth !== null ? (ltm.revenueGrowth >= benchmark.revenueGrowth.green ? 'green' : ltm.revenueGrowth >= benchmark.revenueGrowth.amber ? 'amber' : 'red') : 'amber';
  const custColor = ltm.customerGrowth !== null ? (ltm.customerGrowth >= benchmark.customerGrowth.green ? 'green' : ltm.customerGrowth >= benchmark.customerGrowth.amber ? 'amber' : 'red') : 'amber';
  const arpuColor = ltm.arpuChange !== null ? (ltm.arpuChange >= benchmark.arpuChange.green ? 'green' : ltm.arpuChange >= benchmark.arpuChange.amber ? 'amber' : 'red') : 'amber';

  // Format thesis with double-click styling
  const thesisHtml = insights.thesis.replace(
    /\[Needs further double-click[^\]]*\]/g,
    (match) => `<span class="double-click">${match}</span>`
  );

  return (
    <div>
      {/* Deal Snapshot — LTM KPIs */}
      <div className="section">
        <div className="section-title">Deal Snapshot — LTM<div className="line" /></div>
        <div className="kpi-grid">
          <KPICard
            label="LTM Revenue"
            value={fmtCurrency(ltm.ltmRevenue)}
            change={ltm.revenueGrowth !== null ? `${ltm.revenueGrowth >= 0 ? '+' : ''}${fmt(ltm.revenueGrowth)}% YoY` : null}
            changeColor={revColor}
          />
          <KPICard
            label="Gross Margin"
            value={`${fmt(ltm.ltmGrossMargin)}%`}
            change={ltm.gmDelta !== null ? `${ltm.gmDelta >= 0 ? '+' : ''}${fmt(ltm.gmDelta)}pp YoY` : null}
            changeColor={gmColor}
            benchmark={`${benchmark.label} median: ${benchmark.grossMargin.median}%`}
          />
          <KPICard
            label="EBITDA Margin"
            value={`${fmt(ltm.ltmEBITDAMargin)}%`}
            change={ltm.ebitdaMarginDelta !== null ? `${ltm.ebitdaMarginDelta >= 0 ? '+' : ''}${fmt(ltm.ebitdaMarginDelta)}pp YoY` : null}
            changeColor={ebitdaColor}
            benchmark={benchmark.useRuleOf40 && ltm.ruleOf40 !== null ? `Rule of 40: ${fmt(ltm.ruleOf40)}` : `Benchmark: ${benchmark.ebitdaMargin.median}%`}
          />
          <KPICard
            label="Customers"
            value={ltm.latestCustomers?.toLocaleString()}
            change={ltm.customerGrowth !== null ? `${ltm.customerGrowth >= 0 ? '+' : ''}${fmt(ltm.customerGrowth)}% YoY` : null}
            changeColor={custColor}
          />
          <KPICard
            label="ARPU"
            value={fmtCurrency(ltm.latestARPU)}
            change={ltm.arpuChange !== null ? `${ltm.arpuChange >= 0 ? '+' : ''}${fmt(ltm.arpuChange)}% YoY` : null}
            changeColor={arpuColor}
          />
        </div>
      </div>

      {/* Deal Thesis */}
      <div className="section">
        <div className="section-title">Deal Thesis<div className="line" /></div>
        <div className="thesis-block">
          <p dangerouslySetInnerHTML={{ __html: thesisHtml }} />
        </div>
      </div>

      {/* Key Signals */}
      <div className="section">
        <div className="section-title">Key Signals<div className="line" /></div>
        <div className="signals-list">
          {insights.signals.slice(0, 6).map((signal, i) => (
            <div key={i} className={`signal-item ${signal.severity}`}>
              <span className={`severity-dot ${signal.severity}`} />
              {signal.text}
            </div>
          ))}
        </div>
        {insights.composites.length > 0 && (
          <div className="signals-list" style={{ marginTop: 8 }}>
            {insights.composites.map((c, i) => (
              <div key={i} className={`signal-item ${c.severity}`}>
                <span className={`severity-dot ${c.severity}`} />
                <strong style={{ marginRight: 4 }}>Synthesis:</strong> {c.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Qualitative Overlay */}
      {qualitative && setQualitative && (
        <QualitativeOverlay qualitative={qualitative} setQualitative={setQualitative} />
      )}

      {/* Watch List */}
      <div className="section">
        <div className="section-title">Diligence Watch List<div className="line" /></div>
        <div className="watch-list">
          {insights.watchList.map((item, i) => (
            <div key={i} className="watch-item">
              <div className="claim">↗ {item.claim}</div>
              <div className="question">{item.question}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPICard({ label, value, change, changeColor, benchmark }) {
  return (
    <div className="kpi-card">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {change && (
        <div className={`kpi-change ${changeColor}`}>
          <span className={`severity-dot ${changeColor}`} />
          {change}
        </div>
      )}
      {benchmark && <div className="kpi-benchmark">{benchmark}</div>}
    </div>
  );
}
