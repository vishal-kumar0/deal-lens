import { useState, useCallback, useRef } from 'react';
import BENCHMARKS from '../modules/benchmarks';
import {
  parseFile, transformData, transformSampleData, getMissingFields,
  detectFileType, parseCustomerPanel, parseCIM, autoMapCustomerPanel,
} from '../modules/dataIngestion';
import { generateSampleData, generateCustomerPanelData } from '../modules/dataSimulation';

const STEPS = ['business_type', 'upload', 'mapping', 'quality_report'];

const FILE_TYPE_LABELS = {
  pnl: 'Monthly P&L',
  customer_panel: 'Customer Panel',
  cim: 'CIM / PDF',
  unknown: 'Unknown',
};

const FILE_TYPE_COLORS = {
  pnl: 'detected-tag-blue',
  customer_panel: 'detected-tag-green',
  cim: 'detected-tag-muted',
  unknown: 'detected-tag-warn',
};

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
  const [config, setConfig] = useState({ businessType: null });
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [mapping, setMapping] = useState({});
  const [parseResult, setParseResult] = useState(null);
  const [cimResult, setCimResult] = useState(null);
  const [customerPanelData, setCustomerPanelData] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [useSample, setUseSample] = useState(false);
  const [globalError, setGlobalError] = useState(null);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef(null);

  const pnlFile = uploadedFiles.find((f) => f.detectedType === 'pnl');
  const cpFile = uploadedFiles.find((f) => f.detectedType === 'customer_panel');
  const cimFile = uploadedFiles.find((f) => f.detectedType === 'cim');
  const unknownFiles = uploadedFiles.filter((f) => f.detectedType === 'unknown');

  const canNext = () => {
    if (step === 0) return config.businessType !== null;
    if (step === 1) return (pnlFile && !pnlFile.error) || useSample;
    if (step === 2) return getMissingFields(mapping).length === 0;
    if (step === 3) return true;
    return false;
  };

  const handleFiles = useCallback(async (files) => {
    setGlobalError(null);
    const newEntries = [];
    for (const file of files) {
      const existing = uploadedFiles.find((f) => f.name === file.name);
      if (existing) continue;

      // Quick parse to get headers for type detection (PDFs skip this)
      const name = file.name.toLowerCase();
      if (name.endsWith('.pdf')) {
        newEntries.push({ id: Math.random(), file, name: file.name, detectedType: 'cim', headers: [], error: null, status: 'ready' });
        continue;
      }
      try {
        const parsed = await parseFile(file);
        const detectedType = detectFileType(file.name, parsed.headers);
        newEntries.push({
          id: Math.random(),
          file,
          name: file.name,
          detectedType,
          headers: parsed.headers,
          parsedRaw: parsed,
          error: null,
          status: 'ready',
        });
        if (detectedType === 'pnl') {
          setMapping(parsed.mapping);
        }
      } catch (err) {
        newEntries.push({ id: Math.random(), file, name: file.name, detectedType: 'unknown', headers: [], error: err.message, status: 'error' });
      }
    }
    setUploadedFiles((prev) => [...prev, ...newEntries]);
  }, [uploadedFiles]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) handleFiles(files);
    e.target.value = '';
  }, [handleFiles]);

  const removeFile = (id) => setUploadedFiles((prev) => prev.filter((f) => f.id !== id));

  const overrideType = (id, newType) => {
    setUploadedFiles((prev) => prev.map((f) => {
      if (f.id !== id) return f;
      if (newType === 'pnl' && f.parsedRaw) setMapping(f.parsedRaw.mapping);
      return { ...f, detectedType: newType };
    }));
  };

  const handleNext = async () => {
    if (step === 1 && useSample) {
      const sampleRaw = generateSampleData();
      const data = transformSampleData(sampleRaw);
      const cpRaw = generateCustomerPanelData();
      const customerPanelData = cpRaw.map((r) => ({
        date: new Date(2022, cpRaw.indexOf(r), 1),
        dateLabel: r.date,
        nrr: r.nrr,
        grr: r.grr,
        newCustomers: r.new_customers,
        churnedCustomers: r.churned_customers,
        activeCustomers: r.active_customers,
        expansionRevenue: r.expansion_revenue,
        contractionRevenue: r.contraction_revenue,
        mrr: r.mrr,
      }));
      onComplete({ ...config, data, hasNewCustomers: true, customerPanelData, cimText: null });
      return;
    }

    if (step === 1) {
      // Move to mapping step for P&L
      setStep(2);
      return;
    }

    if (step === 2) {
      setProcessing(true);
      try {
        // Transform P&L
        const result = transformData(pnlFile.parsedRaw.rawData, mapping);
        setParseResult(result);

        // Process customer panel if present
        if (cpFile) {
          try {
            const cp = await parseCustomerPanel(cpFile.file);
            setCustomerPanelData(cp.data);
          } catch {
            setCustomerPanelData(null);
          }
        }

        // Process CIM if present
        if (cimFile) {
          try {
            const cim = await parseCIM(cimFile.file);
            setCimResult(cim);
          } catch {
            setCimResult(null);
          }
        }

        setStep(3);
      } catch (err) {
        setGlobalError('Failed to process files: ' + err.message);
      } finally {
        setProcessing(false);
      }
      return;
    }

    if (step === 3) {
      onComplete({
        ...config,
        data: parseResult.data,
        hasNewCustomers: !!mapping.new_customers,
        customerPanelData: customerPanelData || null,
        cimText: cimResult?.text || null,
        cimPageCount: cimResult?.pageCount || null,
      });
      return;
    }

    setStep((s) => s + 1);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const handleSample = () => {
    setUseSample(true);
    setUploadedFiles([]);
    setGlobalError(null);
  };

  const isLaunchStep = step === 3 || (step === 1 && useSample);
  const btnLabel = isLaunchStep ? 'Launch Dashboard →' : step === 2 ? (processing ? 'Processing…' : 'Review Data →') : 'Continue';

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="onboarding-progress">
          {STEPS.map((_, i) => (
            <div key={i} className={`progress-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        {/* Step 0 — Sector */}
        {step === 0 && (
          <>
            <h2 className="onboarding-title">Select Sector</h2>
            <p className="onboarding-subtitle">Choose the target company's industry. This sets the benchmark thresholds used throughout the analysis.</p>
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

        {/* Step 1 — Multi-file Upload */}
        {step === 1 && (
          <>
            <h2 className="onboarding-title">Upload Deal Files</h2>
            <p className="onboarding-subtitle">
              Drop one or more files — Monthly P&L (CSV/Excel), Customer Panel (CSV), or CIM (PDF).
              File types are detected automatically.
            </p>

            {!useSample && (
              <>
                <div
                  className={`upload-zone ${dragOver ? 'drag-over' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <div className="icon">📂</div>
                  <div className="title">Drop files here or click to browse</div>
                  <div className="hint">Monthly P&L · Customer Panel · CIM &nbsp;·&nbsp; CSV, XLSX, PDF</div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.pdf"
                    multiple
                    style={{ display: 'none' }}
                    onChange={handleFileInput}
                  />
                </div>

                {globalError && <div className="parse-error-banner">⚠ {globalError}</div>}

                {uploadedFiles.length > 0 && (
                  <div className="multi-file-list">
                    {uploadedFiles.map((f) => (
                      <div key={f.id} className={`multi-file-row ${f.error ? 'has-error' : ''}`}>
                        <span className="mf-icon">{f.detectedType === 'cim' ? '📋' : '📄'}</span>
                        <span className="mf-name" title={f.name}>{f.name}</span>
                        <select
                          className={`mf-type-select ${FILE_TYPE_COLORS[f.detectedType]}`}
                          value={f.detectedType}
                          onChange={(e) => overrideType(f.id, e.target.value)}
                        >
                          <option value="pnl">Monthly P&L</option>
                          <option value="customer_panel">Customer Panel</option>
                          <option value="cim">CIM / PDF</option>
                          <option value="unknown">Unknown</option>
                        </select>
                        {f.error
                          ? <span className="mf-status mf-error" title={f.error}>⚠</span>
                          : <span className="mf-status mf-ok">✓</span>
                        }
                        <button className="mf-remove" onClick={() => removeFile(f.id)}>✕</button>
                      </div>
                    ))}
                  </div>
                )}

                {unknownFiles.length > 0 && (
                  <div className="parse-error-banner">
                    ⚠ {unknownFiles.length} file(s) could not be classified — use the dropdown to assign a type manually.
                  </div>
                )}

                {!pnlFile && uploadedFiles.length === 0 && (
                  <>
                    <div className="upload-divider">or use the sample deal</div>
                    <div className="sample-deal-card">
                      <div className="sample-deal-header">
                        <span className="sample-deal-icon">🥐</span>
                        <div>
                          <div className="sample-deal-name">Crust &amp; Crumb Artisan Bakery</div>
                          <div className="sample-deal-desc">2-location bakery + wholesale channel · 36 months Jan 2022–Dec 2024 · Margin compression &amp; recovery story</div>
                        </div>
                      </div>
                      <button className="btn-sample" onClick={handleSample}>
                        Load sample deal (P&amp;L + Customer Panel pre-loaded)
                      </button>
                      <div className="sample-download-row">
                        <span className="sample-download-label">Or upload manually:</span>
                        <a className="sample-download-link" href="/samples/crust_and_crumb_pnl.csv" download>↓ P&amp;L CSV</a>
                        <a className="sample-download-link" href="/samples/crust_and_crumb_customer_panel.csv" download>↓ Customer Panel CSV</a>
                      </div>
                    </div>
                  </>
                )}

                {!pnlFile && uploadedFiles.length > 0 && (
                  <div className="dq-warning" style={{ marginTop: 12 }}>
                    ⚠ No Monthly P&L file detected — please upload or reclassify a file as "Monthly P&L" to continue.
                  </div>
                )}
              </>
            )}

            {useSample && (
              <>
                <div className="file-loaded">
                  <div className="icon">🥐</div>
                  <div className="info">
                    <div className="name">Crust &amp; Crumb Artisan Bakery</div>
                    <div className="meta">36 months · Monthly P&amp;L + Customer Panel pre-loaded</div>
                  </div>
                  <button className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}
                    onClick={() => setUseSample(false)}>
                    Change
                  </button>
                </div>
                <div className="upload-divider">or</div>
                <button className="btn-sample" onClick={() => fileInputRef.current?.click()}>
                  📂 Upload your own files instead
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.pdf"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => { setUseSample(false); handleFileInput(e); }}
                />
              </>
            )}
          </>
        )}

        {/* Step 2 — Column Mapping (P&L only) */}
        {step === 2 && pnlFile && (
          <>
            <h2 className="onboarding-title">Column Mapping — P&L</h2>
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
                    {pnlFile.headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  <div className="status">{mapping[field] ? '✅' : field === 'new_customers' ? '➖' : '❌'}</div>
                </div>
              ))}
            </div>
            {cpFile && (
              <div className="cp-notice">
                <span>📊</span>
                <span>Customer Panel file detected — will be auto-mapped and merged automatically.</span>
              </div>
            )}
            {cimFile && (
              <div className="cp-notice">
                <span>📋</span>
                <span>CIM detected — text will be extracted and surfaced in Executive Summary.</span>
              </div>
            )}
            {processing && <div className="parse-error-banner" style={{ background: 'none', color: 'var(--text-muted)' }}>⏳ Processing files…</div>}
          </>
        )}

        {/* Step 3 — Quality Report */}
        {step === 3 && parseResult && (
          <>
            <h2 className="onboarding-title">Data Quality Report</h2>
            <p className="onboarding-subtitle">Review before launching the dashboard. Analysis proceeds regardless of warnings.</p>

            <div className="dq-stat-row">
              <div className="dq-stat">
                <div className="dq-stat-value" style={{ color: parseResult.successCount === parseResult.totalRows ? 'var(--green)' : 'var(--amber)' }}>
                  {parseResult.successCount} / {parseResult.totalRows}
                </div>
                <div className="dq-stat-label">P&L rows parsed</div>
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

            {customerPanelData && customerPanelData.length > 0 && (
              <div className="dq-source-badge dq-source-cp">
                <span>📊</span>
                <span>Customer Panel loaded — {customerPanelData.length} months of cohort data</span>
                {customerPanelData[0]?.nrr ? <span className="dq-cp-metrics"> · NRR, GRR available</span> : null}
                {customerPanelData[0]?.churnedCustomers !== undefined ? <span className="dq-cp-metrics"> · Churn counts available</span> : null}
              </div>
            )}

            {cimResult && (
              <div className="dq-source-badge dq-source-cim">
                <span>📋</span>
                <span>CIM extracted — {cimResult.pageCount} pages · {Math.round(cimResult.text.length / 1000)}K chars</span>
              </div>
            )}

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
                      <tr><td colSpan={4} style={{ color: 'var(--text-muted)' }}>…and {parseResult.parseErrors.length - 10} more</td></tr>
                    )}
                  </tbody>
                </table>
              </details>
            )}
          </>
        )}

        <div className="btn-row">
          {step > 0 && <button className="btn-secondary" onClick={handleBack}>Back</button>}
          <button className="btn-primary" disabled={!canNext() || processing} onClick={handleNext}>
            {btnLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
