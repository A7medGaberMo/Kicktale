import React from "react";
import AmbientGlow from "./AmbientGlow";

interface EmptyStateProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

function WarningIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function SatelliteIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--gold-bright)' }}>
      <path d="M2 6L8.5 2l6.5 4-6.5 4L2 6z" />
      <path d="M8.5 2v8" />
      <circle cx="8.5" cy="10" r="2.5" />
      <path d="M13 13.5l5-5" />
      <path d="M13 17l2-2" />
      <path d="M15 19l5-5" />
    </svg>
  );
}

export const EmptyState: React.FC<EmptyStateProps> = ({ loading, error, onRetry }) => {
  if (loading) {
    return (
      <main className="kt-container">
        <AmbientGlow />
        <div className="kt-empty anim-fade-up">
          <div className="kt-spinner" />
          <h2>Loading matches...</h2>
          <p>Fetching data from the intelligence pipeline.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="kt-container">
        <AmbientGlow />
        <div className="kt-empty anim-fade-up">
          <div className="kt-empty-icon" style={{ animation: 'none' }}>
            <WarningIcon />
          </div>
          <h2>Something went wrong</h2>
          <p className="kt-error-msg">{error}</p>
          <button className="kt-btn" onClick={onRetry}>Retry</button>
        </div>
      </main>
    );
  }

  return (
    <main className="kt-container">
      <AmbientGlow />
      <div className="kt-empty anim-fade-up">
        <div className="kt-empty-icon">
          <SatelliteIcon />
        </div>
        <h2>No matches found</h2>
        <p>Run the pipeline to fetch upcoming matches.</p>
        <button className="kt-btn" onClick={onRetry} style={{ marginTop: 8 }}>
          Bootstrap Pipeline
        </button>
      </div>
    </main>
  );
};