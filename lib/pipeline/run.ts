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

function isSubstantiveContent(text: string): boolean {
  if (!text || text.length < 20) return false;
  return !GENERIC_PATTERNS.some(p => p.test(text));
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

    // 1. Fetch context data
    let matchDetails: any = null;
    try {
      matchDetails = await getMatchDetails(fixture.id);
    } catch {
      console.warn(`Could not fetch details for fixture ${fixture.id}`);
    }

    let standings: any = null;
    try {
      standings = await getCompetitionStandings(competitionCode);
    } catch {
      console.warn(`Could not fetch standings for ${competitionCode}`);
    }

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

    // 3. Fetch and synthesize team news
    console.log(`Fetching news for ${fixture.homeTeam.name}...`);
    const homeArticles = await fetchTeamNews(fixture.homeTeam.name);
    console.log(`Fetching news for ${fixture.awayTeam.name}...`);
    const awayArticles = await fetchTeamNews(fixture.awayTeam.name);

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

    // 5. Discovery — pass rich context across all 10 pillars
    console.log('Running 10-pillar Discovery Engine with web-grounded data...');
    const candidates = await discoverInsights({
      fixture,
      standings,
      homeNews,
      awayNews,
      webData,
      h2h,
      form
    });

    // 6. Rank — no hard cap. Keep all quality insights (up to 25)
    const ranked = rankInsights(candidates, 0.6, 40, 25);

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
    
    for (const insight of ranked) {
      try {
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
 */
export async function updateSpotlights(competitionCode: string): Promise<number | null> {
  const db = getDB();
  try {
    const fixtures = await db.query(
      `SELECT id FROM fixtures WHERE competition_code = ?`,
      [competitionCode]
    );

    if (fixtures.length === 0) return null;

    await db.execute(
      `UPDATE fixtures SET is_spotlight = 0 WHERE competition_code = ?`,
      [competitionCode]
    );

    const highestInsight = await db.query(
      `SELECT fixture_id, score FROM insights
       WHERE fixture_id IN (SELECT id FROM fixtures WHERE competition_code = ?)
       ORDER BY score DESC LIMIT 1`,
      [competitionCode]
    );

    if (highestInsight.length > 0) {
      const spotlightFixtureId = highestInsight[0].fixture_id;
      await db.execute(
        `UPDATE fixtures SET is_spotlight = 1 WHERE id = ?`,
        [spotlightFixtureId]
      );
      console.log(`Spotlight: Fixture ${spotlightFixtureId} (score: ${highestInsight[0].score})`);
      return spotlightFixtureId;
    }
  } catch (err) {
    console.error('Failed to update spotlights:', err);
  }
  return null;
}
