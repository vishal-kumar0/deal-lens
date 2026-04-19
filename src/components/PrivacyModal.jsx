export default function PrivacyModal({ onAcknowledge }) {
  return (
    <div className="privacy-overlay">
      <div className="privacy-card">
        <div className="privacy-icon">🔒</div>
        <h2 className="privacy-title">Your data never leaves this device</h2>
        <p className="privacy-subtitle">Before you upload any sensitive financials, here's exactly what this tool does and doesn't do.</p>
        <ul className="privacy-bullets">
          <li className="privacy-bullet">
            <span className="privacy-bullet-icon">✓</span>
            <span>All processing happens in your browser — no servers, no uploads, no cloud storage</span>
          </li>
          <li className="privacy-bullet">
            <span className="privacy-bullet-icon">✓</span>
            <span>Closing this tab permanently destroys all uploaded data from memory</span>
          </li>
          <li className="privacy-bullet">
            <span className="privacy-bullet-icon">ℹ</span>
            <span>One external request is made: loading the Inter font from Google Fonts. This sends your IP address only — no deal data is transmitted</span>
          </li>
        </ul>
        <button className="btn-primary privacy-ack-btn" onClick={onAcknowledge}>
          Acknowledged — start analysis
        </button>
      </div>
    </div>
  );
}
