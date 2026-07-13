"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { SpotlightCard } from './SpotlightCard';
import { MatchCard } from './MatchCard';
import { AdminPanel } from './AdminPanel';
import { Header } from './Header';
import { EmptyState } from './EmptyState';
import { DashboardSkeleton } from './Skeleton';
import AmbientGlow from './AmbientGlow';
import {
  Fixture, Insight, useFixtures, groupFixturesByDate,
  getDateGroup, getDateGroupLabel, DateGroup,
} from '../hooks/useFixtures';

interface DashboardProps {
  initialFixtures: Fixture[];
}

const DATE_GROUP_ORDER: DateGroup[] = ['results', 'today', 'tomorrow', 'this_week', 'upcoming'];

export default function Dashboard({ initialFixtures }: DashboardProps) {
  const {
    fixtures, loading, error, carouselIndices, isAdminOpen,
    isTriggering, triggerLog, prevSlide, nextSlide, setSlideIndex,
    runPipeline, setIsAdminOpen, fetchFixtures
  } = useFixtures();

  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);

  const allFixtures = useMemo(() => {
    const raw = fixtures.length > 0 ? fixtures : (initialFixtures || []);
    return raw.map((f: Fixture) => {
      const s = (f.status || '').toUpperCase();
      const isFinished = s === 'FINISHED' || s === 'FT' || s === 'COMPLETED' || s === 'AWARDED';
      if (isFinished) {
        const filteredInsights = (f.insights || []).filter(
          ins => ins.insight_type !== 'StakesContext' && ins.insight_type !== 'MatchVerdict'
        );
        const scoreDisplay = f.score_fulltime || '';
        const recapInsight: Insight = {
          id: -f.id, entity_type: 'match',
          entity_name: `${f.home_team_name} vs ${f.away_team_name}`,
          insight_type: 'PostMatchRecap',
          title: `Final Verdict: ${f.home_team_name} ${scoreDisplay} ${f.away_team_name}`,
          content: `The clash between **${f.home_team_name}** and **${f.away_team_name}** has concluded. With the final score settled at **${scoreDisplay}**, the pre-match tactical calculations, predictions, and story stakes are resolved. Focus now shifts to the post-match analysis and future fixtures.`,
          evidence: `Match completed. Final Score: ${scoreDisplay}.`,
          score: 98, confidence: 100,
        };
        return { ...f, insights: [recapInsight, ...filteredInsights] };
      }
      return f;
    });
  }, [fixtures, initialFixtures]);

  const activeSelectedId = useMemo(() => {
    return selectedFixtureId ?? (
      allFixtures.find(f => f.is_spotlight)?.id ?? allFixtures[0]?.id ?? null
    );
  }, [selectedFixtureId, allFixtures]);

  const selectedFixture = allFixtures.find(f => f.id === activeSelectedId);
  const groupedFixtures = useMemo(() => groupFixturesByDate(allFixtures), [allFixtures]);

  const liveFixtures = useMemo(() => {
    return allFixtures.filter((f: Fixture) => {
      const status = (f.status || '').toUpperCase();
      return status === 'LIVE' || status === 'IN_PLAY' || status === 'PAUSED';
    });
  }, [allFixtures]);

  const upcomingCount = useMemo(() => {
    return allFixtures.filter((f: Fixture) => {
      const status = (f.status || '').toUpperCase();
      return status !== 'FINISHED' && status !== 'FT' && status !== 'COMPLETED' && status !== 'AWARDED';
    }).length;
  }, [allFixtures]);

  const resultsCount = useMemo(() => {
    return allFixtures.filter((f: Fixture) => {
      const status = (f.status || '').toUpperCase();
      return status === 'FINISHED' || status === 'FT' || status === 'COMPLETED' || status === 'AWARDED';
    }).length;
  }, [allFixtures]);

  const formatDate = useCallback((utc: string) => {
    const d = new Date(utc);
    const group = getDateGroupLabel(getDateGroup(utc));
    if (group === 'Today') return 'Today';
    if (group === 'Tomorrow') return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  }, []);

  const formatTime = useCallback((utc: string) => {
    return new Date(utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleFixtureSelect = useCallback((id: number) => setSelectedFixtureId(id), []);

  if (loading && allFixtures.length === 0) return <DashboardSkeleton />;
  if (error && allFixtures.length === 0) return <EmptyState loading={false} error={error} onRetry={() => fetchFixtures(true)} />;
  if (allFixtures.length === 0) return <EmptyState loading={false} error={null} onRetry={() => runPipeline(true)} />;

  return (
    <main className="kt-container">
      <AmbientGlow />
      <Header onOpenAdmin={() => setIsAdminOpen(true)} onRefresh={() => fetchFixtures(true)} />

      {liveFixtures.length > 0 && (
        <div className="kt-live-stripe anim-fade-up">
          <div className="kt-live-stripe-label">
            <span className="kt-match-live-dot" />
            <span>LIVE NOW</span>
          </div>
          <div className="kt-live-stripe-items">
            {liveFixtures.map(fixture => {
              const isActive = activeSelectedId === fixture.id;
              return (
                <div key={fixture.id}
                  className={`kt-live-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleFixtureSelect(fixture.id)}>
                  <div className="kt-live-team">
                    {fixture.home_team_crest && (
                      <img src={fixture.home_team_crest} alt={fixture.home_team_name} className="kt-live-crest" />
                    )}
                    <span>{fixture.home_team_name}</span>
                  </div>
                  <span className="kt-live-score">{fixture.score_fulltime || '0-0'}</span>
                  <div className="kt-live-team">
                    <span>{fixture.away_team_name}</span>
                    {fixture.away_team_crest && (
                      <img src={fixture.away_team_crest} alt={fixture.away_team_name} className="kt-live-crest" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {selectedFixture ? (
        <section className="anim-fade-up anim-stagger-1">
          <SpotlightCard
            fixture={selectedFixture}
            activeIndex={carouselIndices[selectedFixture.id] || 0}
            onPrev={() => prevSlide(selectedFixture.id, selectedFixture.insights.length)}
            onNext={() => nextSlide(selectedFixture.id, selectedFixture.insights.length)}
            onDotClick={(idx: number) => setSlideIndex(selectedFixture.id, idx)}
            formatTime={formatTime}
            formatDate={formatDate}
          />
        </section>
      ) : (
        <div className="kt-empty">
          <div className="kt-spinner" />
          <p>AI agents are analyzing this match...</p>
        </div>
      )}

      <div className="kt-split anim-fade-up anim-stagger-2">
        <div className="kt-column">
          <div className="kt-column-header">
            <h3 className="kt-column-title">
              <span className="kt-column-icon upcoming" />
              Upcoming Fixtures
            </h3>
            <span className="kt-column-badge gold">{upcomingCount}</span>
          </div>
          <div className="kt-column-content">
            {DATE_GROUP_ORDER.filter(g => g !== 'results').map(group => {
              const gf = groupedFixtures.get(group) || [];
              if (gf.length === 0) return null;
              return (
                <div key={group} className="kt-date-group">
                  <div className="kt-date-header">
                    <span className="kt-date-label">{getDateGroupLabel(group)}</span>
                    <span className="kt-date-count">{gf.length} match{gf.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="kt-match-grid">
                    {gf.map((fixture, idx) => (
                      <div key={fixture.id}
                        className={`anim-fade-up anim-stagger-${Math.min(idx + 1, 8)}`}
                        onClick={() => handleFixtureSelect(fixture.id)}
                        style={{ cursor: 'pointer' }}>
                        <MatchCard fixture={fixture} formatTime={formatTime} formatDate={formatDate} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {upcomingCount === 0 && <div className="kt-column-empty">No upcoming matches scheduled.</div>}
          </div>
        </div>

        <div className="kt-column" style={{ borderColor: 'rgba(16, 185, 129, 0.06)' }}>
          <div className="kt-column-header">
            <h3 className="kt-column-title">
              <span className="kt-column-icon results" />
              Recent Results
            </h3>
            <span className="kt-column-badge green">{resultsCount}</span>
          </div>
          <div className="kt-column-content">
            {(() => {
              const gf = allFixtures.filter((f: Fixture) => {
                const s = (f.status || '').toUpperCase();
                return s === 'FINISHED' || s === 'FT' || s === 'COMPLETED' || s === 'AWARDED';
              });
              if (gf.length === 0) return <div className="kt-column-empty">No recent results available.</div>;
              return (
                <div className="kt-match-grid" style={{ gridTemplateColumns: '1fr' }}>
                  {gf.map((fixture, idx) => (
                    <div key={fixture.id}
                      className={`anim-fade-up anim-stagger-${Math.min(idx + 1, 8)}`}
                      onClick={() => handleFixtureSelect(fixture.id)}
                      style={{ cursor: 'pointer' }}>
                      <MatchCard fixture={fixture} formatTime={formatTime} formatDate={formatDate} />
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isTriggering={isTriggering}
        triggerLog={triggerLog}
        onTrigger={runPipeline}
      />

      <div className="kt-floating-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
        <img src="/logo.png" alt="Kicktale" />
      </div>
    </main>
  );
}