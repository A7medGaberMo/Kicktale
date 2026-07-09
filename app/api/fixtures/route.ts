import { NextResponse } from 'next/server';
import { getDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = getDB();

  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();

    const fixtures = await db.query(
      `SELECT * FROM fixtures 
       WHERE status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ? 
       ORDER BY utc_date ASC`,
      [threeDaysAgo]
    );

    if (fixtures.length === 0) {
      return NextResponse.json({
        success: true,
        count: 0,
        fixtures: []
      });
    }

    // 2. Extract fixture IDs to query all insights in one roundtrip (prevents N+1 query problem)
    const fixtureIds = fixtures.map((f: any) => f.id);
    const placeholders = fixtureIds.map(() => '?').join(',');
    
    const insights = await db.query(
      `SELECT * FROM insights WHERE fixture_id IN (${placeholders}) ORDER BY score DESC`,
      fixtureIds
    );

    // 3. Map insights to their corresponding fixtures in-memory
    const insightsByFixture = new Map<number, any[]>();
    for (const insight of insights) {
      const list = insightsByFixture.get(insight.fixture_id) || [];
      list.push({
        ...insight,
        score: parseFloat(insight.score),
        confidence: parseFloat(insight.confidence)
      });
      insightsByFixture.set(insight.fixture_id, list);
    }

    const fixturesWithInsights = fixtures.map((fixture: any) => ({
      ...fixture,
      is_spotlight: Boolean(fixture.is_spotlight),
      insights: insightsByFixture.get(fixture.id) || []
    }));

    return NextResponse.json({
      success: true,
      count: fixturesWithInsights.length,
      fixtures: fixturesWithInsights
    });
  } catch (err: any) {
    console.error('Failed to fetch fixtures:', err);
    return NextResponse.json({
      success: false,
      error: err.message
    }, { status: 500 });
  }
}
