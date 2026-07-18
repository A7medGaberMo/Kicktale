"use client";

import React, { useEffect, useRef } from 'react';
import Image from 'next/image';
import type { Fixture } from '@/app/hooks/useFixtures';
import { getPillarMeta } from '@/app/hooks/useFixtures';
import ReactMarkdown from 'react-markdown';
import { CopyBlock } from './SocialShare';

/** Strip raw markdown and "Analysis:" prefix from titles */
function sanitizeTitle(raw: string): string {
  if (!raw) return '';
  const t = raw
    .replace(/^\*\*([\s\S]*?)\*\*$/, '$1')   // Remove wrapping **
    .replace(/\*\*/g, '')                 // Remove any remaining **
    .replace(/^Analysis:\s*/i, '')        // Remove "Analysis:" prefix
    .trim();
  // If the title is just a team/player name with no context, keep it as-is
  return t || raw;
}

/** Clean content of leaked internal metrics and formatting issues */
function sanitizeContent(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^Analysis:\s*/i, '')                        // Remove "Analysis:" prefix
    .replace(/\b\d+\/100 score\b/gi, '')                  // Remove "50/100 score"
    .replace(/\b\d+%\s*confidence(\s*level)?\b/gi, '')    // Remove "90% confidence level"
    .replace(/\bconfidence\s*level\s*of\s*\d+%/gi, '')     // Remove "confidence level of 90%"
    .replace(/\bModel confidence:\s*\d+%/gi, '')           // Remove "Model confidence: 62%"
    .replace(/\bwith\s+a\s+\*\*\d+%\s+confidence\b/gi, '') // Remove "with a **90% confidence"
    .replace(/,\s*,/g, ',')                                // Fix double commas from removals
    .replace(/\s{2,}/g, ' ')                               // Collapse multiple spaces
    .replace(/\n\s*\n\s*\n/g, '\n\n')                      // Max 2 consecutive newlines
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
  fixture, activeIndex, onPrev, onNext, onDotClick, formatTime, formatDate
}) => {
  const activeInsight = fixture.insights[activeIndex];
  const isLive = fixture.status === 'LIVE' || fixture.status === 'IN_PLAY' || fixture.status === 'PAUSED';
  const isFinished = fixture.status === 'FINISHED' || fixture.status === 'FT' || fixture.status === 'COMPLETED' || fixture.status === 'AWARDED';
  const prevIndexRef = useRef(activeIndex);
  const [slideDir, setSlideDir] = React.useState<'left' | 'right'>('right');
  const [animKey, setAnimKey] = React.useState(0);

  useEffect(() => {
    if (activeIndex > prevIndexRef.current) setSlideDir('right');
    else if (activeIndex < prevIndexRef.current) setSlideDir('left');
    prevIndexRef.current = activeIndex;
    setAnimKey(k => k + 1);
  }, [activeIndex]);

  if (!activeInsight) {
    return (
      <div className="kt-spotlight-empty">
        <div className="kt-spotlight-empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--gold-bright)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        </div>
        <p className="kt-spotlight-empty-text">AI agents are analyzing this match...</p>
      </div>
    );
  }

  const pillarMeta = getPillarMeta(activeInsight.insight_type);
  const pillarCoverage = [...new Set(fixture.insights.map(i => i.insight_type))];

  return (
    <div className="kt-spotlight anim-fade-up" role="region" aria-label={`Match spotlight: ${fixture.home_team_name || 'TBD'} vs ${fixture.away_team_name || 'TBD'}`}>
      <div className="kt-spotlight-ambient" />

      <div className="kt-spotlight-top">
        <div className="kt-spotlight-badge">
          <span className="kt-spotlight-badge-star">★</span>
          <span className="kt-spotlight-badge-label">MATCH SPOTLIGHT</span>
        </div>
        {fixture.insights.length > 1 && (
          <div className="kt-spotlight-nav">
            <button className="kt-spotlight-nav-btn" onClick={onPrev} aria-label="Previous">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <span className="kt-spotlight-counter" aria-live="polite">
              {activeIndex + 1} / {fixture.insights.length}
            </span>
            <button className="kt-spotlight-nav-btn" onClick={onNext} aria-label="Next">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6" /></svg>
            </button>
          </div>
        )}
      </div>

      <div className="kt-spotlight-grid" key={animKey}
        style={{ animation: `slideIn${slideDir === 'right' ? 'Right' : 'Left'} 0.35s cubic-bezier(0.16, 1, 0.3, 1)` }}>

        <div className="kt-spotlight-narrative">
          <div className="kt-spotlight-type-row">
            <span className="kt-spotlight-pill"
              style={{
                borderColor: pillarMeta.color, color: pillarMeta.color,
                background: `${pillarMeta.color}15`
              }}>
              {pillarMeta.en}
            </span>
            <span className="kt-spotlight-entity">{fixture.home_team_name || 'TBD'} vs {fixture.away_team_name || 'TBD'}</span>
          </div>
          <h2 className="kt-spotlight-title">{sanitizeTitle(activeInsight.title)}</h2>
          <div className="kt-spotlight-body">
            <ReactMarkdown>{sanitizeContent(activeInsight.content)}</ReactMarkdown>
          </div>
        </div>

        <div className="kt-spotlight-visual">
          <div className="kt-spotlight-matchup">
            <div className="kt-spotlight-team">
              <div className={`kt-spotlight-crest-box home`}>
                {fixture.home_team_crest ? (
                  <Image src={fixture.home_team_crest} alt={fixture.home_team_name} className="kt-spotlight-crest-img" width={46} height={46} unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="kt-spotlight-crest-fallback">{fixture.home_team_name?.[0] || '?'}</div>
                )}
              </div>
              <span className="kt-spotlight-team-name">{fixture.home_team_name || 'TBD'}</span>
            </div>
            <div>
              {(isLive || isFinished) && fixture.score_fulltime ? (
                <span className="kt-spotlight-score-big">{fixture.score_fulltime}</span>
              ) : (
                <span className="kt-spotlight-vs">VS</span>
              )}
            </div>
            <div className="kt-spotlight-team">
              <div className={`kt-spotlight-crest-box away`}>
                {fixture.away_team_crest ? (
                  <Image src={fixture.away_team_crest} alt={fixture.away_team_name} className="kt-spotlight-crest-img" width={46} height={46} unoptimized
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                ) : (
                  <div className="kt-spotlight-crest-fallback">{fixture.away_team_name?.[0] || '?'}</div>
                )}
              </div>
              <span className="kt-spotlight-team-name">{fixture.away_team_name || 'TBD'}</span>
            </div>
          </div>

          <div className="kt-spotlight-meta">
            <div className="kt-spotlight-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>{formatDate(fixture.utc_date)}</span>
            </div>
            <div className="kt-spotlight-meta-item">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{formatTime(fixture.utc_date)}</span>
            </div>
            {fixture.stage && (
              <div className="kt-spotlight-meta-item">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
                  <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
                  <path d="M4 22h16" />
                  <path d="M10 22V2h4v20" />
                </svg>
                <span>{fixture.stage.replace(/_/g, ' ')}</span>
              </div>
            )}
          </div>

          {pillarCoverage.length > 1 && (
            <div className="kt-spotlight-pillars" role="tablist">
              {pillarCoverage.map(pillar => {
                const meta = getPillarMeta(pillar);
                const isActive = fixture.insights[activeIndex]?.insight_type === pillar;
                return (
                  <button
                    key={pillar}
                    role="tab"
                    aria-selected={isActive}
                    className={`kt-spotlight-pillar-btn ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      const idx = fixture.insights.findIndex(i => i.insight_type === pillar);
                      if (idx >= 0) onDotClick(idx);
                    }}
                    title={meta.en}>
                    <span style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: meta.color, display: 'inline-block'
                    }} />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {fixture.insights.length > 1 && (
        <div className="kt-spotlight-dots" role="tablist">
          {fixture.insights.map((insight, idx) => {
            const meta = getPillarMeta(insight.insight_type);
            return (
              <button
                key={idx}
                role="tab"
                aria-selected={idx === activeIndex}
                className={`kt-spotlight-dot ${idx === activeIndex ? 'active' : ''}`}
                style={idx === activeIndex ? { background: meta.color, boxShadow: `0 0 10px ${meta.color}88` } : {}}
                onClick={() => onDotClick(idx)}
                aria-label={meta.en}
              />
            );
          })}
        </div>
      )}

      {activeInsight && (
        <CopyBlock
          homeTeam={fixture.home_team_name || 'TBD'}
          awayTeam={fixture.away_team_name || 'TBD'}
          insightTitle={sanitizeTitle(activeInsight.title)}
          insightContent={sanitizeContent(activeInsight.content)}
          competition={fixture.competition_code}
          score={fixture.score_fulltime}
        />
      )}
    </div>
  );
});

SpotlightCard.displayName = "SpotlightCard";
