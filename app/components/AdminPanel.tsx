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
  isOpen,
  onClose,
  isTriggering,
  triggerLog,
  onTrigger,
}) => {
  if (!isOpen) return null;

  return (
    <>
      <div className="kt-admin-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="kt-admin-panel" role="dialog" aria-modal="true" aria-label="Pipeline Controls">
        <button
          className="kt-admin-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>
          Pipeline Controls
        </h3>

        <p style={{ fontSize: "0.78rem", color: "var(--text-3)", margin: 0, lineHeight: 1.5 }}>
          Run the multi-agent intelligence pipeline to discover narratives, analyze tactical form, and evaluate match insights.
        </p>

        <button
          className="kt-btn"
          disabled={isTriggering}
          onClick={() => onTrigger(false)}
        >
          {isTriggering ? "Running Pipeline..." : "Run Pipeline"}
        </button>

        <button
          className="kt-btn kt-btn-secondary"
          disabled={isTriggering}
          onClick={() => onTrigger(true)}
        >
          {isTriggering ? "Regenerating..." : "Force Regenerate"}
        </button>

        {triggerLog && (
          <div className="kt-admin-log" role="status">
            {triggerLog}
          </div>
        )}

        <button
          className="kt-btn kt-btn-secondary"
          onClick={onClose}
          style={{ marginTop: "auto" }}
        >
          Close
        </button>
      </div>
    </>
  );
};