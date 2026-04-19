import { useMemo, useState } from 'react';
import { computeMetrics, computeLTMMetrics, computeEBITDABridge, aggregateQuarterly, detectRevenueModel, detectDealType } from '../modules/metricCalculator';
import { generateInsights } from '../modules/insightEngine';
import { getBenchmark, REVENUE_MODELS, DEAL_TYPES } from '../modules/benchmarks';
import ExecutiveSummary from './ExecutiveSummary';
import GrowthTab from './GrowthTab';
import CustomersTab from './CustomersTab';
import EfficiencyTab from './EfficiencyTab';

const TABS = [
  { id: 'summary', label: 'Deal Overview' },
  { id: 'growth', label: 'Growth Engine' },
  { id: 'customers', label: 'Customer Quality' },
  { id: 'efficiency', label: 'Quality of Earnings' },
];

export default function Dashboard({ config, qualitative, setQualitative }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [timeframe, setTimeframe] = useState('monthly');

  const processed = useMemo(() => {
    const metricsData = computeMetrics(config.data);
    const ltm = computeLTMMetrics(metricsData);
    const bridge = computeEBITDABridge(metricsData);
    const quarterly = aggregateQuarterly(metricsData);
    const detectedRevenueModel = detectRevenueModel(metricsData);
    const detectedDealType = detectDealType(ltm);
    const insights = ltm ? generateInsights(ltm, metricsData, config.businessType, detectedDealType, qualitative, config.customerPanelData) : null;
    const benchmark = getBenchmark(config.businessType);
    return { metricsData, ltm, bridge, quarterly, insights, benchmark, detectedRevenueModel, detectedDealType };
  }, [config, qualitative]);

  const displayData = timeframe === 'quarterly' ? processed.quarterly : processed.metricsData;

  const rmLabel = REVENUE_MODELS[processed.detectedRevenueModel]?.label ?? processed.detectedRevenueModel;
  const dtLabel = DEAL_TYPES[processed.detectedDealType]?.label ?? processed.detectedDealType;

  return (
    <div className="dashboard">
      <div className="dashboard-topbar">
        <div className="tab-bar">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="detected-profile">
          <span className="detected-label">Detected</span>
          <span className="detected-tag detected-tag-blue">{dtLabel}</span>
          <span className="detected-tag detected-tag-muted">{rmLabel}</span>
        </div>
      </div>

      <div className={`tab-content tab-${activeTab}`}>
        {activeTab !== 'summary' && (
          <div className="timeframe-toggle">
            <button className={`tf-btn ${timeframe === 'monthly' ? 'active' : ''}`} onClick={() => setTimeframe('monthly')}>Monthly</button>
            <button className={`tf-btn ${timeframe === 'quarterly' ? 'active' : ''}`} onClick={() => setTimeframe('quarterly')}>Quarterly</button>
          </div>
        )}

        {activeTab === 'summary' && processed.ltm && processed.insights && (
          <ExecutiveSummary
            ltm={processed.ltm}
            insights={processed.insights}
            benchmark={processed.benchmark}
            qualitative={qualitative}
            setQualitative={setQualitative}
            cimText={config.cimText}
            customerPanelData={config.customerPanelData}
            metricsData={processed.metricsData}
          />
        )}
        {activeTab === 'growth' && (
          <GrowthTab
            data={displayData}
            metricsData={processed.metricsData}
            ltm={processed.ltm}
            bridge={processed.bridge}
            benchmark={processed.benchmark}
          />
        )}
        {activeTab === 'customers' && (
          <CustomersTab
            data={displayData}
            metricsData={processed.metricsData}
            ltm={processed.ltm}
            benchmark={processed.benchmark}
            config={config}
          />
        )}
        {activeTab === 'efficiency' && (
          <EfficiencyTab
            data={displayData}
            metricsData={processed.metricsData}
            ltm={processed.ltm}
            bridge={processed.bridge}
            benchmark={processed.benchmark}
          />
        )}
      </div>
    </div>
  );
}
