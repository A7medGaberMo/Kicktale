"use client";

import React from "react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isTriggering: boolean;
  triggerLog: string | null;
  onTrigger: (force: boolean) => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen, onClose, isTriggering, triggerLog, onTrigger,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="kt-admin-backdrop" onClick={onClose} />
      <div className="kt-admin-panel">
        <button className="kt-admin-close" onClick={onClose} aria-label="Close">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 style={{ margin: 0, fontFamily: 'var(--font-outfit)', fontWeight: 800 }}>
          Pipeline Controls
        </h3>

        <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0 }}>
          Execute the full context retrieval, news synthesis, discovery evaluation, narrative generation, and database sync pipelines.
        </p>

        <button className="kt-btn" disabled={isTriggering} onClick={() => onTrigger(false)}>
          {isTriggering ? "Running..." : "Run Pipeline"}
        </button>

        <button className="kt-btn kt-btn-secondary" disabled={isTriggering} onClick={() => onTrigger(true)}>
          {isTriggering ? "Running..." : "Force Regenerate"}
        </button>

        {triggerLog && (
          <div className="kt-admin-log">{triggerLog}</div>
        )}

        <button className="kt-btn kt-btn-secondary" onClick={onClose} style={{ marginTop: "auto" }}>
          Close
        </button>
      </div>
    </>
  );
};