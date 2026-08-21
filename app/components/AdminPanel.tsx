"use client";

import React from "react";

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  isTriggering: boolean;
  isClearing?: boolean;
  triggerLog: string | null;
  onTrigger: (force: boolean) => Promise<void>;
  onClear?: () => Promise<void>;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  isTriggering,
  isClearing = false,
  triggerLog,
  onTrigger,
  onClear,
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
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        <div className="kt-admin-header-group">
          <h3 className="kt-admin-title">
            Kicktale Controls
          </h3>
          <p className="kt-admin-desc">
            Direct Football Intelligence Engine. Run the single-pass pipeline for 2-3 line match insights or clear the cache.
          </p>
        </div>

        <div className="kt-admin-action-group">
          <button
            className="kt-btn kt-btn-primary"
            disabled={isTriggering || isClearing}
            onClick={() => onTrigger(false)}
          >
            {isTriggering ? "Running Pipeline..." : "Run AI Pipeline"}
          </button>

          <button
            className="kt-btn kt-btn-secondary"
            disabled={isTriggering || isClearing}
            onClick={() => onTrigger(true)}
          >
            {isTriggering ? "Regenerating..." : "Force Regenerate (Bypass Cache)"}
          </button>

          {onClear && (
            <button
              className="kt-btn kt-btn-danger"
              disabled={isTriggering || isClearing}
              onClick={onClear}
            >
              {isClearing ? "Clearing Database..." : "Clear Database & Cache"}
            </button>
          )}
        </div>

        {triggerLog && (
          <div className="kt-admin-log" role="status">
            {triggerLog}
          </div>
        )}

        <button
          className="kt-btn kt-btn-ghost"
          onClick={onClose}
          style={{ marginTop: "auto" }}
        >
          Done
        </button>
      </div>
    </>
  );
};