import { useState, useCallback } from 'react';
import BENCHMARKS, { REVENUE_MODELS, DEAL_TYPES, getBenchmark } from '../modules/benchmarks';
import { parseCSV, autoMapColumns, transformData, transformSampleData, getMissingFields } from '../modules/dataIngestion';
import { generateSampleData } from '../modules/dataSimulation';

const STEPS = ['business_type', 'revenue_model', 'deal_type', 'upload', 'mapping'];

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({
    businessType: null,
    revenueModel: null,
    dealType: null,
  });
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [dragOver, setDragOver] = useState(false);
  const [useSample, setUseSample] = useState(false);

  const canNext = () => {
    if (step === 0) return config.businessType !== null;
    if (step === 1) return config.revenueModel !== null;
    if (step === 2) return config.dealType !== null;
    if (step === 3) return fileData !== null || useSample;
    if (step === 4) {
      const missing = getMissingFields(mapping);
      return missing.length === 0;
    }
    return false;
  };

  const handleNext = () => {
    if (step === 3 && useSample) {
      // Skip mapping for sample data
      const sampleRaw = generateSampleData();
      const data = transformSampleData(sampleRaw);
      onComplete({ ...config, data, hasNewCustomers: true });
      return;
    }
    if (step === 4) {
      const data = transformData(fileData.rawData, mapping);
      const hasNewCustomers = !!mapping.new_customers;
      onComplete({ ...config, data, hasNewCustomers });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleFile = useCallback(async (file) => {
    try {
      const result = await parseCSV(file);
      setFileData({ ...result, fileName: file.name });
      setMapping(result.mapping);
      setUseSample(false);
    } catch (err) {
      alert('Failed to parse CSV: ' + err.message);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleSample = () => {
    setUseSample(true);
    setFileData(null);
  };

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        {step === 0 && (
          <>
            <h2 className="onboarding-title">Business Type</h2>
            <p className="onboarding-subtitle">Select the target company's industry. This determines benchmarks and insight framing.</p>
            <div className="option-grid">
              {Object.entries(BENCHMARKS).map(([key, b]) => (
                <div
                  key={key}
                  className={`option-card ${config.businessType === key ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, businessType: key })}
                >
                  <div className="icon">{b.icon}</div>
                  <div className="label">{b.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="onboarding-title">Revenue Model</h2>
            <p className="onboarding-subtitle">How does the business generate revenue? This affects how we interpret customer and ARPU trends.</p>
            <div className="option-list">
              {Object.entries(REVENUE_MODELS).map(([key, rm]) => (
                <div
                  key={key}
                  className={`option-list-item ${config.revenueModel === key ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, revenueModel: key })}
                >
                  <div className="label">{rm.label}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h2 className="onboarding-title">Deal Type</h2>
            <p className="onboarding-subtitle">What lens should the analysis use? This shapes the Executive Summary language.</p>
            <div className="option-list">
              {Object.entries(DEAL_TYPES).map(([key, dt]) => (
                <div
                  key={key}
                  className={`option-list-item ${config.dealType === key ? 'selected' : ''}`}
                  onClick={() => setConfig({ ...config, dealType: key })}
                >
                  <div className="icon">{dt.icon}</div>
                  <div>
                    <div className="label">{dt.label}</div>
                    <div className="desc" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{dt.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="onboarding-title">Upload Data</h2>
            <p className="onboarding-subtitle">
              Upload a CSV with monthly data: Date, Revenue, Customers, COGS, OpEx.
              Optional: New Customers, Headcount, Marketing Spend.
            </p>
            {!fileData && !useSample && (
              <>
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('file-input').click()}
                >
                  <div className="icon">📄</div>
                  <div className="title">Drop CSV file here</div>
                  <div className="hint">or click to browse</div>
                  <input
                    id="file-input" type="file" accept=".csv"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                  />
                </div>
                <div className="upload-divider">or</div>
                <button className="btn-sample" onClick={handleSample}>
                  📊 Use Sample Data — "Growth with Emerging Pressure"
                </button>
              </>
            )}
            {fileData && (
              <div className="file-loaded">
                <div className="icon">✅</div>
                <div className="info">
                  <div className="name">{fileData.fileName}</div>
                  <div className="meta">{fileData.rowCount} rows • {fileData.headers.length} columns</div>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => { setFileData(null); setMapping({}); }}>
                  Change
                </button>
              </div>
            )}
            {useSample && (
              <div className="file-loaded">
                <div className="icon">📊</div>
                <div className="info">
                  <div className="name">Sample Data</div>
                  <div className="meta">24 months • Growth with Emerging Pressure</div>
                </div>
                <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                  onClick={() => setUseSample(false)}>
                  Change
                </button>
              </div>
            )}
          </>
        )}

        {step === 4 && fileData && (
          <>
            <h2 className="onboarding-title">Column Mapping</h2>
            <p className="onboarding-subtitle">
              Confirm how your CSV columns map to the required fields. We've auto-detected where possible.
            </p>
            <div className="mapping-grid">
              {['date', 'revenue', 'customers', 'cogs', 'opex', 'new_customers'].map((field) => (
                <div className="mapping-row" key={field}>
                  <div className="field-name">{field.replace('_', ' ')}</div>
                  <div className="arrow">→</div>
                  <select
                    value={mapping[field] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field]: e.target.value || undefined })}
                  >
                    <option value="">{field === 'new_customers' ? '(optional)' : '— select —'}</option>
                    {fileData.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <div className="status">{mapping[field] ? '✅' : field === 'new_customers' ? '➖' : '❌'}</div>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="btn-row">
          {step > 0 && <button className="btn-secondary" onClick={handleBack}>Back</button>}
          <button className="btn-primary" disabled={!canNext()} onClick={handleNext}>
            {step === 4 || (step === 3 && useSample) ? 'Launch Dashboard →' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
