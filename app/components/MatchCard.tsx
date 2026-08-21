"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import type { Fixture } from '@/app/hooks/useFixtures';
import { getPillarMeta, isLiveStatus, isFinishedStatus } from '@/app/hooks/useFixtures';

function sanitizeTitle(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/^\*\*([\s\S]*?)\*\*$/, '$1')
    .replace(/\*\*/g, '')
    .replace(/^Analysis:\s*/i, '')
    .replace(/^["']|["']$/g, '')
    .trim() || raw;
}

interface MatchCardProps {
  fixture: Fixture;
  formatTime: (utc: string) => string;
  formatDate: (utc: string) => string;
}

export const MatchCard: React.FC<MatchCardProps> = React.memo(({
  fixture,
  formatTime,
  formatDate,
}) => {
  const topInsight = fixture.insights[0];
  const isLive = isLiveStatus(fixture.status);
  const isFinished = isFinishedStatus(fixture.status);
  const [imageErrorHome, setImageErrorHome] = useState(false);
  const [imageErrorAway, setImageErrorAway] = useState(false);

  const displayDate = formatDate(fixture.utc_date);
  const displayTime = formatTime(fixture.utc_date);

  return (
    <article className="kt-match">
      {/* Header: Stage & Status */}
      <div className="kt-match-header">
        <span className="kt-match-stage">
          {fixture.stage ? fixture.stage.replace(/_/g, ' ') : fixture.competition_code}
        </span>
        {isLive ? (
          <span className="kt-match-live">
            <span className="kt-live-dot" />
            LIVE
          </span>
        ) : isFinished ? (
          <span className="kt-match-ft">FT</span>
        ) : (
          <span className="kt-match-time">{displayTime}</span>
        )}
      </div>

      {/* Teams & Score/VS */}
      <div className="kt-match-teams">
        {/* Home Team */}
        <div className="kt-match-team">
          <div className="kt-match-crest-wrap">
            {fixture.home_team_crest && !imageErrorHome ? (
              <Image
                src={fixture.home_team_crest}
                alt={fixture.home_team_name}
                className="kt-match-crest"
                width={24}
                height={24}
                unoptimized
                onError={() => setImageErrorHome(true)}
              />
            ) : (
              <span className="kt-match-crest-fallback">
                {fixture.home_team_name?.[0] || 'H'}
              </span>
            )}
          </div>
          <span className="kt-match-team-name">{fixture.home_team_name || 'Home'}</span>
        </div>

        {/* Center Score / VS */}
        <div>
          {(isLive || isFinished) && fixture.score_fulltime ? (
            <span className="kt-match-score">{fixture.score_fulltime}</span>
          ) : (
            <span className="kt-match-vs">VS</span>
          )}
        </div>

        {/* Away Team */}
        <div className="kt-match-team">
          <div className="kt-match-crest-wrap">
            {fixture.away_team_crest && !imageErrorAway ? (
              <Image
                src={fixture.away_team_crest}
                alt={fixture.away_team_name}
                className="kt-match-crest"
                width={24}
                height={24}
                unoptimized
                onError={() => setImageErrorAway(true)}
              />
            ) : (
              <span className="kt-match-crest-fallback">
                {fixture.away_team_name?.[0] || 'A'}
              </span>
            )}
          </div>
          <span className="kt-match-team-name">{fixture.away_team_name || 'Away'}</span>
        </div>
      </div>

      {/* Leading Insight Snippet */}
      {topInsight && (
        <div className="kt-match-snippet">
          <p className="kt-match-snippet-title">
            &ldquo;{sanitizeTitle(topInsight.title)}&rdquo;
          </p>
        </div>
      )}

      {/* Footer: Date & 3 Story Stats Dots */}
      <div className="kt-match-footer">
        <span className="kt-match-date">{displayDate}</span>
        {fixture.insights.length > 0 && (
          <div className="kt-match-pillars" title={`${fixture.insights.length} story stats`}>
            {fixture.insights.slice(0, 3).map((ins, idx) => {
              const meta = getPillarMeta(ins.insight_type);
              return (
                <span
                  key={ins.id || idx}
                  className="kt-match-pillar-dot"
                  style={{ background: meta.color }}
                  title={meta.en}
                />
              );
            })}
          </div>
        )}
      </div>
    </article>
  );
});

MatchCard.displayName = 'MatchCard';


