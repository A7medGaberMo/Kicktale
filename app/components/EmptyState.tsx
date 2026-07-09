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
          <div className="kt-empty-icon" style={{ animation: 'none' }}>⚠️</div>
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
        <div className="kt-empty-icon">📡</div>
        <h2>No matches found</h2>
        <p>Run the pipeline to fetch upcoming matches.</p>
        <button className="kt-btn" onClick={onRetry} style={{ marginTop: 8 }}>
          Bootstrap Pipeline
        </button>
      </div>
    </main>
  );
};