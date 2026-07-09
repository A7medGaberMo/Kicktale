import { describe, it, expect } from 'vitest';
import { generateMockStats } from '@/app/components/PillarWidget';

describe('generateMockStats', () => {
  const fixture = {
    id: 999,
    home_team_name: 'Switzerland',
    away_team_name: 'Algeria',
  } as any;

  it('returns all stats for Prediction pillar', () => {
    const stats = generateMockStats(fixture, 'Prediction');
    expect(stats.homeWinProb).toBeGreaterThanOrEqual(40);
    expect(stats.homeWinProb + stats.drawProb + stats.awayWinProb).toBe(100);
  });

  it('returns form arrays of length 5', () => {
    const stats = generateMockStats(fixture, 'FormGuide');
    expect(stats.homeForm).toHaveLength(5);
    expect(stats.awayForm).toHaveLength(5);
    stats.homeForm.forEach(r => expect(['W', 'D', 'L']).toContain(r));
  });

  it('returns deterministic seeded results (same seed = same output)', () => {
    const a = generateMockStats(fixture, 'H2HHistory');
    const b = generateMockStats(fixture, 'H2HHistory');
    expect(a.h2hPlayed).toBe(b.h2hPlayed);
    expect(a.h2hHomeWins).toBe(b.h2hHomeWins);
  });

  it('returns different stats for different pillars', () => {
    const a = generateMockStats(fixture, 'Prediction');
    const b = generateMockStats(fixture, 'TacticalAngle');
    expect(a.homeWinProb).not.toBe(b.homeWinProb);
  });

  it('returns valid formation strings', () => {
    const stats = generateMockStats(fixture, 'TacticalAngle');
    expect(stats.homeSystem).toMatch(/^\d[\d-]*\d$/);
    expect(stats.awaySystem).toMatch(/^\d[\d-]*\d$/);
  });

  it('returns referee with name and country', () => {
    const stats = generateMockStats(fixture, 'RefereeWatch');
    expect(stats.ref.name).toBeTruthy();
    expect(stats.ref.country).toBeTruthy();
  });

  it('returns hypeScore between 0 and 10', () => {
    const stats = generateMockStats(fixture, 'StorylinesStakes');
    expect(parseFloat(stats.hypeScore)).toBeGreaterThanOrEqual(0);
    expect(parseFloat(stats.hypeScore)).toBeLessThanOrEqual(10);
  });
});
