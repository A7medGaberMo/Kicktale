"use client";

import { useState, useEffect, useCallback } from 'react';

export const PILLARS = [
  'RecordWatch',
  'FormMomentum',
  'StakesContext',
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

export const LIVE_STATUSES = new Set([
  'LIVE',
  'IN_PLAY',
  'PAUSED',
  'EXTRA_TIME',
  'PENALTY_SHOOTOUT',
  'HT',
  '1H',
  '2H',
  'ET',
  'P',
  'HALFTIME',
  'IN-PLAY',
  'LIVE_NOW'
]);

export const FINISHED_STATUSES = new Set([
  'FINISHED',
  'FT',
  'COMPLETED',
  'AWARDED',
  'AET',
  'AP'
]);

export function isLiveStatus(status?: string | null): boolean {
  return LIVE_STATUSES.has((status || '').toUpperCase().trim());
}

export function isFinishedStatus(status?: string | null): boolean {
  return FINISHED_STATUSES.has((status || '').toUpperCase().trim());
}

export type DateGroup = 'results' | 'today' | 'tomorrow' | 'this_week' | 'upcoming';

export function getDateGroup(utcDate: string, status?: string): DateGroup {
  if (isLiveStatus(status)) return 'today';
  if (isFinishedStatus(status)) return 'results';

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
    const group = getDateGroup(f.utc_date, f.status);
    groups.get(group)?.push(f);
  }
  return groups;
}

export function useFixtures() {
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [carouselIndices, setCarouselIndices] = useState<Record<number, number>>({});
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isTriggering, setIsTriggering] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [triggerLog, setTriggerLog] = useState<string | null>(null);

  const fetchFixtures = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const res = await fetch('/api/fixtures');
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
  }, []);

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
      setTriggerLog('Running Kicktale AI Direct Intelligence pipeline for marquee fixtures...');
      const res = await fetch(`/api/cron?force=${force}`, {
        headers: { 'x-admin-key': process.env.NEXT_PUBLIC_CRON_SECRET || '' }
      });
      const data = await res.json();
      if (data.success) {
        const totalInsights = data.results?.reduce((acc: number, r: any) => acc + (r.insightsCount || 0), 0) || 0;
        setTriggerLog(
          `Pipeline complete! Processed ${data.processedCount || 0} matches with ${totalInsights} direct 2-3 line insights.`
        );
        fetchFixtures();
      } else {
        setTriggerLog(`Failed: ${data.error}`);
      }
    } catch (err: any) {
      setTriggerLog(`Error: ${err.message}`);
    } finally {
      setIsTriggering(false);
    }
  }, [fetchFixtures]);

  const clearDatabase = useCallback(async () => {
    try {
      setIsClearing(true);
      setTriggerLog('Clearing database & match cache...');
      const res = await fetch('/api/clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setFixtures([]);
        setTriggerLog('Database cleared successfully! All cached matches and insights removed.');
        await fetchFixtures(true);
      } else {
        setTriggerLog(`Failed to clear database: ${data.error}`);
      }
    } catch (err: any) {
      setTriggerLog(`Clear Error: ${err.message}`);
    } finally {
      setIsClearing(false);
    }
  }, [fetchFixtures]);

  return {
    fixtures, loading, error, carouselIndices,
    isAdminOpen, isTriggering, isClearing, triggerLog,
    prevSlide, nextSlide, setSlideIndex,
    runPipeline, clearDatabase, setIsAdminOpen, fetchFixtures,
  } as const;
}

export type UseFixturesResult = ReturnType<typeof useFixtures>;

export const PILLAR_META: Record<string, { en: string; color: string; short: string }> = {
  RecordWatch:       { en: 'Record & Milestone', short: 'Record', color: '#FFD60A' },
  H2HHistory:        { en: 'H2H Supremacy',      short: 'History', color: '#FFD60A' },
  RecordsMilestones: { en: 'Record Watch',       short: 'Record', color: '#FFD60A' },
  FormMomentum:      { en: 'Form & Momentum',    short: 'Form',   color: '#0A84FF' },
  FormGuide:         { en: 'Form Trajectory',    short: 'Form',   color: '#0A84FF' },
  StakesContext:     { en: 'Match Stakes',       short: 'Stakes', color: '#30D158' },
};

export function getPillarMeta(type: string) {
  if (PILLAR_META[type]) return PILLAR_META[type];
  return {
    en: 'Match Story',
    short: 'Story',
    color: '#FFD60A'
  };
}


