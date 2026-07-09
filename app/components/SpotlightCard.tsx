"use client";

import React, { useEffect, useRef } from 'react';
import type { Fixture } from '@/app/hooks/useFixtures';
import { getPillarMeta } from '@/app/hooks/useFixtures';
import ReactMarkdown from 'react-markdown';
import { PillarIcon } from './PillarIcon';

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
        <div className="kt-spotlight-empty-icon">⚡</div>
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
              <PillarIcon type={activeInsight.insight_type} size={13} />
              {pillarMeta.en}
            </span>
            <span className="kt-spotlight-entity">{fixture.home_team_name || 'TBD'} vs {fixture.away_team_name || 'TBD'}</span>
          </div>
          <h2 className="kt-spotlight-title">{activeInsight.title}</h2>
          <div className="kt-spotlight-body">
            <ReactMarkdown>{activeInsight.content}</ReactMarkdown>
          </div>
        </div>

        <div className="kt-spotlight-visual">
          <div className="kt-spotlight-matchup">
            <div className="kt-spotlight-team">
              <div className={`kt-spotlight-crest-box home`}>
                {fixture.home_team_crest ? (
                  <img src={fixture.home_team_crest} alt={fixture.home_team_name} className="kt-spotlight-crest-img"
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
                  <img src={fixture.away_team_crest} alt={fixture.away_team_name} className="kt-spotlight-crest-img"
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
              <span>📅</span>
              <span>{formatDate(fixture.utc_date)}</span>
            </div>
            <div className="kt-spotlight-meta-item">
              <span>⏰</span>
              <span>{formatTime(fixture.utc_date)}</span>
            </div>
            {fixture.stage && (
              <div className="kt-spotlight-meta-item">
                <span>🏆</span>
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
                    style={{ '--pillar-color': meta.color } as React.CSSProperties}
                    onClick={() => {
                      const idx = fixture.insights.findIndex(i => i.insight_type === pillar);
                      if (idx >= 0) onDotClick(idx);
                    }}
                    title={meta.en}>
                    <PillarIcon type={pillar} size={14} />
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
    </div>
  );
});

SpotlightCard.displayName = "SpotlightCard";