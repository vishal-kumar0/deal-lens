import { useState } from 'react';

const MOAT_OPTIONS = [
  { key: 'brand', label: 'Brand' },
  { key: 'network_effects', label: 'Network Effects' },
  { key: 'switching_costs', label: 'Switching Costs' },
  { key: 'ip_patents', label: 'IP & Patents' },
  { key: 'scale', label: 'Scale Advantages' },
  { key: 'none', label: 'None Identified' },
];

function CharCounter({ value, max }) {
  const len = value.length;
  const pct = len / max;
  const color = pct >= 0.95 ? 'var(--red)' : pct >= 0.8 ? 'var(--amber)' : 'var(--text-muted)';
  return <span className="char-counter" style={{ color }}>{len}/{max}</span>;
}

export default function QualitativeOverlay({ qualitative, setQualitative }) {
  const [open, setOpen] = useState(false);

  const set = (key, val) => setQualitative((q) => ({ ...q, [key]: val }));

  const handleMoat = (key) => {
    setQualitative((q) => {
      if (key === 'none') return { ...q, moats: q.moats.includes('none') ? [] : ['none'] };
      const filtered = q.moats.filter((m) => m !== 'none');
      return { ...q, moats: filtered.includes(key) ? filtered.filter((m) => m !== key) : [...filtered, key] };
    });
  };

  const hasInput = qualitative.managementRating !== null || qualitative.marketDynamics !== null || qualitative.moats.length > 0 || qualitative.keyRisks;

  return (
    <div className="section">
      <div className="section-title">
        Analyst Qualitative Assessment
        {hasInput && <span className="qual-filled-badge">filled</span>}
        <div className="line" />
        <button className="qual-toggle-btn" onClick={() => setOpen((o) => !o)}>
          {open ? '▲ Collapse' : '▼ Add notes'}
        </button>
      </div>

      {!open && (
        <p className="qual-hint">
          Rate management quality, market dynamics, competitive moats, and key risks.
          These feed directly into Key Signals and the Watch List.
        </p>
      )}

      {open && (
        <div className="qual-overlay">
          {/* Management Quality */}
          <div className="qual-section">
            <div className="qual-section-label">Management Quality</div>
            <div className="qual-row">
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    className={`star ${qualitative.managementRating !== null && n <= qualitative.managementRating ? 'active' : ''}`}
                    onClick={() => set('managementRating', qualitative.managementRating === n ? null : n)}
                  >★</button>
                ))}
                {qualitative.managementRating !== null && (
                  <span className="star-label" style={{ color: qualitative.managementRating < 3 ? 'var(--red)' : qualitative.managementRating < 4 ? 'var(--amber)' : 'var(--green)' }}>
                    {qualitative.managementRating}/5
                  </span>
                )}
              </div>
            </div>
            <div className="qual-textarea-wrap">
              <textarea
                className="qual-textarea"
                placeholder="Notes on team quality, tenure, succession, key-person risk..."
                maxLength={200}
                value={qualitative.managementNotes}
                onChange={(e) => set('managementNotes', e.target.value)}
              />
              <CharCounter value={qualitative.managementNotes} max={200} />
            </div>
          </div>

          {/* Market Dynamics */}
          <div className="qual-section">
            <div className="qual-section-label">Market Dynamics</div>
            <div className="market-btn-group">
              {['expanding', 'stable', 'contracting'].map((opt) => (
                <button
                  key={opt}
                  className={`market-btn ${qualitative.marketDynamics === opt ? 'active' : ''}`}
                  style={qualitative.marketDynamics === opt && opt === 'contracting' ? { background: 'var(--red-bg)', borderColor: 'var(--red-border)', color: 'var(--red)' } :
                    qualitative.marketDynamics === opt && opt === 'expanding' ? { background: 'var(--green-bg)', borderColor: 'var(--green-border)', color: 'var(--green)' } : {}}
                  onClick={() => set('marketDynamics', qualitative.marketDynamics === opt ? null : opt)}
                >
                  {opt.charAt(0).toUpperCase() + opt.slice(1)}
                </button>
              ))}
            </div>
            <div className="qual-textarea-wrap">
              <textarea
                className="qual-textarea"
                placeholder="Market growth drivers, headwinds, competitive dynamics..."
                maxLength={200}
                value={qualitative.marketNotes}
                onChange={(e) => set('marketNotes', e.target.value)}
              />
              <CharCounter value={qualitative.marketNotes} max={200} />
            </div>
          </div>

          {/* Competitive Moat */}
          <div className="qual-section">
            <div className="qual-section-label">Competitive Moat</div>
            <div className="moat-checkbox-grid">
              {MOAT_OPTIONS.map(({ key, label }) => (
                <label key={key} className={`moat-option ${qualitative.moats.includes(key) ? 'checked' : ''}`}>
                  <input
                    type="checkbox"
                    checked={qualitative.moats.includes(key)}
                    onChange={() => handleMoat(key)}
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="qual-textarea-wrap">
              <textarea
                className="qual-textarea"
                placeholder="Describe defensibility, durability of advantage..."
                maxLength={200}
                value={qualitative.moatNotes}
                onChange={(e) => set('moatNotes', e.target.value)}
              />
              <CharCounter value={qualitative.moatNotes} max={200} />
            </div>
          </div>

          {/* Key Risks */}
          <div className="qual-section">
            <div className="qual-section-label">Key Risks</div>
            <div className="qual-textarea-wrap">
              <textarea
                className="qual-textarea"
                placeholder="Macro, regulatory, competitive, execution, concentration risks..."
                maxLength={300}
                rows={3}
                value={qualitative.keyRisks}
                onChange={(e) => set('keyRisks', e.target.value)}
              />
              <CharCounter value={qualitative.keyRisks} max={300} />
            </div>
          </div>

          <p className="qual-footer-note">These notes are local to this session and are not saved or transmitted.</p>
        </div>
      )}
    </div>
  );
}
