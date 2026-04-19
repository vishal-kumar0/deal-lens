import { useState } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import { DEAL_TYPES } from './modules/benchmarks';
import BENCHMARKS from './modules/benchmarks';
import './index.css';

export default function App() {
  const [config, setConfig] = useState(null);

  const handleComplete = (result) => {
    setConfig(result);
  };

  const handleReset = () => {
    setConfig(null);
  };

  return (
    <div className="app-container">
      <header className="header">
        <div className="header-logo">
          <span>🔍</span>
          <h1>DealLens</h1>
        </div>
        <div className="header-meta">
          {config && (
            <>
              <span className="header-badge">{BENCHMARKS[config.businessType]?.label}</span>
              <span className="header-badge">{DEAL_TYPES[config.dealType]?.label}</span>
              <button className="header-btn" onClick={handleReset}>New Analysis</button>
            </>
          )}
        </div>
      </header>

      {!config ? (
        <Onboarding onComplete={handleComplete} />
      ) : (
        <Dashboard config={config} onReset={handleReset} />
      )}
    </div>
  );
}
