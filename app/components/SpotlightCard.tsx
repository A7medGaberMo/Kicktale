"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { Fixture } from "@/app/hooks/useFixtures";
import { getPillarMeta } from "@/app/hooks/useFixtures";
import ReactMarkdown from "react-markdown";
import { CopyBlock } from "./SocialShare";

/** Strip raw markdown artifacts, quotes, and "Analysis:" prefixes from titles */
function sanitizeTitle(raw: string): string {
  if (!raw) return "";
  const t = raw
    .replace(/^\*\*([\s\S]*?)\*\*$/, "$1")
    .replace(/\*\*/g, "")
    .replace(/^Analysis:\s*/i, "")
    .replace(/^["']|["']$/g, "")
    .trim();
  return t || raw;
}

/** Clean content of leaked internal prompt metrics and formatting issues */
function sanitizeContent(raw: string): string {
  if (!raw) return "";
  return raw
    .replace(/^Analysis:\s*/i, "")
    .replace(/\b\d+\/100 score\b/gi, "")
    .replace(/\b\d+%\s*confidence(\s*level)?\b/gi, "")
    .replace(/\bconfidence\s*level\s*of\s*\d+%/gi, "")
    .replace(/\bModel confidence:\s*\d+%/gi, "")
    .replace(/\bwith\s+a\s+\*\*\d+%\s+confidence\b/gi, "")
    .replace(/,\s*,/g, ",")
    .replace(/\s{2,}/g, " ")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}

interface SpotlightCardProps {
  fixture: Fixture;
  activeIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onDotClick: (idx: number) => void;
  formatTime: (utc: string) => string;
  formatDate: (utc: string) => string;
}

export const SpotlightCard: React.FC<SpotlightCardProps> = React.memo(({
  fixture,
  activeIndex,
  onPrev,
  onNext,
  onDotClick,
  formatTime,
  formatDate,
}) => {
  const activeInsight = fixture.insights[activeIndex];
  const isLive = fixture.status === "LIVE" || fixture.status === "IN_PLAY" || fixture.status === "PAUSED";
  const isFinished = fixture.status === "FINISHED" || fixture.status === "FT" || fixture.status === "COMPLETED" || fixture.status === "AWARDED";
  const [imageErrorHome, setImageErrorHome] = useState(false);
  const [imageErrorAway, setImageErrorAway] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Reset image errors when fixture changes
  useEffect(() => {
    setImageErrorHome(false);
    setImageErrorAway(false);
  }, [fixture.id]);

  if (!activeInsight) {
    return (
      <div className="kt-empty">
        <p>No insights currently generated for this fixture.</p>
      </div>
    );
  }

  const pillarMeta = getPillarMeta(activeInsight.insight_type);
  const pillarCoverage = [...new Set(fixture.insights.map((i) => i.insight_type))];
  const totalInsights = fixture.insights.length;

  return (
    <section
      ref={cardRef}
      className="kt-spotlight anim-fade-up"
      aria-label={`Match spotlight: ${fixture.home_team_name || "Home"} vs ${fixture.away_team_name || "Away"}`}
    >
      {/* Spotlight Top Bar */}
      <div className="kt-spotlight-top">
        <div className="kt-spotlight-badge-group">
          <span className="kt-lead-badge">EDITORIAL LEAD</span>
          <span
            className="kt-pillar-pill"
            style={{
              borderColor: `${pillarMeta.color}40`,
              color: pillarMeta.color,
              background: `${pillarMeta.color}14`,
            }}
          >
            {pillarMeta.en}
          </span>
        </div>

        {totalInsights > 1 && (
          <div className="kt-spotlight-nav" aria-label="Story carousel navigation">
            <button
              className="kt-spotlight-nav-btn"
              onClick={onPrev}
              aria-label="Previous insight"
              title="Previous"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="kt-spotlight-counter">
              {activeIndex + 1} / {totalInsights}
            </span>
            <button
              className="kt-spotlight-nav-btn"
              onClick={onNext}
              aria-label="Next insight"
              title="Next"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Main Grid: Narrative + Visual Matchup */}
      <div className="kt-spotlight-grid">
        {/* Narrative Article */}
        <div className="kt-spotlight-narrative">
          <h2 className="kt-spotlight-title">{sanitizeTitle(activeInsight.title)}</h2>
          <div className="kt-spotlight-body">
            <ReactMarkdown>{sanitizeContent(activeInsight.content)}</ReactMarkdown>
          </div>

          <CopyBlock
            homeTeam={fixture.home_team_name || "Home"}
            awayTeam={fixture.away_team_name || "Away"}
            insightTitle={sanitizeTitle(activeInsight.title)}
            insightContent={sanitizeContent(activeInsight.content)}
            competition={fixture.competition_code}
            score={fixture.score_fulltime}
          />
        </div>

        {/* Visual Matchup Card & Pillar Switcher */}
        <div className="kt-spotlight-visual">
          <div className="kt-spotlight-matchup">
            {/* Home Team */}
            <div className="kt-spotlight-team">
              <div className="kt-crest-container">
                {fixture.home_team_crest && !imageErrorHome ? (
                  <Image
                    src={fixture.home_team_crest}
                    alt={fixture.home_team_name}
                    className="kt-crest-img"
                    width={40}
                    height={40}
                    unoptimized
                    onError={() => setImageErrorHome(true)}
                  />
                ) : (
                  <span className="kt-crest-fallback">
                    {fixture.home_team_name?.[0] || "H"}
                  </span>
                )}
              </div>
              <span className="kt-spotlight-team-name">{fixture.home_team_name || "Home"}</span>
            </div>

            {/* Score / VS Center Badge */}
            <div className="kt-spotlight-center-badge">
              {(isLive || isFinished) && fixture.score_fulltime ? (
                <span className="kt-spotlight-score-big">{fixture.score_fulltime}</span>
              ) : (
                <span className="kt-spotlight-vs">VS</span>
              )}
            </div>

            {/* Away Team */}
            <div className="kt-spotlight-team">
              <div className="kt-crest-container">
                {fixture.away_team_crest && !imageErrorAway ? (
                  <Image
                    src={fixture.away_team_crest}
                    alt={fixture.away_team_name}
                    className="kt-crest-img"
                    width={40}
                    height={40}
                    unoptimized
                    onError={() => setImageErrorAway(true)}
                  />
                ) : (
                  <span className="kt-crest-fallback">
                    {fixture.away_team_name?.[0] || "A"}
                  </span>
                )}
              </div>
              <span className="kt-spotlight-team-name">{fixture.away_team_name || "Away"}</span>
            </div>
          </div>

          {/* Match Metadata Chips */}
          <div className="kt-spotlight-meta">
            <span className="kt-meta-chip">{formatDate(fixture.utc_date)}</span>
            <span className="kt-meta-chip">{formatTime(fixture.utc_date)}</span>
            {fixture.stage && (
              <span className="kt-meta-chip">{fixture.stage.replace(/_/g, " ")}</span>
            )}
          </div>

          {/* Pillar Switcher Segmented Tabs */}
          {pillarCoverage.length > 1 && (
            <div className="kt-spotlight-pillars" role="tablist" aria-label="Insight perspectives">
              {pillarCoverage.map((pillar) => {
                const meta = getPillarMeta(pillar);
                const isActive = activeInsight.insight_type === pillar;
                return (
                  <button
                    key={pillar}
                    role="tab"
                    aria-selected={isActive}
                    className={`kt-pillar-tab-btn ${isActive ? "active" : ""}`}
                    onClick={() => {
                      const idx = fixture.insights.findIndex((i) => i.insight_type === pillar);
                      if (idx >= 0) onDotClick(idx);
                    }}
                  >
                    <span
                      className="kt-tab-indicator"
                      style={{ background: meta.color }}
                    />
                    <span>{meta.en}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

SpotlightCard.displayName = "SpotlightCard";

