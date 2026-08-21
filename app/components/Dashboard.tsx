"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { SpotlightCard } from './SpotlightCard';
import { MatchCard } from './MatchCard';
import { AdminPanel } from './AdminPanel';
import { Header } from './Header';
import { EmptyState } from './EmptyState';
import { DashboardSkeleton } from './Skeleton';
import AmbientGlow from './AmbientGlow';
import {
  Fixture, useFixtures, groupFixturesByDate,
  getDateGroup, getDateGroupLabel, DateGroup,
  isLiveStatus, isFinishedStatus
} from '../hooks/useFixtures';

interface DashboardProps {
  initialFixtures: Fixture[];
}

const DATE_GROUP_ORDER: DateGroup[] = ['today', 'tomorrow', 'this_week', 'upcoming'];

export default function Dashboard({ initialFixtures }: DashboardProps) {
  const {
    fixtures, loading, error, carouselIndices, isAdminOpen,
    isTriggering, isClearing, triggerLog, prevSlide, nextSlide, setSlideIndex,
    runPipeline, clearDatabase, setIsAdminOpen, fetchFixtures
  } = useFixtures();

  const [selectedFixtureId, setSelectedFixtureId] = useState<number | null>(null);
  const [mobileTab, setMobileTab] = useState<'upcoming' | 'results'>('upcoming');

  const allFixtures = useMemo(() => {
    const raw = fixtures.length > 0 ? fixtures : (initialFixtures || []);
    return raw.map((f: Fixture) => {
      const isFinished = isFinishedStatus(f.status);
      if (isFinished) {
        return {
          ...f,
          insights: (f.insights || []).filter(
            ins => ins.insight_type !== 'StakesContext' && ins.insight_type !== 'MatchVerdict'
          )
        };
      }
      return f;
    });
  }, [fixtures, initialFixtures]);

  const activeSelectedId = useMemo(() => {
    if (selectedFixtureId) {
      const exists = allFixtures.some(f => f.id === selectedFixtureId);
      if (exists) return selectedFixtureId;
    }
    // 1. Highest priority: Live match with insights
    const liveWithInsights = allFixtures.find(f => isLiveStatus(f.status) && f.insights.length > 0);
    if (liveWithInsights) return liveWithInsights.id;

    // 2. Upcoming matches with insights and spotlight flag
    const upcomingSpotlight = allFixtures.find(f => !isFinishedStatus(f.status) && f.insights.length > 0 && f.is_spotlight);
    if (upcomingSpotlight) return upcomingSpotlight.id;

    // 3. Any upcoming match with insights
    const anyUpcoming = allFixtures.find(f => !isFinishedStatus(f.status) && f.insights.length > 0);
    if (anyUpcoming) return anyUpcoming.id;

    // 4. Last resort: any spotlight or first fixture
    return allFixtures.find(f => f.is_spotlight)?.id ?? allFixtures[0]?.id ?? null;
  }, [selectedFixtureId, allFixtures]);

  const selectedFixture = allFixtures.find(f => f.id === activeSelectedId);
  const groupedFixtures = useMemo(() => groupFixturesByDate(allFixtures), [allFixtures]);

  const liveFixtures = useMemo(() => {
    return allFixtures.filter((f: Fixture) => isLiveStatus(f.status));
  }, [allFixtures]);

  const upcomingCount = useMemo(() => {
    return allFixtures.filter((f: Fixture) => !isFinishedStatus(f.status)).length;
  }, [allFixtures]);

  const resultsFixtures = useMemo(() => {
    return allFixtures.filter((f: Fixture) => isFinishedStatus(f.status));
  }, [allFixtures]);

  const resultsCount = resultsFixtures.length;

  const formatDate = useCallback((utc: string) => {
    const d = new Date(utc);
    const group = getDateGroupLabel(getDateGroup(utc));
    if (group === 'Today') return 'Today';
    if (group === 'Tomorrow') return 'Tomorrow';
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  const formatTime = useCallback((utc: string) => {
    return new Date(utc).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  }, []);

  const handleFixtureSelect = useCallback((id: number) => {
    setSelectedFixtureId(id);
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Keyboard navigation for carousel when active
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFixture || selectedFixture.insights.length <= 1) return;
      if (e.key === 'ArrowLeft') {
        prevSlide(selectedFixture.id, selectedFixture.insights.length);
      } else if (e.key === 'ArrowRight') {
        nextSlide(selectedFixture.id, selectedFixture.insights.length);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFixture, prevSlide, nextSlide]);

  if (loading && allFixtures.length === 0) return <DashboardSkeleton />;
  if (error && allFixtures.length === 0) return <EmptyState loading={false} error={error} onRetry={() => fetchFixtures(true)} />;
  if (allFixtures.length === 0) return <EmptyState loading={false} error={null} onRetry={() => runPipeline(true)} />;

  return (
    <main className="kt-container">
      <AmbientGlow />
      <Header
        onOpenAdmin={() => setIsAdminOpen(true)}
        onRefresh={() => fetchFixtures(true)}
      />


      {/* Live matches horizontal ticker */}
      {liveFixtures.length > 0 && (
        <div className="kt-live-stripe anim-fade-up">
          <div className="kt-live-stripe-label">
            <span className="kt-live-dot" />
            <span>LIVE NOW</span>
          </div>
          <div className="kt-live-stripe-items">
            {liveFixtures.map(fixture => {
              const isActive = activeSelectedId === fixture.id;
              return (
                <div
                  key={fixture.id}
                  className={`kt-live-item ${isActive ? 'active' : ''}`}
                  onClick={() => handleFixtureSelect(fixture.id)}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {fixture.home_team_name}
                  </span>
                  <span className="kt-live-score">{fixture.score_fulltime || '0-0'}</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>
                    {fixture.away_team_name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spotlight Hero Article */}
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
          <p>Analyzing match narratives...</p>
        </div>
      )}

      {/* Mobile View Switcher Tabs (Visible on screens < 992px) */}
      <div className="kt-dashboard-view-tabs" role="tablist" aria-label="View selection">
        <button
          role="tab"
          aria-selected={mobileTab === 'upcoming'}
          className={`kt-view-tab ${mobileTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setMobileTab('upcoming')}
        >
          Upcoming ({upcomingCount})
        </button>
        <button
          role="tab"
          aria-selected={mobileTab === 'results'}
          className={`kt-view-tab ${mobileTab === 'results' ? 'active' : ''}`}
          onClick={() => setMobileTab('results')}
        >
          Recent Results ({resultsCount})
        </button>
      </div>

      {/* Split Section: Upcoming Fixtures (Left) and Recent Results (Right) */}
      <div className="kt-split anim-fade-up anim-stagger-2">
        {/* Upcoming Fixtures Column */}
        <div
          className="kt-column"
          style={{ display: typeof window !== 'undefined' && window.innerWidth < 992 && mobileTab !== 'upcoming' ? 'none' : 'block' }}
        >
          <div className="kt-column-header">
            <h3 className="kt-column-title">Upcoming Fixtures</h3>
            <span className="kt-column-badge gold">{upcomingCount}</span>
          </div>

          <div className="kt-column-content">
            {DATE_GROUP_ORDER.map(group => {
              const gf = groupedFixtures.get(group) || [];
              if (gf.length === 0) return null;
              return (
                <div key={group} className="kt-date-group">
                  <div className="kt-date-header">
                    <span className="kt-date-label">{getDateGroupLabel(group)}</span>
                    <span className="kt-date-count">{gf.length} match{gf.length !== 1 ? 'es' : ''}</span>
                  </div>
                  <div className="kt-match-grid">
                    {gf.map((fixture) => (
                      <div
                        key={fixture.id}
                        onClick={() => handleFixtureSelect(fixture.id)}
                        style={{ cursor: 'pointer' }}
                        className={activeSelectedId === fixture.id ? 'kt-match-selected-wrap' : ''}
                      >
                        <MatchCard fixture={fixture} formatTime={formatTime} formatDate={formatDate} />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
            {upcomingCount === 0 && <div className="kt-column-empty">No upcoming matches currently scheduled.</div>}
          </div>
        </div>

        {/* Recent Results Column */}
        <div
          className="kt-column"
          style={{ display: typeof window !== 'undefined' && window.innerWidth < 992 && mobileTab !== 'results' ? 'none' : 'block' }}
        >
          <div className="kt-column-header">
            <h3 className="kt-column-title">Recent Results</h3>
            <span className="kt-column-badge green">{resultsCount}</span>
          </div>

          <div className="kt-column-content">
            {resultsFixtures.length === 0 ? (
              <div className="kt-column-empty">No recent results recorded.</div>
            ) : (
              <div className="kt-match-grid" style={{ gridTemplateColumns: '1fr' }}>
                {resultsFixtures.map((fixture) => (
                  <div
                    key={fixture.id}
                    onClick={() => handleFixtureSelect(fixture.id)}
                    style={{ cursor: 'pointer' }}
                  >
                    <MatchCard fixture={fixture} formatTime={formatTime} formatDate={formatDate} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        isTriggering={isTriggering}
        isClearing={isClearing}
        triggerLog={triggerLog}
        onTrigger={runPipeline}
        onClear={clearDatabase}
      />

      {/* Floating Scroll to Top button */}
      <button
        className="kt-floating-logo"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Scroll to top"
        title="Scroll to top"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      </button>
    </main>
  );
}

