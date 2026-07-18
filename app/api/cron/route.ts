import { NextResponse } from 'next/server';
import { getCompetitionMatches, getGeneralMatches } from '@/lib/services/football';
import { runPipelineForFixture, updateSpotlights } from '@/lib/pipeline/run';
import { seedFallbackData } from '@/lib/data/seeder';
import { isTopLevelCompetition, normalizeCompetitionCode } from '@/lib/competitions';
import { isFinishedStatus, hasPlayableTeams } from '@/lib/matchFilters';
import { keyPool } from '@/lib/services/keys';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

async function getAdaptiveBatchLimit() {
  const configured = parseInt(process.env.CRON_MATCH_BATCH_LIMIT || '', 10);
  if (Number.isFinite(configured) && configured > 0) {
    return clamp(configured, 1, 12);
  }

  const [groqKeys, openRouterKeys, tavilyKeys] = await Promise.all([
    keyPool.getAvailableKeyCount('groq'),
    keyPool.getAvailableKeyCount('openrouter'),
    keyPool.getAvailableKeyCount('tavily'),
  ]);

  const llmKeys = groqKeys + openRouterKeys;
  if (llmKeys === 0 || tavilyKeys === 0) return 0;

  const llmCapacity = Math.ceil(llmKeys / 2);
  const searchCapacity = Math.max(1, tavilyKeys);
  return clamp(Math.min(llmCapacity, searchCapacity), 1, 6);
}

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
  const league = normalizeCompetitionCode(searchParams.get('league') || 'ALL');
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

    const scopedMatches = matches.filter(match => {
      const compCode = match.competition?.code || league;
      return league === 'ALL' ? isTopLevelCompetition(compCode) : normalizeCompetitionCode(compCode) === league;
    });

    const matchesInWindow = scopedMatches.filter(match => {
      const matchDate = new Date(match.utcDate);
      return matchDate >= twelveHoursAgo && matchDate <= threeDaysLater;
    });
    const skippedFinishedCount = matchesInWindow.filter(match => isFinishedStatus(match.status)).length;
    const skippedTbdCount = matchesInWindow.filter(match => !isFinishedStatus(match.status) && !hasPlayableTeams(match)).length;
    const targetMatches = matchesInWindow.filter(match => !isFinishedStatus(match.status) && hasPlayableTeams(match));

    console.log(`[Cron] ${targetMatches.length} target fixtures to process. Skipped ${skippedFinishedCount} finished and ${skippedTbdCount} TBD fixtures.`);

    const results = [];
    const BATCH_LIMIT = await getAdaptiveBatchLimit();
    if (BATCH_LIMIT === 0) {
      return NextResponse.json({
        success: false,
        processedCount: 0,
        queuedCount: targetMatches.length,
        skippedFinishedCount,
        skippedTbdCount,
        spotlightFixtureId: null,
        results: [],
        error: 'No active LLM or Tavily keys available for generation'
      }, { status: 503 });
    }
    console.log(`[Cron] Adaptive full-run batch limit: ${BATCH_LIMIT}`);
    let fullyProcessedCount = 0;

    for (const match of targetMatches) {
      if (fullyProcessedCount >= BATCH_LIMIT) {
        console.log(`[Cron] Reached batch limit of ${BATCH_LIMIT} full processing runs. Pausing until next cron ping.`);
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
