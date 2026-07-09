import { NextResponse } from 'next/server';
import { getCompetitionMatches } from '@/lib/services/football';
import { runPipelineForFixture, updateSpotlights } from '@/lib/pipeline/run';
import { getDB } from '@/lib/db';
import fallbackStories from '@/lib/data/fallback-stories.json';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

async function seedFallbackData() {
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'WC';
  const season = parseInt(searchParams.get('season') || '2026');
  const force = searchParams.get('force') === 'true';

  try {
    console.log(`[Cron] Fetching fixtures for: ${league}, season: ${season}`);
    const matches = await getCompetitionMatches(league);

    if (matches.length === 0) {
      console.log('[Cron] No matches from API. Seeding fallback data...');
      const count = await seedFallbackData();
      return NextResponse.json({
        success: true,
        processedCount: count,
        spotlightFixtureId: 999,
        results: [{ fixture: 'Fallback Data', success: true, insightsCount: 3, message: 'Seeded 7-pillar fallback stories' }]
      });
    }

    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead
    const twelveHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Process matches from the last 24 hours to capture full-time scores

    const targetMatches = matches.filter(match => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= twelveHoursAgo && matchDate <= threeDaysLater;
    });

    console.log(`[Cron] ${targetMatches.length} target fixtures to process.`);

    const results = [];
    const BATCH_LIMIT = 2; // Maximum number of full LLM pipeline runs per cron execution
    let fullyProcessedCount = 0;

    for (const match of targetMatches) {
      if (fullyProcessedCount >= BATCH_LIMIT) {
        console.log(`[Cron] Reached batch limit of ${BATCH_LIMIT} full processing runs. Pausing until next cron ping.`);
        break;
      }

      try {
        const res = await runPipelineForFixture(match, league, season, force);
        results.push({
          fixture: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          status: match.status,
          date: match.utcDate,
          ...res
        });

        // If the pipeline wasn't skipped (i.e. it generated insights or failed trying), count it against the limit
        if (!res.message.includes('skipped') && res.message !== 'Fixture is finished, skipping insight generation' && !res.message.includes('TBD')) {
          fullyProcessedCount++;
        }
      } catch (err: any) {
        results.push({
          fixture: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          status: match.status,
          date: match.utcDate,
          success: false,
          error: err.message || 'Pipeline execution failed'
        });
        fullyProcessedCount++; // Even if it fails, it consumed time, so count it against the limit
      }
    }

    console.log('[Cron] Updating spotlight designations...');
    const spotlightId = await updateSpotlights(league);

    if (results.every(r => !r.success) && targetMatches.length > 0) {
      console.log('[Cron] Pipeline failed for all matches. Seeding fallback...');
      const count = await seedFallbackData();
      return NextResponse.json({
        success: true,
        processedCount: count,
        spotlightFixtureId: 999,
        results: [{ fixture: 'Fallback (pipeline failed)', success: true, insightsCount: 3, message: 'Seeded fallback after pipeline failure' }]
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: targetMatches.length,
      spotlightFixtureId: spotlightId,
      results
    });
  } catch (err: any) {
    console.error('[Cron] Pipeline trigger failed:', err);
    try {
      const count = await seedFallbackData();
      return NextResponse.json({
        success: true,
        processedCount: count,
        spotlightFixtureId: 999,
        results: [{ fixture: 'Fallback Data', success: true, insightsCount: 3, message: 'Seeded fallback after error: ' + err.message }]
      });
    } catch (seedErr: any) {
      return NextResponse.json({
        success: false,
        error: err.message,
        fallbackError: seedErr.message
      }, { status: 500 });
    }
  }
}
