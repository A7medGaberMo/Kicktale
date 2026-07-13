import { NextResponse } from 'next/server';
import { getCompetitionMatches, getGeneralMatches } from '@/lib/services/football';
import { runPipelineForFixture, updateSpotlights } from '@/lib/pipeline/run';
import { seedFallbackData } from '@/lib/data/seeder';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  // Verify authorization in production to prevent unauthorized pipeline triggers.
  // Accepts either: Vercel cron Authorization header OR admin key from the dashboard.
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const adminKey = request.headers.get('x-admin-key');
    if (authHeader !== `Bearer ${cronSecret}` && adminKey !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const league = searchParams.get('league') || 'ALL';
  const season = parseInt(searchParams.get('season') || '2026');
  const force = searchParams.get('force') === 'true';

  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days ahead
    const twelveHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000); // Process matches from the last 24 hours to capture full-time scores

    let matches = [];
    if (league === 'ALL') {
      const dateFrom = twelveHoursAgo.toISOString().split('T')[0];
      const dateTo = threeDaysLater.toISOString().split('T')[0];
      console.log(`[Cron] Fetching all fixtures from ${dateFrom} to ${dateTo}`);
      matches = await getGeneralMatches(dateFrom, dateTo);
    } else {
      console.log(`[Cron] Fetching fixtures for: ${league}, season: ${season}`);
      matches = await getCompetitionMatches(league);
    }

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
        const compCode = match.competition?.code || league;
        const seasonYear = match.season?.year || season;
        const res = await runPipelineForFixture(match, compCode, seasonYear, force);
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
      console.error('[Cron] Fallback seeding also failed:', seedErr);
      return NextResponse.json({
        success: false,
        error: 'Internal Server Error'
      }, { status: 500 });
    }
  }
}
