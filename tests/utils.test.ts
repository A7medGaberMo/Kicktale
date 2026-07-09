import { describe, it, expect } from 'vitest';
import {
  getDateGroup,
  getDateGroupLabel,
  groupFixturesByDate,
  getPillarCoverage,
  getPillarMeta,
  PILLAR_META,
  PILLARS,
} from '@/app/hooks/useFixtures';

describe('getDateGroup', () => {
  it('returns "results" for past dates', () => {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    expect(getDateGroup(past)).toBe('results');
  });

  it('returns "today" for current day', () => {
    const now = new Date().toISOString();
    expect(getDateGroup(now)).toBe('today');
  });

  it('returns "tomorrow" for next day', () => {
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    expect(getDateGroup(tomorrow)).toBe('tomorrow');
  });

  it('returns "this_week" for dates within 7 days', () => {
    const in3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDateGroup(in3Days)).toBe('this_week');
  });

  it('returns "upcoming" for dates beyond 7 days', () => {
    const in10Days = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();
    expect(getDateGroup(in10Days)).toBe('upcoming');
  });
});

describe('getDateGroupLabel', () => {
  it('returns correct labels', () => {
    expect(getDateGroupLabel('results')).toBe('Recent Results');
    expect(getDateGroupLabel('today')).toBe('Today');
    expect(getDateGroupLabel('tomorrow')).toBe('Tomorrow');
    expect(getDateGroupLabel('this_week')).toBe('This Week');
    expect(getDateGroupLabel('upcoming')).toBe('Upcoming');
  });
});

describe('groupFixturesByDate', () => {
  const makeFixture = (id: number, utcDate: string) => ({
    id,
    utc_date: utcDate,
  } as any);

  it('groups fixtures into correct date buckets', () => {
    const past = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    const now = new Date().toISOString();
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const fixtures = [
      makeFixture(1, past),
      makeFixture(2, now),
      makeFixture(3, tomorrow),
    ];
    const groups = groupFixturesByDate(fixtures);
    expect(groups.get('results')?.length).toBe(1);
    expect(groups.get('today')?.length).toBe(1);
    expect(groups.get('tomorrow')?.length).toBe(1);
  });

  it('handles empty array', () => {
    const groups = groupFixturesByDate([]);
    expect(groups.get('results')?.length).toBe(0);
    expect(groups.get('today')?.length).toBe(0);
  });
});

describe('getPillarCoverage', () => {
  it('returns unique pillar types', () => {
    const insights = [
      { insight_type: 'Prediction' },
      { insight_type: 'FormGuide' },
      { insight_type: 'Prediction' },
    ] as any[];
    const result = getPillarCoverage(insights);
    expect(result.count).toBe(2);
    expect(result.pillars).toContain('Prediction');
    expect(result.pillars).toContain('FormGuide');
  });

  it('returns empty for empty insights', () => {
    const result = getPillarCoverage([]);
    expect(result.count).toBe(0);
    expect(result.pillars).toEqual([]);
  });
});

describe('PILLAR_META', () => {
  it('has all PILLARS defined', () => {
    for (const p of PILLARS) {
      expect(PILLAR_META[p]).toBeDefined();
      expect(PILLAR_META[p].en).toBeTruthy();
      expect(PILLAR_META[p].color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('includes PostMatchRecap', () => {
    expect(PILLAR_META.PostMatchRecap).toBeDefined();
    expect(PILLAR_META.PostMatchRecap.en).toBe('Post-Match Recap');
  });
});

describe('getPillarMeta', () => {
  it('returns known pillar', () => {
    const meta = getPillarMeta('Prediction');
    expect(meta.color).toBe('#06b6d4');
  });

  it('returns fallback for unknown pillar', () => {
    const meta = getPillarMeta('UnknownType');
    expect(meta.color).toBe('#6b7280');
    expect(meta.en).toBeTruthy();
  });
});

describe('PILLARS', () => {
  it('has all 10 expected pillars', () => {
    expect(PILLARS).toHaveLength(10);
    expect(PILLARS).toContain('Prediction');
    expect(PILLARS).toContain('InjuryImpact');
    expect(PILLARS).toContain('StorylinesStakes');
  });
});
