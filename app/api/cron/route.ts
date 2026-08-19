import { NextResponse } from 'next/server';
import { getCompetitionMatches, getGeneralMatches } from '@/lib/services/football';
import { runPipelineForFixture, updateSpotlights } from '@/lib/pipeline/run';
import { seedFallbackData } from '@/lib/data/seeder';
import { isTopLevelCompetition, normalizeCompetitionCode } from '@/lib/competitions';
import { isFinishedStatus, hasPlayableTeams, isTopTeamMatch } from '@/lib/matchFilters';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get('authorization');
    const adminKey = request.headers.get('x-admin-key');
    if (authHeader !== `Bearer ${cronSecret}` && adminKey !== cronSecret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const league = normalizeCompetitionCode(searchParams.get('league') || 'ALL');
  const season = parseInt(searchParams.get('season') || '2026');
  const force = searchParams.get('force') === 'true';

  try {
    const now = new Date();
    const threeDaysLater = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    let matches = [];
    if (league === 'ALL') {
      const dateFrom = twentyFourHoursAgo.toISOString().split('T')[0];
      const dateTo = threeDaysLater.toISOString().split('T')[0];
      console.log(`[Cron] Fetching top fixtures from ${dateFrom} to ${dateTo}`);
      matches = await getGeneralMatches(dateFrom, dateTo);
    } else {
      console.log(`[Cron] Fetching fixtures for: ${league}, season: ${season}`);
      matches = await getCompetitionMatches(league);
    }

    if (matches.length === 0) {
      console.log('[Cron] No matches from API. Seeding fallback top-tier stories...');
      const count = await seedFallbackData();
      return NextResponse.json({
        success: true,
        processedCount: count,
        spotlightFixtureId: 999,
        results: [{ fixture: 'Fallback Data', success: true, insightsCount: 3, message: 'Seeded top-team fallback stories' }]
      });
    }

    const scopedMatches = matches.filter(match => {
      const compCode = match.competition?.code || league;
      const isTopComp = league === 'ALL' ? isTopLevelCompetition(compCode) : normalizeCompetitionCode(compCode) === league;
      if (!isTopComp) return false;
      return isTopTeamMatch(match);
    });

    const matchesInWindow = scopedMatches.filter(match => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= twentyFourHoursAgo && matchDate <= threeDaysLater;
    });

    const skippedFinishedCount = matchesInWindow.filter(match => isFinishedStatus(match.status)).length;
    const skippedTbdCount = matchesInWindow.filter(match => !isFinishedStatus(match.status) && !hasPlayableTeams(match)).length;
    const targetMatches = matchesInWindow.filter(match => !isFinishedStatus(match.status) && hasPlayableTeams(match));

    console.log(`[Cron] ${targetMatches.length} marquee fixtures to process. Skipped ${skippedFinishedCount} finished and ${skippedTbdCount} TBD.`);

    const results = [];
    const BATCH_LIMIT = 8; // Process up to 8 top marquee matches per run
    let processed = 0;

    for (const match of targetMatches) {
      if (processed >= BATCH_LIMIT) {
        console.log(`[Cron] Reached batch limit of ${BATCH_LIMIT} marquee fixtures.`);
        break;
      }

      try {
        const compCode = normalizeCompetitionCode(match.competition?.code || league);
        const seasonYear = match.season?.year || season;
        const res = await runPipelineForFixture(match, compCode, seasonYear, force);
        results.push({
          fixture: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          status: match.status,
          date: match.utcDate,
          ...res
        });

        if (res.success && res.insightsCount > 0) {
          processed++;
        }
      } catch (err: any) {
        results.push({
          fixture: `${match.homeTeam.name} vs ${match.awayTeam.name}`,
          status: match.status,
          date: match.utcDate,
          success: false,
          error: err.message || 'Pipeline execution failed'
        });
      }
    }

    console.log('[Cron] Updating spotlight designations...');
    const spotlightId = await updateSpotlights(league);

    if (results.every(r => !r.success) && targetMatches.length > 0 && results.length > 0) {
      console.log('[Cron] Pipeline failed for matches. Seeding fallback marquee stories...');
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
      processedCount: results.length,
      queuedCount: targetMatches.length,
      skippedFinishedCount,
      skippedTbdCount,
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

