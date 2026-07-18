import { getDB } from '../db';
import { getMatchDetails, getCompetitionStandings, MatchData } from '../services/football';
import { fetchTeamNews } from '../services/news';
import { enrichMatchData } from '../services/search';
import { synthesizeNews } from './synthesizer';
import { discoverInsights, rankInsights, DiscoveredInsight } from './discovery';
import { generateNarrative, GeneratedNarrative } from './narrative';

export interface PipelineResult {
  fixtureId: number;
  success: boolean;
  insightsCount: number;
  message: string;
  pillarsUsed: string[];
}

const GENERIC_PATTERNS = [
  /no (data|information|record|milestone|notable|significant|stats|relevant)/i,
  /nothing (notable|significant|of note)/i,
  /no (injuries|suspensions|tactical|drama)/i,
  /failed to (analyze|find|fetch)/i,
  /could not (find|fetch|retrieve)/i,
  /not (available|found|reported)/i,
];

const POST_MATCH_PATTERNS = [
  /\b(after|following) (the )?(final whistle|match|game)\b/i,
  /\bpost[- ]match\b/i,
  /\bfull[- ]time reaction\b/i,
  /\bended\b/i,
  /\bfinished\b/i,
];

function isSubstantiveContent(text: string): boolean {
  if (!text || text.length < 20) return false;
  return !GENERIC_PATTERNS.some(p => p.test(text));
}

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function validateInsight(
  insight: DiscoveredInsight,
  narrative: GeneratedNarrative
): boolean {
  if (!isSubstantiveContent(narrative.content)) {
    console.warn(`Rejected generic insight: [${insight.insightType}] ${insight.entityName}`);
    return false;
  }
  if (!isSubstantiveContent(insight.evidence)) {
    console.warn(`Rejected insight with weak evidence: [${insight.insightType}] ${insight.entityName}`);
    return false;
  }
  // Reject if content is too short — indicates LLM failure/fallback
  if (narrative.content.length < 100) {
    console.warn(`Rejected short content (${narrative.content.length} chars): [${insight.insightType}] ${insight.entityName}`);
    return false;
  }
  const words = wordCount(narrative.content);
  if (words < 100 || words > 400) {
    console.warn(`Rejected content outside target length (${words} words): [${insight.insightType}] ${insight.entityName}`);
    return false;
  }
  if (POST_MATCH_PATTERNS.some(p => p.test(narrative.content))) {
    console.warn(`Rejected post-match phrasing: [${insight.insightType}] ${insight.entityName}`);
    return false;
  }
  // Reject if title starts with "Analysis:" — indicates fallback content
  if (/^Analysis:/i.test(narrative.title)) {
    console.warn(`Rejected fallback-titled insight: [${insight.insightType}] ${insight.entityName}`);
    return false;
  }
  return true;
}

