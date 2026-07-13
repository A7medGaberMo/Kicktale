import { getDB } from '@/lib/db';
import fallbackStories from './fallback-stories.json';

export async function seedFallbackData(): Promise<number> {
  const db = getDB();
  const stories = fallbackStories as Array<{
    id: number; title: string; insightType: string;
    desc: string; entityName: string; entityType: string;
  }>;

  const now = new Date();
  const kickoff = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  // Switzerland vs Algeria (Fixture 999)
  await db.execute(
    `INSERT INTO fixtures (id, competition_code, season_year, status, utc_date, stage, group_name,
      home_team_id, home_team_name, home_team_crest, away_team_id, away_team_name, away_team_crest,
      score_fulltime, matchday, is_spotlight, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`,
    [999, 'WC', 2026, 'SCHEDULED', kickoff.toISOString(), 'GROUP_STAGE', null,
     100, 'Switzerland', '', 101, 'Algeria', '',
     null, 1, 1, new Date().toISOString()]
  );

  // Morocco vs Portugal (Fixture 998)
  await db.execute(
    `INSERT INTO fixtures (id, competition_code, season_year, status, utc_date, stage, group_name,
      home_team_id, home_team_name, home_team_crest, away_team_id, away_team_name, away_team_crest,
      score_fulltime, matchday, is_spotlight, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING`,
    [998, 'WC', 2026, 'SCHEDULED', new Date(now.getTime() + 48 * 60 * 60 * 1000).toISOString(), 'GROUP_STAGE', null,
     102, 'Morocco', '', 103, 'Portugal', '',
     null, 1, 0, new Date().toISOString()]
  );
  await db.execute('DELETE FROM insights WHERE fixture_id IN (998, 999)');

  for (const story of stories) {
    const fixtureId = story.id <= 2 ? 999 : 998;
    await db.execute(
      `INSERT INTO insights (fixture_id, entity_type, entity_name, insight_type,
        title, content, evidence,
        score, confidence, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        fixtureId, story.entityType || 'Match', story.entityName || story.title,
        story.insightType || 'StorylinesStakes',
        story.title,
        story.desc,
        story.desc.substring(0, 120),
        80, 0.9, new Date().toISOString()
      ]
    );
  }

  return 2;
}
