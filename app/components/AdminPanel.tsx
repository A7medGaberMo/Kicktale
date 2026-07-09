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
          ✕
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