import { useState } from 'react';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import PrivacyModal from './components/PrivacyModal';
import BENCHMARKS from './modules/benchmarks';
import './index.css';

const EMPTY_QUALITATIVE = {
  managementRating: null,
  managementNotes: '',
  marketDynamics: null,
  marketNotes: '',
  moats: [],
  moatNotes: '',
  keyRisks: '',
};

export default function App() {
  const [config, setConfig] = useState(null);
  const [qualitative, setQualitative] = useState(EMPTY_QUALITATIVE);
  const [sensitiveMode, setSensitiveMode] = useState(false);
  const [showClearNotification, setShowClearNotification] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(() => {
    try { return sessionStorage.getItem('deal_lens_privacy_ack') === '1'; } catch { return false; }
  });

  const handlePrivacyAck = () => {
    try { sessionStorage.setItem('deal_lens_privacy_ack', '1'); } catch { /* unavailable in some private modes */ }
    setPrivacyAcknowledged(true);
  };

  const handleComplete = (result) => setConfig(result);

  const handleReset = () => {
    if (!window.confirm('This will permanently clear all uploaded data from this session. Continue?')) return;
    setConfig(null);
    setQualitative(EMPTY_QUALITATIVE);
    setSensitiveMode(false);
    setShowClearNotification(true);
    setTimeout(() => setShowClearNotification(false), 3000);
  };

  return (
    <div className={`app-container${sensitiveMode ? ' sensitive-mode-active' : ''}`}>
      {!privacyAcknowledged && <PrivacyModal onAcknowledge={handlePrivacyAck} />}

      <header className="header">
        <div className="header-logo">
          <span>🔍</span>
          <h1>DealLens</h1>
        </div>
        <div className="header-privacy-badge">
          <span>🔒</span>
          <span>Zero upload — browser only</span>
          <span className="header-privacy-tooltip">
            All data is processed in this browser tab only. No servers, no uploads.
            Closing the tab permanently destroys all data.
          </span>
        </div>
        <div className="header-meta">
          {config && (
            <>
              <span className="header-badge">{BENCHMARKS[config.businessType]?.label}</span>
              <button
                className={`header-btn sensitive-btn${sensitiveMode ? ' active' : ''}`}
                onClick={() => setSensitiveMode((m) => !m)}
                title="Block printing and screenshots"
              >
                {sensitiveMode ? '🔒 Sensitive On' : '👁 Sensitive Mode'}
              </button>
              <button className="header-btn" onClick={handleReset}>Clear & Reset</button>
            </>
          )}
        </div>
      </header>

      {showClearNotification && (
        <div className="clear-notification">Session cleared. All data has been removed from memory.</div>
      )}

      {!config ? (
        <Onboarding onComplete={handleComplete} />
      ) : (
        <Dashboard
          config={config}
          onReset={handleReset}
          qualitative={qualitative}
          setQualitative={setQualitative}
        />
      )}

      <style>{`
        @media print {
          .sensitive-mode-active .tab-content { visibility: hidden; }
          .sensitive-mode-active .tab-content::before {
            visibility: visible;
            display: block;
            content: "Sensitive Mode is active — printing is disabled.";
            font-size: 16px;
            color: #0f172a;
            text-align: center;
            margin-top: 120px;
          }
        }
      `}</style>
    </div>
  );
}
