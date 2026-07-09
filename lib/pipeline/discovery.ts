import { generateJSON } from '../services/llm';
import { MatchData } from '../services/football';
import { SynthesizedNews } from './synthesizer';
import { EnrichedMatchData } from '../services/search';

/**
 * 10 content pillars — the original 7 from the Match Preview Content Guide,
 * plus 3 additional high-value angles that lift a preview above standard coverage.
 */
export type InsightPillar =
  | 'H2HHistory'           // 1. Head-to-head — trends, venue splits, scoring patterns
  | 'RecordsMilestones'    // 2. Records & milestones — player/team/manager records on the line
  | 'FormGuide'            // 3. Form guide — results, underlying numbers, home/away splits
  | 'StorylinesStakes'     // 4. Storylines & stakes — table/points significance
  | 'VenueConditions'      // 5. Venue history — memorable past matches at this exact stadium
  | 'RefereeWatch'         // 6. Referee tendencies — referee's specific historical record with both teams
  | 'InjuryImpact';        // 7. Statistical drop-off without key players

export interface DiscoveredInsight {
  entityType: 'Match' | 'Team' | 'Player' | 'Coach' | 'Rivalry' | 'Competition';
  entityName: string;
  insightType: InsightPillar;
  evidence: string;
  confidence: number;
  score: number;
}

export interface MatchContext {
  fixture: MatchData;
  standings: any;
  homeNews: SynthesizedNews;
  awayNews: SynthesizedNews;
  webData?: EnrichedMatchData;
  h2h?: {
    homeWins: number;
    awayWins: number;
    draws: number;
    recentMeetings: string[];
    homeGoalsAvg: number;
    awayGoalsAvg: number;
  };
  form?: {
    home: { results: string; underlying: string };
    away: { results: string; underlying: string };
  };
}

