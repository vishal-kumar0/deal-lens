import { useState, useCallback } from 'react';
import BENCHMARKS, { REVENUE_MODELS, DEAL_TYPES } from '../modules/benchmarks';
import { parseFile, transformData, transformSampleData, getMissingFields } from '../modules/dataIngestion';
import { generateSampleData } from '../modules/dataSimulation';

const STEPS = ['business_type', 'revenue_model', 'deal_type', 'upload', 'mapping', 'quality_report'];

function columnCompleteness(data) {
  return ['revenue', 'customers', 'cogs', 'opex'].map((field) => {
    const nonZero = data.filter((r) => r[field] > 0).length;
    const pct = data.length > 0 ? Math.round((nonZero / data.length) * 100) : 0;
    return { field, pct, status: pct >= 90 ? 'green' : pct >= 70 ? 'amber' : 'red' };
  });
}

function outlierFlags(data) {
  const flags = [];
  for (const field of ['revenue', 'customers', 'cogs', 'opex']) {
    const vals = data.map((r) => r[field]).filter((v) => v > 0);
    if (vals.length < 4) continue;
    const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
    const stdev = Math.sqrt(vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length);
    if (stdev === 0) continue;
    const outliers = data.filter((r) => Math.abs(r[field] - mean) > 3 * stdev);
    if (outliers.length > 0) flags.push({ field, rows: outliers.map((r) => r.dateLabel) });
  }
  return flags;
}

export default function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState({ businessType: null, revenueModel: null, dealType: null });
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [parseResult, setParseResult] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [useSample, setUseSample] = useState(false);
  const [parseError, setParseError] = useState(null);

  const canNext = () => {
    if (step === 0) return config.businessType !== null;
    if (step === 1) return config.revenueModel !== null;
    if (step === 2) return config.dealType !== null;
    if (step === 3) return fileData !== null || useSample;
    if (step === 4) return getMissingFields(mapping).length === 0;
    if (step === 5) return true;
    return false;
  };

  const handleNext = () => {
    if (step === 3 && useSample) {
      const sampleRaw = generateSampleData();
      const data = transformSampleData(sampleRaw);
      onComplete({ ...config, data, hasNewCustomers: true });
      return;
    }
    if (step === 4) {
      const result = transformData(fileData.rawData, mapping);
      setParseResult(result);
      setStep(5);
      return;
    }
    if (step === 5) {
      onComplete({ ...config, data: parseResult.data, hasNewCustomers: !!mapping.new_customers });
      return;
    }
    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleFile = useCallback(async (file) => {
    setParseError(null);
    try {
      const result = await parseFile(file);
      setFileData({ ...result, fileName: file.name });
      setMapping(result.mapping);
      setUseSample(false);
    } catch (err) {
      setParseError(err.message);
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
    setParseError(null);
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
              Upload a CSV or Excel file with monthly data: Date, Revenue, Customers, COGS, OpEx.
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
                  <div className="title">Drop CSV or Excel file here</div>
                  <div className="hint">or click to browse · .csv, .xlsx, .xls</div>
                  <input
                    id="file-input" type="file" accept=".csv,.xlsx,.xls"
                    style={{ display: 'none' }}
                    onChange={(e) => e.target.files[0] && handleFile(e.target.files[0])}
                  />
                </div>
                {parseError && (
                  <div className="parse-error-banner">⚠ {parseError}</div>
                )}
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
                  <div className="meta">{fileData.rowCount} rows · {fileData.headers.length} columns</div>
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
                  <div className="meta">24 months · Growth with Emerging Pressure</div>
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
              Confirm how your columns map to the required fields. We've auto-detected where possible.
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

        {step === 5 && parseResult && (
          <>
            <h2 className="onboarding-title">Data Quality Report</h2>
            <p className="onboarding-subtitle">Review before launching the dashboard. Analysis is available regardless of warnings.</p>

            <div className="dq-stat-row">
              <div className="dq-stat">
                <div className="dq-stat-value" style={{ color: parseResult.successCount === parseResult.totalRows ? 'var(--green)' : 'var(--amber)' }}>
                  {parseResult.successCount} / {parseResult.totalRows}
                </div>
                <div className="dq-stat-label">Rows parsed</div>
              </div>
              <div className="dq-stat">
                <div className="dq-stat-value">{parseResult.data[0]?.dateLabel} → {parseResult.data[parseResult.data.length - 1]?.dateLabel}</div>
                <div className="dq-stat-label">Date range</div>
              </div>
              <div className="dq-stat">
                <div className="dq-stat-value" style={{ color: 'var(--green)' }}>
                  {Object.keys(mapping).filter((k) => ['date','revenue','customers','cogs','opex'].includes(k)).length} / 5
                </div>
                <div className="dq-stat-label">Required columns</div>
              </div>
            </div>

            {parseResult.successCount < 12 && (
              <div className="dq-warning">
                ⚠ Only {parseResult.successCount} months parsed — LTM analysis requires 12 months minimum. YoY comparisons require 24.
              </div>
            )}

            <div className="dq-section-title">Column Completeness</div>
            <div className="dq-completeness">
              {columnCompleteness(parseResult.data).map(({ field, pct, status }) => (
                <div className="dq-comp-row" key={field}>
                  <span className="dq-comp-field">{field}</span>
                  <div className="dq-comp-bar-wrap">
                    <div className="dq-comp-bar" style={{ width: `${pct}%`, background: `var(--${status})` }} />
                  </div>
                  <span className={`dq-badge dq-badge-${status}`}>{pct}%</span>
                </div>
              ))}
            </div>

            {outlierFlags(parseResult.data).length > 0 && (
              <>
                <div className="dq-section-title">Outlier Flags <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(informational)</span></div>
                {outlierFlags(parseResult.data).map(({ field, rows }) => (
                  <div className="dq-outlier" key={field}>
                    {rows.length} {field} value{rows.length > 1 ? 's' : ''} &gt;3σ from mean: {rows.join(', ')}
                  </div>
                ))}
              </>
            )}

            {parseResult.parseErrors.length > 0 && (
              <details className="dq-errors">
                <summary>{parseResult.parseErrors.length} rows had parse issues and were excluded or treated as 0</summary>
                <table className="dq-error-table">
                  <thead><tr><th>Row</th><th>Field</th><th>Raw Value</th><th>Reason</th></tr></thead>
                  <tbody>
                    {parseResult.parseErrors.slice(0, 10).map((e, i) => (
                      <tr key={i}><td>{e.rowIndex}</td><td>{e.field}</td><td>{e.rawValue}</td><td>{e.reason}</td></tr>
                    ))}
                    {parseResult.parseErrors.length > 10 && (
                      <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>...and {parseResult.parseErrors.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </details>
            )}
          </>
        )}

        <div className="btn-row">
          {step > 0 && <button className="btn-secondary" onClick={handleBack}>Back</button>}
          <button className="btn-primary" disabled={!canNext()} onClick={handleNext}>
            {step === 5 || (step === 3 && useSample) ? 'Launch Dashboard →' : step === 4 ? 'Review Data →' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}
