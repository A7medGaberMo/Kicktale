import { getDB } from '@/lib/db';
import AutoInit from './AutoInit';
import Dashboard from './components/Dashboard';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const db = getDB();
  let fixturesWithInsights: any[] = [];
  let loadFailed = false;

  try {
    const fixtures = await db.query(`SELECT * FROM fixtures ORDER BY utc_date ASC`);

    if (fixtures.length > 0) {
      const fixtureIds = fixtures.map((f: any) => f.id);
      const placeholders = fixtureIds.map(() => '?').join(',');
      const insights = await db.query(
        `SELECT * FROM insights WHERE fixture_id IN (${placeholders}) ORDER BY score DESC`,
        fixtureIds
      );
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
      fixturesWithInsights = fixtures.map((fixture: any) => ({
        ...fixture,
        is_spotlight: Boolean(fixture.is_spotlight),
        insights: insightsByFixture.get(fixture.id) || []
      }));
    }
  } catch (err: any) {
    console.error('Failed to load DB dashboard data, showing AutoInit:', err);
    loadFailed = true;
  }

  if (loadFailed || fixturesWithInsights.length === 0) {
    return <AutoInit />;
  }

  return <Dashboard initialFixtures={fixturesWithInsights} />;
}