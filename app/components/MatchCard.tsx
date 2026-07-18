"use client";

import React, { useRef, useCallback } from 'react';
import Image from 'next/image';
import type { Fixture } from '@/app/hooks/useFixtures';
import { getPillarMeta } from '@/app/hooks/useFixtures';

function sanitizeTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^\*\*([\s\S]*?)\*\*$/, '$1')
    .replace(/\*\*/g, '')
    .replace(/^Analysis:\s*/i, '')
    .trim() || raw;
}

interface MatchCardProps {
  fixture: Fixture;
  formatTime: (utc: string) => string;
  formatDate: (utc: string) => string;
}

export const MatchCard: React.FC<MatchCardProps> = React.memo(({
  fixture, formatTime, formatDate,
}) => {
  const topInsight = fixture.insights[0];
  const isLive = fixture.status === 'LIVE' || fixture.status === 'IN_PLAY' || fixture.status === 'PAUSED';
  const isFinished = fixture.status === 'FINISHED' || fixture.status === 'FT' || fixture.status === 'COMPLETED' || fixture.status === 'AWARDED';
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    card.style.transform = `perspective(800px) rotateY(${x * 5}deg) rotateX(${-y * 5}deg) translateY(-3px)`;
  }, []);

  const handleMouseLeave = useCallback(() => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) translateY(0px)';
  }, []);

  const displayDate = formatDate(fixture.utc_date);
  const displayTime = formatTime(fixture.utc_date);

  return (
    <article ref={cardRef} className="kt-match"
      onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave}>
      <div className="kt-match-header">
        <span className="kt-match-stage">
          {fixture.stage ? fixture.stage.replace(/_/g, " ") : ""}
        </span>
        {isLive ? (
          <span className="kt-match-live">
            <span className="kt-match-live-dot" />
            LIVE
          </span>
        ) : isFinished ? (
          <span className="kt-match-ft">FT</span>
        ) : (
          <span className="kt-match-time">{displayTime}</span>
        )}
      </div>

      <div className="kt-match-teams">
        <div className="kt-match-team">
          <div className="kt-match-crest-wrap home">
            {fixture.home_team_crest ? (
              <Image src={fixture.home_team_crest} alt={fixture.home_team_name} className="kt-match-crest" width={46} height={46} unoptimized
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="kt-match-crest-fallback">{fixture.home_team_name?.[0] || '?'}</div>
            )}
          </div>
          <span className="kt-match-team-name">{fixture.home_team_name || 'TBD'}</span>
        </div>

        <div>
          {(isLive || isFinished) && fixture.score_fulltime ? (
            <span className="kt-match-score">{fixture.score_fulltime}</span>
          ) : (
            <span className="kt-match-vs">VS</span>
          )}
        </div>

        <div className="kt-match-team">
          <div className="kt-match-crest-wrap away">
            {fixture.away_team_crest ? (
              <Image src={fixture.away_team_crest} alt={fixture.away_team_name} className="kt-match-crest" width={46} height={46} unoptimized
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            ) : (
              <div className="kt-match-crest-fallback">{fixture.away_team_name?.[0] || '?'}</div>
            )}
          </div>
          <span className="kt-match-team-name">{fixture.away_team_name || 'TBD'}</span>
        </div>
      </div>

      <div className="kt-match-date">{displayDate}</div>

      {topInsight && (
        <div className="kt-match-snippet">
          <h4 className="kt-match-snippet-title">{sanitizeTitle(topInsight.title)}</h4>
        </div>
      )}

      <div className="kt-match-footer">
        {fixture.insights.slice(0, 4).map((ins, idx) => {
          const meta = getPillarMeta(ins.insight_type);
          return (
            <span
              key={idx}
              className="kt-match-pillar"
              style={{
                color: meta.color,
                borderColor: `${meta.color}25`,
                background: `${meta.color}10`
              }}
              title={meta.en}
            >
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                background: meta.color, display: 'inline-block'
              }} />
            </span>
          );
        })}
        {fixture.insights.length > 4 && (
          <span className="kt-match-pillar-extra">
            +{fixture.insights.length - 4}
          </span>
        )}
      </div>
    </article>
  );
});

MatchCard.displayName = "MatchCard";
