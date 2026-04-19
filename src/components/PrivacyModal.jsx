export default function PrivacyModal({ onAcknowledge }) {
  return (
    <div className="privacy-overlay">
      <div className="privacy-card">
        <div className="privacy-icon">🔒</div>
        <h2 className="privacy-title">Deal data stays in this browser</h2>
        <p className="privacy-subtitle">DealLens is a zero-upload tool. Client financials never leave your device — safe for NDA-protected materials.</p>
        <ul className="privacy-bullets">
          <li className="privacy-bullet">
            <span className="privacy-bullet-icon">✓</span>
            <span>All analysis runs locally in your browser — no servers, no uploads, no third-party storage</span>
          </li>
          <li className="privacy-bullet">
            <span className="privacy-bullet-icon">✓</span>
            <span>Closing this tab permanently destroys all data — nothing persists between sessions</span>
          </li>
          <li className="privacy-bullet">
            <span className="privacy-bullet-icon">ℹ</span>
            <span>One external request: Google Fonts for typography. Sends your IP address only — no deal data transmitted</span>
          </li>
        </ul>
        <button className="btn-primary privacy-ack-btn" onClick={onAcknowledge}>
          Understood — begin analysis
        </button>
      </div>
    </div>
  );
}