export async function runPipelineForFixture(
  fixture: MatchData,
  competitionCode: string,
  seasonYear: number,
  force = false
): Promise<PipelineResult> {
  const db = getDB();

  try {
    // Always upsert the fixture basic info (status, scores, crests, etc.) first
    // to ensure live matches and recently ended matches are up to date.
    const scoreStr = fixture.score.fullTime.home !== null
      ? `${fixture.score.fullTime.home}-${fixture.score.fullTime.away}`
      : null;
    const createdAtStr = new Date().toISOString();

    await db.execute(
      `INSERT INTO fixtures (
        id, competition_code, season_year, status, utc_date, stage, group_name,
        home_team_id, home_team_name, home_team_crest,
        away_team_id, away_team_name, away_team_crest,
        score_fulltime, matchday, is_spotlight, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        status = excluded.status,
        score_fulltime = excluded.score_fulltime,
        utc_date = excluded.utc_date,
        stage = excluded.stage,
        group_name = excluded.group_name,
        home_team_id = excluded.home_team_id,
        home_team_name = excluded.home_team_name,
        home_team_crest = excluded.home_team_crest,
        away_team_id = excluded.away_team_id,
        away_team_name = excluded.away_team_name,
        away_team_crest = excluded.away_team_crest,
        matchday = excluded.matchday`,
      [
        fixture.id, competitionCode, seasonYear,
        fixture.status, fixture.utcDate, fixture.stage, fixture.group,
        fixture.homeTeam.id, fixture.homeTeam.name, fixture.homeTeam.crest,
        fixture.awayTeam.id, fixture.awayTeam.name, fixture.awayTeam.crest,
        scoreStr, fixture.matchday || null, 0, createdAtStr
      ]
    );

    if (!force) {
      const insights = await db.query('SELECT id FROM insights WHERE fixture_id = ?', [fixture.id]);
      if (insights.length > 0) {
        return {
          fixtureId: fixture.id,
          success: true,
          insightsCount: insights.length,
          message: 'Fixture basic info updated, insights already exist (skipped pipeline)',
          pillarsUsed: []
        };
      }
    }

    const s = fixture.status.toUpperCase();
    const isFinished = s === 'FINISHED' || s === 'FT' || s === 'COMPLETED' || s === 'AWARDED';
    if (isFinished) {
      return {
        fixtureId: fixture.id,
        success: true,
        insightsCount: 0,
        message: 'Fixture is finished, skipping insight generation',
        pillarsUsed: []
      };
    }

    if (!fixture.homeTeam?.name || !fixture.awayTeam?.name || fixture.homeTeam.name === 'TBD' || fixture.awayTeam.name === 'TBD') {
      return {
        fixtureId: fixture.id,
        success: true,
        insightsCount: 0,
        message: 'Fixture teams are TBD, skipping insight generation to save tokens',
        pillarsUsed: []
      };
    }

    console.log(`[Pipeline] ${fixture.homeTeam.name} vs ${fixture.awayTeam.name} (ID: ${fixture.id})`);

    // 1. Fetch context data in parallel
    let matchDetails: any = null;
    let standings: any = null;
    await Promise.allSettled([
      (async () => {
        try {
          matchDetails = await getMatchDetails(fixture.id);
        } catch {
          console.warn(`Could not fetch details for fixture ${fixture.id}`);
        }
      })(),
      (async () => {
        try {
          standings = await getCompetitionStandings(competitionCode);
        } catch {
          console.warn(`Could not fetch standings for ${competitionCode}`);
        }
      })(),
    ]);

    // 2. Build H2H & form context from matchDetails if available
    let h2h: {
      homeWins: number;
      awayWins: number;
      draws: number;
      recentMeetings: string[];
      homeGoalsAvg: number;
      awayGoalsAvg: number;
    } | undefined;
    let form: {
      home: { results: string; underlying: string };
      away: { results: string; underlying: string };
    } | undefined;

    if (matchDetails) {
      const h2hData = matchDetails.headToHead;
      if (h2hData) {
        h2h = {
          homeWins: h2hData.homeTeam?.wins ?? 0,
          awayWins: h2hData.awayTeam?.wins ?? 0,
          draws: h2hData.draws ?? 0,
          recentMeetings: (h2hData.matches ?? []).slice(0, 5).map((m: any) =>
            `${m.homeTeam.name} ${m.homeTeam.fullTime?.home ?? '?'}-${m.awayTeam.fullTime?.away ?? '?'} ${m.awayTeam.name} (${new Date(m.utcDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})`
          ),
          homeGoalsAvg: h2hData.homeTeam?.goals ?? 0,
          awayGoalsAvg: h2hData.awayTeam?.goals ?? 0,
        };
      }

      form = {
        home: {
          results: matchDetails.homeTeam?.form?.join(', ') ?? 'N/A',
          underlying: 'Based on match statistics from recent fixtures'
        },
        away: {
          results: matchDetails.awayTeam?.form?.join(', ') ?? 'N/A',
          underlying: 'Based on match statistics from recent fixtures'
        }
      };
    }

    // 3. Fetch and synthesize team news in parallel
    console.log(`Fetching news for ${fixture.homeTeam.name} and ${fixture.awayTeam.name}...`);
    const [homeArticles, awayArticles] = await Promise.all([
      fetchTeamNews(fixture.homeTeam.name),
      fetchTeamNews(fixture.awayTeam.name)
    ]);

    const [homeNews, awayNews] = await Promise.all([
      synthesizeNews(fixture.homeTeam.name, homeArticles),
      synthesizeNews(fixture.awayTeam.name, awayArticles)
    ]);

    // 4. Web search enrichment — real data from the internet
    console.log('Running web search enrichment (Tavily)...');
    const webData = await enrichMatchData(
      fixture.homeTeam.name,
      fixture.awayTeam.name,
      competitionCode
    );
    if (webData.h2hHistory || webData.recordsMilestones || webData.tacticalAnalysis) {
      console.log('Web search returned real data — grounding insights in verifiable sources.');
    }

    // 5. Discovery — pass rich context across all 12 pillars
    console.log('Running 12-pillar Discovery Engine with web-grounded data...');
    const candidates = await discoverInsights({
      fixture,
      standings,
      homeNews,
      awayNews,
      webData,
      h2h,
      form
    });

    // 6. Rank by editorial value. Keep every quality insight; discovery decides the set.
    const ranked = rankInsights(candidates, 0.6, 40);

    // Count pillars used
    const pillarsUsed = [...new Set(ranked.map(i => i.insightType))];
    console.log(`Ranked ${ranked.length} insights across ${pillarsUsed.length} pillars: ${pillarsUsed.join(', ')}`);

    if (ranked.length === 0) {
      return {
        fixtureId: fixture.id,
        success: false,
        insightsCount: 0,
        message: 'No insights passed quality threshold',
        pillarsUsed: []
      };
    }

    // 7. Basic fixture info is already upserted at the start.

    // 8. Generate narratives, validate, and save
    await db.execute('DELETE FROM insights WHERE fixture_id = ?', [fixture.id]);

    let savedCount = 0;
    const savedPillars = new Set<string>();
    
    for (let i = 0; i < ranked.length; i++) {
      const insight = ranked[i];
      try {
        if (i > 0) await new Promise(r => setTimeout(r, 500));
        console.log(`Generating narrative: [${insight.insightType}] ${insight.entityName}`);
        const narrative = await generateNarrative(insight);

        // Skip generic/empty content — only substantive insights reach the UI
        if (!validateInsight(insight, narrative)) continue;

        savedPillars.add(insight.insightType);
        await db.execute(
          `INSERT INTO insights (
            fixture_id, entity_type, entity_name, insight_type,
            title, content, evidence,
            score, confidence, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            fixture.id,
            insight.entityType,
            insight.entityName,
            insight.insightType,
            narrative.title,
            narrative.content,
            narrative.evidence,
            insight.score,
            insight.confidence,
            createdAtStr
          ]
        );
        savedCount++;
      } catch (err: any) {
        console.error(`Narrative generation failed for ${insight.insightType}. Early stop triggered. Error:`, err.message);
        break; // Stop safely, preserve what we saved
      }
    }

    console.log(`Completed pipeline for fixture ${fixture.id}: ${savedCount} insights saved (${ranked.length - savedCount} rejected or aborted)`);
    return {
      fixtureId: fixture.id,
      success: savedCount > 0,
      insightsCount: savedCount,
      message: `Generated and saved ${savedCount} insights (out of ${ranked.length})`,
      pillarsUsed: [...savedPillars]
    };

  } catch (err: any) {
    console.error(`Pipeline failure for fixture ${fixture.id}:`, err);
    return {
      fixtureId: fixture.id,
      success: false,
      insightsCount: 0,
      message: `Error: ${err.message}`,
      pillarsUsed: []
    };
  }
}

/**
 * Designates the fixture with the highest-scoring insight as today's spotlight.
 * Prefers upcoming (non-finished) matches over finished ones.
 */
export async function updateSpotlights(competitionCode: string): Promise<number | null> {
  const db = getDB();
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const isAll = competitionCode === 'ALL';
    
    const queryCond = isAll 
      ? `WHERE status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?` 
      : `WHERE competition_code = ? AND (status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?)`;
    const queryParams = isAll ? [threeDaysAgo] : [competitionCode, threeDaysAgo];

    const updateCond = isAll ? '' : 'WHERE competition_code = ?';
    const updateParams = isAll ? [] : [competitionCode];

    const fixtures = await db.query(
      `SELECT id FROM fixtures ${queryCond}`,
      queryParams
    );

    if (fixtures.length === 0) return null;

    await db.execute(
      `UPDATE fixtures SET is_spotlight = 0 ${updateCond}`,
      updateParams
    );

    // Prefer upcoming matches for spotlight — finished matches are stale
    const upcomingInsight = await db.query(
      `SELECT i.fixture_id, i.score FROM insights i
       JOIN fixtures f ON f.id = i.fixture_id
       WHERE i.fixture_id IN (SELECT id FROM fixtures ${queryCond})
       AND f.status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED')
       AND f.home_team_name IS NOT NULL AND f.away_team_name IS NOT NULL
       ORDER BY i.score DESC LIMIT 1`,
      queryParams
    );

    // Fallback: any fixture with insights if no upcoming match has them
    const targetInsight = upcomingInsight.length > 0 ? upcomingInsight : await db.query(
      `SELECT fixture_id, score FROM insights
       WHERE fixture_id IN (SELECT id FROM fixtures ${queryCond})
       ORDER BY score DESC LIMIT 1`,
      queryParams
    );

    if (targetInsight.length > 0) {
      const spotlightFixtureId = targetInsight[0].fixture_id;
      await db.execute(
        `UPDATE fixtures SET is_spotlight = 1 WHERE id = ?`,
        [spotlightFixtureId]
      );
      console.log(`Spotlight: Fixture ${spotlightFixtureId} (score: ${targetInsight[0].score})`);
      return spotlightFixtureId;
    }
  } catch (err) {
    console.error('Failed to update spotlights:', err);
  }
  return null;
}
