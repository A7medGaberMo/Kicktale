import React from "react";
import AmbientGlow from "./AmbientGlow";

interface EmptyStateProps {
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ loading, error, onRetry }) => {
  if (loading) {
    return (
      <main className="kt-container">
        <AmbientGlow />
        <div className="kt-empty anim-fade-up">
          <div className="kt-spinner" />
          <h2>Analyzing Match Intel...</h2>
          <p>Scouting fixtures, compiling team form, and synthesizing tactical narratives.</p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="kt-container">
        <AmbientGlow />
        <div className="kt-empty anim-fade-up">
          <div className="kt-empty-icon" style={{ color: "var(--status-live)" }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </div>
          <h2>Unable to Load Intel</h2>
          <p className="kt-error-msg">{error}</p>
          <button className="kt-btn" onClick={onRetry}>
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="kt-container">
      <AmbientGlow />
      <div className="kt-empty anim-fade-up">
        <div className="kt-empty-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
            <path d="M2 12h20" />
          </svg>
        </div>
        <h2>No Matches in Horizon</h2>
        <p>No upcoming matches with published insights are currently scheduled.</p>
        <button className="kt-btn" onClick={onRetry} style={{ marginTop: 6 }}>
          Run Intelligence Pipeline
        </button>
      </div>
    </main>
  );
};