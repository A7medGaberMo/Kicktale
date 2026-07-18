import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';
import { isTopLevelCompetition, normalizeCompetitionCode } from '@/lib/competitions';
import { isPublishableInsight } from '@/lib/contentQuality';
import { isContentEligibleMatch, isFinishedStatus } from '@/lib/matchFilters';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const db = getDB();
  const { searchParams } = new URL(request.url);
  const league = normalizeCompetitionCode(searchParams.get('league') || 'ALL');

  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    let fixtures;
    if (league !== 'ALL') {
      fixtures = await db.query(
        `SELECT * FROM fixtures
         WHERE competition_code = ? AND (status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?)
         ORDER BY utc_date ASC`,
        [league, threeDaysAgo]
      );
    } else {
      fixtures = await db.query(
        `SELECT * FROM fixtures
         WHERE status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?
         ORDER BY utc_date ASC`,
        [threeDaysAgo]
      );
    }

    if (fixtures.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        fixtures: []
      });
    }

    // 2. Extract fixture IDs to query all insights (chunking to prevent SQLITE_MAX_VARIABLE_NUMBER crash)
    const fixtureIds = fixtures.map((f: any) => f.id);
    const insightsByFixture = new Map<number, any[]>();
    
    // Chunk size of 500 is very safe for SQLite's default 999 limit
    const chunkSize = 500;
    for (let i = 0; i < fixtureIds.length; i += chunkSize) {
      const chunk = fixtureIds.slice(i, i + chunkSize);
      const placeholders = chunk.map(() => '?').join(',');
      const insights = await db.query(
        `SELECT * FROM insights WHERE fixture_id IN (${placeholders}) ORDER BY score DESC`,
        chunk
      );
      
      for (const insight of insights) {
        const list = insightsByFixture.get(insight.fixture_id) || [];
        list.push({
          ...insight,
          score: parseFloat(insight.score),
          confidence: parseFloat(insight.confidence)
        });
        insightsByFixture.set(insight.fixture_id, list);
      }
    }

    const fixturesWithInsights = fixtures
      .filter((f: any) => league === 'ALL'
        ? isTopLevelCompetition(f.competition_code)
        : normalizeCompetitionCode(f.competition_code) === league)
      .map((fixture: any) => ({
        ...fixture,
        is_spotlight: Boolean(fixture.is_spotlight),
        insights: (insightsByFixture.get(fixture.id) || []).filter(isPublishableInsight)
      }))
      // Filter out TBD fixtures (no team names) — they have no content value
      .filter((f: any) => f.home_team_name && f.away_team_name)
      // Filter out finished matches that have zero insights — they're just clutter
      .filter((f: any) => {
        const s = (f.status || '').toUpperCase();
        const isFinished = isFinishedStatus(s);
        if (isFinished && f.insights.length === 0) return false;
        return true;
      })
      // Hide stale past fixtures whose status has not been updated by the provider.
      .filter((f: any) => {
        if (isFinishedStatus(f.status)) return true;
        return isContentEligibleMatch(f, now);
      })
      .filter((f: any) => f.insights.length > 0);

    return NextResponse.json({
      success: true,
      count: fixturesWithInsights.length,
      fixtures: fixturesWithInsights
    });
  } catch (err: any) {
    console.error('Failed to fetch fixtures:', err);
    return NextResponse.json({
      success: false,
      error: 'Internal Server Error'
    }, { status: 500 });
  }
}
