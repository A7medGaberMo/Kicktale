import { getDB } from '@/lib/db';
import { isTopLevelCompetition } from '@/lib/competitions';
import { isPublishableInsight } from '@/lib/contentQuality';
import { isContentEligibleMatch, isFinishedStatus } from '@/lib/matchFilters';
import AutoInit from './AutoInit';
import Dashboard from './components/Dashboard';

export const dynamic = 'force-dynamic';

interface FixtureRow {
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
  is_spotlight: number;
  created_at: string;
}

interface InsightRow {
  id: number;
  fixture_id: number;
  entity_type: string;
  entity_name: string;
  insight_type: string;
  title: string;
  content: string;
  evidence: string;
  score: string | number;
  confidence: string | number;
  created_at: string;
}

export default async function Home() {
  const db = getDB();
  let fixturesWithInsights: {
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
    insights: {
      id: number;
      fixture_id: number;
      entity_type: string;
      entity_name: string;
      insight_type: string;
      title: string;
      content: string;
      evidence: string;
      score: number;
      confidence: number;
    }[];
  }[] = [];
  let loadFailed = false;

  try {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const fixtures = await db.query(
      `SELECT * FROM fixtures
       WHERE status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?
       ORDER BY utc_date ASC`,
      [threeDaysAgo]
    ) as FixtureRow[];

    if (fixtures.length > 0) {
      const fixtureIds = fixtures.map((f) => f.id);
      const placeholders = fixtureIds.map(() => '?').join(',');
      const insights = await db.query(
        `SELECT * FROM insights WHERE fixture_id IN (${placeholders}) ORDER BY score DESC`,
        fixtureIds
      ) as InsightRow[];
      const insightsByFixture = new Map<number, {
        id: number;
        fixture_id: number;
        entity_type: string;
        entity_name: string;
        insight_type: string;
        title: string;
        content: string;
        evidence: string;
        score: number;
        confidence: number;
      }[]>();
      for (const insight of insights) {
        const list = insightsByFixture.get(insight.fixture_id) || [];
        list.push({
          ...insight,
          score: parseFloat(String(insight.score)),
          confidence: parseFloat(String(insight.confidence))
        });
        insightsByFixture.set(insight.fixture_id, list);
      }
      fixturesWithInsights = fixtures
        .filter((fixture) => isTopLevelCompetition(fixture.competition_code))
        .map((fixture) => ({
          ...fixture,
          is_spotlight: Boolean(fixture.is_spotlight),
          insights: (insightsByFixture.get(fixture.id) || []).filter(isPublishableInsight)
        }))
        .filter((fixture) => {
          if (isFinishedStatus(fixture.status)) return fixture.insights.length > 0;
          return isContentEligibleMatch(fixture, now);
        })
        .filter((fixture) => fixture.insights.length > 0);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Failed to load DB dashboard data, showing AutoInit:', message);
    loadFailed = true;
  }

  if (loadFailed) {
    return <AutoInit />;
  }

  return <Dashboard initialFixtures={fixturesWithInsights} />;
}
