"use client";

import React, { useState, useCallback } from "react";
import Image from "next/image";

interface HeaderProps {
  onOpenAdmin: () => void;
  onRefresh: () => void;
  selectedLeague?: string;
  onSelectLeague?: (league: string) => void;
}

const LEAGUE_OPTIONS = [
  { code: 'ALL', label: 'All Leagues' },
  { code: 'CL', label: 'Champions League' },
  { code: 'PL', label: 'Premier League' },
  { code: 'PD', label: 'La Liga' },
  { code: 'SA', label: 'Serie A' },
  { code: 'BL1', label: 'Bundesliga' },
  { code: 'WC', label: 'World Cup' },
];

export const Header: React.FC<HeaderProps> = ({
  onOpenAdmin,
  onRefresh,
  selectedLeague = 'ALL',
  onSelectLeague,
}) => {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    onRefresh();
    setTimeout(() => setRefreshing(false), 900);
  }, [onRefresh]);

  return (
    <header className="kt-app-header anim-fade-up">
      <nav className="kt-nav">
        <div className="kt-nav-brand">
          <Image
            src="/logo.png"
            alt="Kicktale"
            className="kt-nav-logo"
            width={36}
            height={36}
            priority
          />
          <div className="kt-nav-text-group">
            <span className="kt-nav-title">Kicktale</span>
            <span className="kt-nav-tagline">AI Match Intelligence &amp; Narratives</span>
          </div>
        </div>

        <div className="kt-nav-actions">
          <button
            className={`kt-icon-btn ${refreshing ? "spin" : ""}`}
            onClick={handleRefresh}
            aria-label="Refresh match data"
            title="Refresh"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.19" />
            </svg>
          </button>

          <button
            className="kt-icon-btn"
            onClick={onOpenAdmin}
            aria-label="Pipeline Controls"
            title="Pipeline Controls"
          >
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </button>
        </div>
      </nav>

      {onSelectLeague && (
        <div className="kt-league-strip" role="tablist" aria-label="Filter by competition">
          {LEAGUE_OPTIONS.map((league) => (
            <button
              key={league.code}
              role="tab"
              aria-selected={selectedLeague === league.code}
              className={`kt-league-pill ${selectedLeague === league.code ? "active" : ""}`}
              onClick={() => onSelectLeague(league.code)}
            >
              {league.label}
            </button>
          ))}
        </div>
      )}
    </header>
  );
};