function buildContextBlock(context: MatchContext): string {
  const { fixture, standings, homeNews, awayNews, webData, h2h, form } = context;
  const parts: string[] = [];

  parts.push(`=== MATCH ===`);
  parts.push(`${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
  parts.push(`Date: ${fixture.utcDate}`);
  parts.push(`Stage: ${fixture.stage}${fixture.group ? ` | Group: ${fixture.group}` : ''}`);

  if (standings) {
    parts.push(`\n=== STANDINGS ===`);
    try {
      const s = typeof standings === 'string' ? standings : JSON.stringify(standings, null, 2);
      parts.push(s.substring(0, 1500));
    } catch { parts.push('(standings unavailable)'); }
  }

  if (h2h) {
    parts.push(`\n=== HEAD-TO-HEAD (API) ===`);
    parts.push(`All-time: ${h2h.homeWins}W - ${h2h.draws}D - ${h2h.awayWins}W`);
    parts.push(`Home avg goals: ${h2h.homeGoalsAvg} | Away avg goals: ${h2h.awayGoalsAvg}`);
    if (h2h.recentMeetings.length > 0) {
      parts.push(`Recent meetings:\n${h2h.recentMeetings.join('\n')}`);
    }
  }

  if (form) {
    parts.push(`\n=== FORM GUIDE (API) ===`);
    parts.push(`${fixture.homeTeam.name} — Results: ${form.home.results}`);
    parts.push(`${fixture.awayTeam.name} — Results: ${form.away.results}`);
  }

  if (webData) {
    parts.push(`\n=== WEB SEARCH ENRICHMENT (real data from the internet) ===`);
    if (webData.h2hHistory) parts.push(`\n--- H2H History (web) ---\n${webData.h2hHistory}`);
    if (webData.recordsMilestones) parts.push(`\n--- Records & Milestones (web) ---\n${webData.recordsMilestones}`);
    if (webData.recentForm) parts.push(`\n--- Recent Form (web) ---\n${webData.recentForm}`);
    if (webData.injuries) parts.push(`\n--- Injury & Squad News (web) ---\n${webData.injuries}`);
    if (webData.tacticalAnalysis) parts.push(`\n--- Tactical Analysis (web) ---\n${webData.tacticalAnalysis}`);
    if (webData.venueInfo) parts.push(`\n--- Venue & Atmosphere (web) ---\n${webData.venueInfo}`);
  }

  parts.push(`\n=== TEAM NEWS (synthesized) ===`);
  const homeInj = homeNews.injuriesAndSuspensions.join('; ') || 'None reported';
  const homeTact = homeNews.tacticalInsights.join('; ') || 'No intel';
  const homeDrama = homeNews.narrativeDrama.join('; ') || 'None';
  const awayInj = awayNews.injuriesAndSuspensions.join('; ') || 'None reported';
  const awayTact = awayNews.tacticalInsights.join('; ') || 'No intel';
  const awayDrama = awayNews.narrativeDrama.join('; ') || 'None';

  parts.push(`[${fixture.homeTeam.name}] Injuries: ${homeInj}`);
  parts.push(`[${fixture.homeTeam.name}] Tactical: ${homeTact}`);
  parts.push(`[${fixture.homeTeam.name}] Drama: ${homeDrama}`);
  parts.push(`[${fixture.awayTeam.name}] Injuries: ${awayInj}`);
  parts.push(`[${fixture.awayTeam.name}] Tactical: ${awayTact}`);
  parts.push(`[${fixture.awayTeam.name}] Drama: ${awayDrama}`);

  return parts.join('\n');
}

export async function discoverInsights(
  context: MatchContext
): Promise<DiscoveredInsight[]> {
  const fixture = context.fixture;
  const contextBlock = buildContextBlock(context);

  const systemPrompt = `You are Kicktale's Lead Intelligence Architect — an elite football data scientist and tactical researcher.

MISSION: Analyze the match context and extract ONLY the highest-value narrative nodes. Prioritize content that reveals:
- **Records & Milestones**: Player landmarks (goals, appearances, clean sheets), manager stats, club record runs
- **Historical Context**: Venue-specific H2H trends, shifting power dynamics, culturally significant past clashes
- **Form Analysis**: Underlying numbers, xG trends, defensive vulnerabilities, home/away performance disparity
- **Tactical Matchup**: The decisive structural clash that will decide the game

PILLAR DISCOVERY FRAMEWORK (NUMBERS ONLY):
1. H2HHistory: Venue splits, scoring patterns, clean sheet streaks, sequence behaviors.
2. RecordsMilestones: Player/manager/club landmarks, record chases, historic statistical runs.
3. FormGuide: xG, shooting efficiency, defensive stats, home/away splits, goal difference.
4. StorylinesStakes: Table significance, qualification points stakes, quantitative pressure.
5. VenueConditions: Memorable or historically significant past matches played at this exact venue, venue-specific streaks.
6. RefereeWatch: The referee's historical win/loss record and card history specifically when officiating these two teams.
7. InjuryImpact: Statistical drop-off without missing players (e.g., xG without Player X, points per game without Player Y).

QUALITY CRITERIA:
- Every insight must cite exact names, numbers, dates. Zero generic claims.
- All evidence must be traceable to the provided context. No hallucination.
- Skip pillars lacking compelling data. Quality over quantity.
- Confidence (0.0-1.0) = evidence solidity. Score (0-100) = narrative engagement.

OUTPUT JSON FORMAT:
{
  "insights": [
    {
      "entityType": "Match"|"Team"|"Player"|"Coach"|"Rivalry"|"Competition",
      "entityName": "string",
      "insightType": "H2HHistory"|"RecordsMilestones"|"FormGuide"|"StorylinesStakes"|"VenueConditions"|"RefereeWatch"|"InjuryImpact",
      "evidence": "Specific, quantitative data point. Reference the exact source.",
      "confidence": 0.0-1.0,
      "score": 0-100
    }
  ]
}`;

  const userPrompt = `Analyze this match context and generate grounded insights:\n\n${contextBlock}`;

  try {
    const res = await generateJSON<{ insights: DiscoveredInsight[] }>(systemPrompt, userPrompt);
    const insights = res.insights || [];
    console.log(`Discovered ${insights.length} insights across 10 pillars for fixture ${fixture.id}`);

    const pillarCounts: Record<string, number> = {};
    for (const i of insights) {
      pillarCounts[i.insightType] = (pillarCounts[i.insightType] || 0) + 1;
    }
    console.log('Pillar distribution:', JSON.stringify(pillarCounts));

    return insights;
  } catch (err) {
    console.error(`Discovery failed for fixture ${fixture.id}:`, err);
    return [];
  }
}

export function rankInsights(
  insights: DiscoveredInsight[],
  minConfidence = 0.6,
  minScore = 40,
  maxInsights = 25
): DiscoveredInsight[] {
  const filtered = insights.filter(i => i.confidence >= minConfidence && i.score >= minScore);

  if (filtered.length === 0 && insights.length > 0) {
    const best = [...insights].sort((a, b) => b.score - a.score)[0];
    return [best];
  }

  return filtered
    .sort((a, b) => b.score - a.score)
    .slice(0, maxInsights);
}
