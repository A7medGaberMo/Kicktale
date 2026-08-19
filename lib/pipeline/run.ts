import { getDB } from '../db';
import { getMatchDetails, MatchData } from '../services/football';
import { generateJSON } from '../services/llm';
import { isTopTeamMatch } from '../matchFilters';
import { isPublishableInsight } from '../contentQuality';

export interface PipelineResult {
  fixtureId: number;
  success: boolean;
  insightsCount: number;
  message: string;
  pillarsUsed: string[];
}

interface LLMStoryStatOutput {
  insights: {
    insight_type: 'RecordWatch' | 'FormMomentum' | 'StakesContext';
    entity_name: string;
    title: string;
    content: string;
    evidence: string;
  }[];
}

/**
 * Single-pass match intelligence generation for top-tier fixtures.
 * Generates exactly 3 high-impact story stats/insights per fixture in 1 single LLM request.
 */
export async function runPipelineForFixture(
  fixture: MatchData,
  competitionCode: string,
  seasonYear: number,
  force = false
): Promise<PipelineResult> {
  const db = getDB();

  try {
    const homeName = fixture.homeTeam?.name || 'Home';
    const awayName = fixture.awayTeam?.name || 'Away';

    // 1. Basic fixture upsert
    const scoreStr = fixture.score?.fullTime?.home !== null && fixture.score?.fullTime?.home !== undefined
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

    // 2. Cache check: Skip if already populated
    if (!force) {
      const existing = await db.query('SELECT id FROM insights WHERE fixture_id = ?', [fixture.id]);
      if (existing.length > 0) {
        return {
          fixtureId: fixture.id,
          success: true,
          insightsCount: existing.length,
          message: 'Insights already cached for this fixture (skipped pipeline)',
          pillarsUsed: []
        };
      }
    }

    const s = (fixture.status || '').toUpperCase();
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
        message: 'Teams are TBD, skipping insight generation',
        pillarsUsed: []
      };
    }

    // 3. Filter: Focus on top-tier matches only
    if (!isTopTeamMatch(fixture)) {
      return {
        fixtureId: fixture.id,
        success: true,
        insightsCount: 0,
        message: 'Non-marquee match filtered to preserve focus on top teams',
        pillarsUsed: []
      };
    }

    console.log(`[Pipeline] Generating 3 Story Stats for: ${homeName} vs ${awayName} (ID: ${fixture.id})`);

    // 4. Fetch H2H context if available
    let h2hSummary = '';
    try {
      const matchDetails = await getMatchDetails(fixture.id);
      if (matchDetails?.headToHead) {
        const h = matchDetails.headToHead;
        h2hSummary = `H2H Record: ${homeName} ${h.homeTeam?.wins ?? 0} wins, ${h.draws ?? 0} draws, ${awayName} ${h.awayTeam?.wins ?? 0} wins.`;
      }
    } catch {
      // Optional enhancement, safe to proceed without blocking
    }

    // 5. Single-pass LLM prompt for the 3 core story stats
    const systemPrompt = `You are Kicktale's Chief Football Storyteller — writing premier, fact-anchored football match narratives at the standard of The Athletic and Opta Analyst.
Kicktale's core ethos is: "Every match tells a story."

Generate EXACTLY 3 distinct, high-impact match story insights for this marquee fixture:

1. "RecordWatch": Landmark milestone, historical dominance, or rivalry record (e.g. unbeaten streak at venue, all-time record chase, landmark goals).
2. "FormMomentum": Form trajectory, scoring surge, defensive run, or momentum trend entering this match.
3. "StakesContext": High stakes, title/qualification race implications, or what a win/loss concretely means for both clubs.

CRITICAL RULES:
- Exactly 3 insights (one for each type: RecordWatch, FormMomentum, StakesContext).
- NO tactical chalkboard jargon, tactical formation schemes, or news gossip. Focus purely on compelling stats, records, form, and stakes.
- Titles must be 5-10 word high-impact headlines with NO markdown asterisks, hashes, or quotes. Anchor on specific numbers and names.
- Content must be concise and punchy: 50-90 words in 1 tight paragraph with bolded numbers.
- Evidence must be a single crisp sentence stating the key quantitative stat.
- Do NOT include internal scores, confidence percentages, or the word "Analysis:".

OUTPUT FORMAT (strict JSON):
{
  "insights": [
    {
      "insight_type": "RecordWatch",
      "entity_name": "${homeName} vs ${awayName}",
      "title": "Clean Punchy Headline Anchored On Stat",
      "content": "Concise, punchy analytical paragraph (50-90 words) with **bolded numbers** and key historical/milestone facts.",
      "evidence": "Specific stat: e.g. Unbeaten in 14 home meetings since 2018."
    },
    {
      "insight_type": "FormMomentum",
      "entity_name": "${homeName}",
      "title": "Clean Headline On Form And Momentum",
      "content": "Concise paragraph (50-90 words) analyzing current form streak and scoring momentum.",
      "evidence": "Specific stat: e.g. 19 points from last 21 available with 2.4 goals per game."
    },
    {
      "insight_type": "StakesContext",
      "entity_name": "${awayName}",
      "title": "Clean Headline On Match Stakes And Permutations",
      "content": "Concise paragraph (50-90 words) analyzing table stakes and qualification consequences.",
      "evidence": "Specific stat: e.g. A win opens a 5-point gap in the Champions League qualification race."
    }
  ]
}`;


    const userPrompt = `Fixture: ${homeName} vs ${awayName}
Competition: ${competitionCode}
Kickoff: ${fixture.utcDate}
${h2hSummary ? `Official Data: ${h2hSummary}` : ''}

Synthesize the 3 premier story stats for this fixture now.`;

    const llmResponse = await generateJSON<LLMStoryStatOutput>(systemPrompt, userPrompt);
    const generatedInsights = (llmResponse.insights || []).slice(0, 3);

    if (generatedInsights.length === 0) {
      return {
        fixtureId: fixture.id,
        success: false,
        insightsCount: 0,
        message: 'LLM returned no insights',
        pillarsUsed: []
      };
    }

    // 6. Delete old insights and insert the 3 new insights
    await db.execute('DELETE FROM insights WHERE fixture_id = ?', [fixture.id]);

    let savedCount = 0;
    const pillarsUsed: string[] = [];

    for (const item of generatedInsights) {
      const cleanTitle = (item.title || '')
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/, '')
        .replace(/^["']|["']$/g, '')
        .replace(/^Analysis:\s*/i, '')
        .trim();

      const cleanContent = (item.content || '')
        .replace(/^Analysis:\s*/i, '')
        .replace(/\b\d+\/100 score\b/gi, '')
        .replace(/\b\d+%\s*confidence\b/gi, '')
        .trim();

      const candidate = {
        fixture_id: fixture.id,
        entity_type: 'Match',
        entity_name: item.entity_name || `${homeName} vs ${awayName}`,
        insight_type: item.insight_type || 'RecordWatch',
        title: cleanTitle,
        content: cleanContent,
        evidence: item.evidence || cleanTitle,
        score: 90,
        confidence: 0.95
      };

      if (!isPublishableInsight(candidate)) {
        if (cleanContent.length < 50 || cleanTitle.length < 5) continue;
      }

      await db.execute(
        `INSERT INTO insights (
          fixture_id, entity_type, entity_name, insight_type,
          title, content, evidence,
          score, confidence, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          candidate.fixture_id, candidate.entity_type, candidate.entity_name,
          candidate.insight_type, candidate.title, candidate.content,
          candidate.evidence, candidate.score, candidate.confidence,
          createdAtStr
        ]
      );

      savedCount++;
      pillarsUsed.push(candidate.insight_type);
    }

    console.log(`[Pipeline] Successfully saved ${savedCount} story stats for ${homeName} vs ${awayName}`);
    return {
      fixtureId: fixture.id,
      success: savedCount > 0,
      insightsCount: savedCount,
      message: `Generated and saved ${savedCount} story stats in 1 single-pass request`,
      pillarsUsed
    };

  } catch (err: any) {
    console.error(`Pipeline failure for fixture ${fixture.id}:`, err.message);
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
 * Designates the upcoming marquee fixture with insights as today's spotlight.
 */
export async function updateSpotlights(competitionCode = 'ALL'): Promise<number | null> {
  const db = getDB();
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    const isAll = competitionCode === 'ALL';

    const queryCond = isAll
      ? `WHERE status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?`
      : `WHERE competition_code = ? AND (status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED') OR utc_date >= ?)`;
    const queryParams = isAll ? [threeDaysAgo] : [competitionCode, threeDaysAgo];

    const fixtures = await db.query(
      `SELECT id FROM fixtures ${queryCond}`,
      queryParams
    );

    if (fixtures.length === 0) return null;

    await db.execute(
      `UPDATE fixtures SET is_spotlight = 0 ${isAll ? '' : 'WHERE competition_code = ?'}`,
      isAll ? [] : [competitionCode]
    );

    // Prefer upcoming match with 3 insights
    const upcoming = await db.query(
      `SELECT f.id, COUNT(i.id) as insight_count
       FROM fixtures f
       JOIN insights i ON i.fixture_id = f.id
       WHERE f.status NOT IN ('FINISHED', 'FT', 'COMPLETED', 'AWARDED')
       AND f.home_team_name IS NOT NULL AND f.away_team_name IS NOT NULL
       GROUP BY f.id
       ORDER BY insight_count DESC, f.utc_date ASC
       LIMIT 1`
    );

    if (upcoming.length > 0) {
      const spotlightId = upcoming[0].id;
      await db.execute('UPDATE fixtures SET is_spotlight = 1 WHERE id = ?', [spotlightId]);
      return spotlightId;
    }

    // Fallback: any match with insights
    const anyFixture = await db.query(
      `SELECT fixture_id FROM insights ORDER BY created_at DESC LIMIT 1`
    );

    if (anyFixture.length > 0) {
      const spotlightId = anyFixture[0].fixture_id;
      await db.execute('UPDATE fixtures SET is_spotlight = 1 WHERE id = ?', [spotlightId]);
      return spotlightId;
    }
  } catch (err) {
    console.error('Failed to update spotlights:', err);
  }
  return null;
}

