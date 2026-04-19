import { useMemo, useState } from 'react';
import { computeMetrics, computeLTMMetrics, computeEBITDABridge, aggregateQuarterly } from '../modules/metricCalculator';
import { generateInsights } from '../modules/insightEngine';
import { getBenchmark } from '../modules/benchmarks';
import { REVENUE_MODELS, DEAL_TYPES } from '../modules/benchmarks';
import ExecutiveSummary from './ExecutiveSummary';
import GrowthTab from './GrowthTab';
import CustomersTab from './CustomersTab';
import EfficiencyTab from './EfficiencyTab';

const TABS = [
  { id: 'summary', label: 'Executive Summary' },
  { id: 'growth', label: 'Growth' },
  { id: 'customers', label: 'Customers' },
  { id: 'efficiency', label: 'Efficiency' },
];

export default function Dashboard({ config, onReset }) {
  const [activeTab, setActiveTab] = useState('summary');
  const [timeframe, setTimeframe] = useState('monthly');

  const processed = useMemo(() => {
    const metricsData = computeMetrics(config.data);
    const ltm = computeLTMMetrics(metricsData);
    const bridge = computeEBITDABridge(metricsData);
    const quarterly = aggregateQuarterly(metricsData);
    const insights = ltm ? generateInsights(ltm, metricsData, config.businessType, config.dealType) : null;
    const benchmark = getBenchmark(config.businessType);
    return { metricsData, ltm, bridge, quarterly, insights, benchmark };
  }, [config]);

  const displayData = timeframe === 'quarterly' ? processed.quarterly : processed.metricsData;

  return (
    <div className="dashboard">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div className="tab-bar" style={{ flex: 1 }}>
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
      </div>

      <div className="tab-content">
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
            config={config}
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
