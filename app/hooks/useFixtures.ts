"use client";

import { useState, useEffect, useCallback } from 'react';

export const PILLARS = [
  'H2HHistory',
  'RecordsMilestones',
  'FormGuide',
  'MemorableMeeting',
  'StorylinesStakes',
  'TacticalAngle',
  'Prediction',
  'VenueConditions',
  'RefereeWatch',
  'InjuryImpact',
] as const;

export type PillarType = (typeof PILLARS)[number];

export interface Insight {
  id: number;
  entity_type: string;
  entity_name: string;
  insight_type: string;
  title: string;
  content: string;
  evidence: string;
  score: number;
  confidence: number;
}

export interface Fixture {
  id: number;
  competition_code: string;
  status: string;
  utc_date: string;
  stage: string;
  group_name: string | null;
  home_team_id: number;
  home_team_name: string;
  home_team_crest: string;
  away_team_id: number;
  away_team_name: string;
  away_team_crest: string;
  score_fulltime: string | null;
  matchday: number | null;
  is_spotlight: boolean;
  insights: Insight[];
}

export type DateGroup = 'results' | 'today' | 'tomorrow' | 'this_week' | 'upcoming';

export function getDateGroup(utcDate: string): DateGroup {
  const now = new Date();
  const d = new Date(utcDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (d < today) return 'results';
  if (d >= today && d < tomorrow) return 'today';
  if (d >= tomorrow && d < new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000)) return 'tomorrow';
  if (d >= today && d < in7Days) return 'this_week';
  return 'upcoming';
}

export function getDateGroupLabel(group: DateGroup): string {
  const labels: Record<DateGroup, string> = {
    results: 'Recent Results',
    today: 'Today',
    tomorrow: 'Tomorrow',
    this_week: 'This Week',
    upcoming: 'Upcoming',
  };
  return labels[group];
}

export function groupFixturesByDate(fixtures: Fixture[]): Map<DateGroup, Fixture[]> {
  const groups = new Map<DateGroup, Fixture[]>();
  for (const group of ['results', 'today', 'tomorrow', 'this_week', 'upcoming'] as DateGroup[]) {
    groups.set(group, []);
  }
  for (const f of fixtures) {
    const group = getDateGroup(f.utc_date);
    groups.get(group)?.push(f);
  }
  return groups;
}

export function getPillarCoverage(insights: Insight[]): {
  pillars: PillarType[];
  count: number;
} {
  const pillars = [...new Set(insights.map(i => i.insight_type as PillarType))];
  return { pillars, count: pillars.length };
}

export function useFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carouselIndices, setCarouselIndices] = useState<Record<number, number>>({});
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [triggerLog, setTriggerLog] = useState<string | null>(null);
  const [league, setLeague] = useState('PL');

  const fetchFixtures = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch(`/api/fixtures?league=${league}`);
      const data = await res.json();
      if (data.success) {
        const allFixtures = data.fixtures || [];
        setFixtures(allFixtures);
        setCarouselIndices(prev => {
          const updated = { ...prev };
          allFixtures.forEach((f: Fixture) => {
            if (updated[f.id] === undefined) {
              updated[f.id] = 0;
            }
          });
          return updated;
        });
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch fixtures');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading dashboard');
    } finally {
      setLoading(false);
    }
  }, [league]);

  useEffect(() => {
    fetchFixtures(true);
    const interval = setInterval(() => { fetchFixtures(false); }, 15000);
    return () => clearInterval(interval);
  }, [fetchFixtures]);

  const prevSlide = useCallback((fixtureId: number, maxSlides: number) => {
    setCarouselIndices(prev => {
      const idx = (prev[fixtureId] || 0) === 0 ? maxSlides - 1 : (prev[fixtureId] || 0) - 1;
      return { ...prev, [fixtureId]: idx };
    });
  }, []);

  const nextSlide = useCallback((fixtureId: number, maxSlides: number) => {
    setCarouselIndices(prev => {
      const idx = (prev[fixtureId] || 0) === maxSlides - 1 ? 0 : (prev[fixtureId] || 0) + 1;
      return { ...prev, [fixtureId]: idx };
    });
  }, []);

  const setSlideIndex = useCallback((fixtureId: number, index: number) => {
    setCarouselIndices(prev => ({ ...prev, [fixtureId]: index }));
  }, []);

  const runPipeline = useCallback(async (force = false) => {
    try {
      setIsTriggering(true);
      setTriggerLog(`Bootstrapping ${league} fixtures and running AI agents...`);
      const res = await fetch(`/api/cron?league=${league}&force=${force}`);
      const data = await res.json();
      if (data.success) {
        const totalInsights = data.results?.reduce((acc: number, r: any) => acc + (r.insightsCount || 0), 0) || 0;
        setTriggerLog(`Done! ${data.processedCount} fixtures, ${totalInsights} insights generated.`);
        fetchFixtures();
      } else {
        setTriggerLog(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setTriggerLog(`Error: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  }, [fetchFixtures, league]);

  return {
    fixtures, loading, error, carouselIndices,
    isAdminOpen, isTriggering, triggerLog,
    prevSlide, nextSlide, setSlideIndex,
    runPipeline, setIsAdminOpen, fetchFixtures,
    league, setLeague
  } as const;
}

export type UseFixturesResult = ReturnType<typeof useFixtures>;

export const PILLAR_META: Record<string, { en: string; icon: string; color: string }> = {
  H2HHistory:        { en: 'H2H History',           icon: '↔', color: '#6366f1' },
  RecordsMilestones: { en: 'Records & Milestones',   icon: '★', color: '#f59e0b' },
  FormGuide:         { en: 'Form Guide',             icon: '📊', color: '#10b981' },
  MemorableMeeting:  { en: 'Memorable Meeting',      icon: '📖', color: '#ec4899' },
  StorylinesStakes:  { en: 'Stakes & Storylines',    icon: '🔥', color: '#ef4444' },
  TacticalAngle:     { en: 'Tactical Angle',         icon: '♟', color: '#8b5cf6' },
  Prediction:        { en: 'Prediction',             icon: '🎯', color: '#06b6d4' },
  VenueConditions:   { en: 'Venue & Atmosphere',     icon: '🏟', color: '#14b8a6' },
  RefereeWatch:      { en: 'Referee Watch',          icon: '🟨', color: '#f97316' },
  InjuryImpact:      { en: 'Injury Impact',          icon: '🩹', color: '#a855f7' },
  PostMatchRecap:    { en: 'Post-Match Recap',       icon: '🏁', color: '#10b981' },
};

export function getPillarMeta(type: string) {
  return PILLAR_META[type] || {
    en: type.replace(/([A-Z])/g, ' $1').trim().toUpperCase(),
    icon: '•',
    color: '#6b7280'
  };
}