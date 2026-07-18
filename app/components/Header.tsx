"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";

interface HeaderProps {
  onOpenAdmin: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAdmin, onRefresh }) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 1200);
  }, [onRefresh]);

  return (
    <header className="kt-app-header anim-fade-up">
      <nav className="kt-nav">
        <div className="kt-nav-brand">
          <Image src="/logo.png" alt="Kicktale" className="kt-nav-logo" width={40} height={40} priority />
          <span className="kt-nav-title">Kicktale</span>
          <span className="kt-nav-tagline"> &mdash; Every match tells a story.</span>
        </div>
        <div className="kt-nav-actions">
          <button
            className={`kt-icon-btn ${refreshing ? 'spin' : ''}`}
            onClick={handleRefresh}
            aria-label="Refresh"
            title="Refresh"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
            </svg>
          </button>
          <button className="kt-icon-btn" onClick={onOpenAdmin} aria-label="Admin panel" title="Pipeline Controls">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </nav>
    </header>
  );
};
