import { generateJSON } from '../services/llm';
import { MatchData } from '../services/football';
import { SynthesizedNews } from './synthesizer';
import { EnrichedMatchData } from '../services/search';

/**
 * 12-Pillar Professional Intelligence System
 * Each pillar represents a distinct content angle used by elite football media
 * (The Athletic, Opta Analyst, StatsBomb, FiveThirtyEight).
 */
export type InsightPillar =
  | 'H2HHistory'        // 1.  All-time record, venue splits, scoring patterns, recent meetings
  | 'FormMomentum'      // 2.  Last 5-10 results, xG trends, goals trajectory, streaks
  | 'TacticalClash'     // 3.  Formation matchup, pressing triggers, structural advantages
  | 'KeyBattles'        // 4.  Individual player matchups, duel statistics, threat assessment
  | 'SquadIntel'        // 5.  Injuries, suspensions, expected XI, rotation, returning players
  | 'StakesContext'     // 6.  Table implications, must-win math, qualification/relegation scenarios
  | 'RecordWatch'       // 7.  Player/manager milestones, club records on the line
  | 'VenueEdge'         // 8.  Stadium fortress record, home/away disparity, pitch/travel factors
  | 'ManagerDuel'       // 9.  Head-to-head managerial record, tactical philosophy clash
  | 'SetPieceAngle'     // 10. Set-piece efficiency, corner conversion, aerial dominance
  | 'XFactor'           // 11. Breakout player, super-sub impact, underdog narrative
  | 'MatchVerdict';     // 12. Data-driven prediction with reasoning and key factors

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

  parts.push(`=== FIXTURE ===`);
  parts.push(`${fixture.homeTeam.name} vs ${fixture.awayTeam.name}`);
  parts.push(`Date: ${fixture.utcDate}`);
  parts.push(`Competition Stage: ${fixture.stage}${fixture.group ? ` | Group: ${fixture.group}` : ''}`);

  if (standings) {
    parts.push(`\n=== LEAGUE TABLE / STANDINGS ===`);
    try {
      const s = typeof standings === 'string' ? standings : JSON.stringify(standings, null, 2);
      parts.push(s.substring(0, 2000));
    } catch { parts.push('(standings unavailable)'); }
  }

  if (h2h) {
    parts.push(`\n=== HEAD-TO-HEAD RECORD (official API data) ===`);
    parts.push(`All-time: ${h2h.homeWins}W - ${h2h.draws}D - ${h2h.awayWins}W`);
    parts.push(`Home team avg goals: ${h2h.homeGoalsAvg} | Away team avg goals: ${h2h.awayGoalsAvg}`);
    if (h2h.recentMeetings.length > 0) {
      parts.push(`Last ${h2h.recentMeetings.length} meetings:\n${h2h.recentMeetings.join('\n')}`);
    }
  }

  if (form) {
    parts.push(`\n=== CURRENT FORM (official API data) ===`);
    parts.push(`${fixture.homeTeam.name}: ${form.home.results}`);
    parts.push(`${fixture.awayTeam.name}: ${form.away.results}`);
  }

  if (webData) {
    parts.push(`\n=== WEB INTELLIGENCE (verified external sources) ===`);
    if (webData.h2hHistory) parts.push(`\n--- Historical Record & H2H ---\n${webData.h2hHistory}`);
    if (webData.recordsMilestones) parts.push(`\n--- Records, Milestones & Landmarks ---\n${webData.recordsMilestones}`);
    if (webData.recentForm) parts.push(`\n--- Form, xG & Performance Data ---\n${webData.recentForm}`);
    if (webData.injuries) parts.push(`\n--- Squad & Injury Updates ---\n${webData.injuries}`);
    if (webData.tacticalAnalysis) parts.push(`\n--- Tactical & Formation Intelligence ---\n${webData.tacticalAnalysis}`);
    if (webData.venueInfo) parts.push(`\n--- Venue, Travel & Conditions ---\n${webData.venueInfo}`);
    if (webData.managerAnalysis) parts.push(`\n--- Manager Record & Philosophy ---\n${webData.managerAnalysis}`);
    if (webData.keyPlayers) parts.push(`\n--- Key Players & Individual Form ---\n${webData.keyPlayers}`);
    if (webData.refereeInfo) parts.push(`\n--- Referee Assignment & Record ---\n${webData.refereeInfo}`);
  }

  parts.push(`\n=== TEAM INTELLIGENCE (news synthesis) ===`);
  const homeInj = homeNews.injuriesAndSuspensions.join('; ') || 'None reported';
  const homeTact = homeNews.tacticalInsights.join('; ') || 'No intel';
  const homeDrama = homeNews.narrativeDrama.join('; ') || 'None';
  const homeForm = homeNews.formContext?.join('; ') || 'N/A';
  const homeSquad = homeNews.squadRotation?.join('; ') || 'N/A';
  const awayInj = awayNews.injuriesAndSuspensions.join('; ') || 'None reported';
  const awayTact = awayNews.tacticalInsights.join('; ') || 'No intel';
  const awayDrama = awayNews.narrativeDrama.join('; ') || 'None';
  const awayForm = awayNews.formContext?.join('; ') || 'N/A';
  const awaySquad = awayNews.squadRotation?.join('; ') || 'N/A';

  parts.push(`[${fixture.homeTeam.name}] Injuries/Suspensions: ${homeInj}`);
  parts.push(`[${fixture.homeTeam.name}] Tactical Intel: ${homeTact}`);
  parts.push(`[${fixture.homeTeam.name}] Form & Momentum: ${homeForm}`);
  parts.push(`[${fixture.homeTeam.name}] Squad Rotation: ${homeSquad}`);
  parts.push(`[${fixture.homeTeam.name}] Narrative: ${homeDrama}`);
  parts.push(`[${fixture.awayTeam.name}] Injuries/Suspensions: ${awayInj}`);
  parts.push(`[${fixture.awayTeam.name}] Tactical Intel: ${awayTact}`);
  parts.push(`[${fixture.awayTeam.name}] Form & Momentum: ${awayForm}`);
  parts.push(`[${fixture.awayTeam.name}] Squad Rotation: ${awaySquad}`);
  parts.push(`[${fixture.awayTeam.name}] Narrative: ${awayDrama}`);

  return parts.join('\n');
}

export async function discoverInsights(
  context: MatchContext
): Promise<DiscoveredInsight[]> {
  const fixture = context.fixture;
  const contextBlock = buildContextBlock(context);

  const systemPrompt = `You are Kicktale's Chief Football Intelligence Analyst — an elite data journalist combining the analytical depth of StatsBomb, the narrative craft of The Athletic, and the statistical rigor of Opta.

YOUR MISSION: Build a comprehensive match intelligence dossier. You are NOT summarizing — you are DISCOVERING the hidden stories, statistical edges, and tactical clashes that separate elite analysis from generic previews.

THE 12-PILLAR INTELLIGENCE FRAMEWORK:

1. H2HHistory — RIVALRY INTELLIGENCE
   Find: All-time record, venue-specific dominance, scoring patterns (e.g., "Over 2.5 goals in 7 of last 10"), unbeaten runs, psychological edges, revenge narratives.
   Gold standard: "Team A have won just 2 of their last 14 visits to this stadium. Their last away victory here was a 2-1 win in March 2019."

2. FormMomentum — PERFORMANCE TRAJECTORY
   Find: Current streak analysis, points-per-game in last 5/10, goals scored/conceded trajectory, xG overperformance or underperformance, home vs away form split.
   Gold standard: "Team B are unbeaten in 8 but their xG tells a different story — they've overperformed by 4.2 goals. Regression is statistically likely."

3. TacticalClash — THE CHESS MATCH
   Find: Formation matchup (e.g., 4-3-3 vs 3-5-2), pressing intensity vs possession preference, how each team's structure exploits the other's weakness, transition speed, build-up patterns.
   Gold standard: "A classic structure mismatch: Team A's 3-4-3 wing-backs will face 1v1 situations against Team B's narrow midfield. The flanks will decide this."

4. KeyBattles — INDIVIDUAL DUEL INTELLIGENCE
   Find: Specific player-vs-player matchups (winger vs fullback, striker vs centre-back), who has the statistical edge, duel win rates, goals/assists in this fixture historically.
   Gold standard: "Salah vs Robertson becomes the defining duel. Salah has scored in 3 of his last 4 against left-footed full-backs. Robertson's tackle success rate has dropped to 52%."

5. SquadIntel — AVAILABILITY & SELECTION
   Find: Confirmed injuries with severity, suspension risks (yellow card accumulation), expected starting XI changes, returning key players, fatigue from recent schedule.
   Gold standard: "Without their starting centre-back pair (ACL, hamstring), they've conceded 2.3 goals/game vs 0.8 with them. This is a structural crisis."

6. StakesContext — WHY THIS MATCH MATTERS
   Find: Points needed for qualification/survival, gap to leaders/relegation, head-to-head tiebreaker implications, what a win/loss/draw means mathematically.
   Gold standard: "A loss here makes their title challenge mathematically impossible — they'd need 7 wins from 5 remaining games."

7. RecordWatch — LANDMARKS & HISTORY
   Find: Player approaching milestone (100th goal, 200th appearance), manager record (most wins at club), team records (longest unbeaten run), historic firsts.
   Gold standard: "One goal away from becoming the club's all-time top scorer in European competition, surpassing a record held since 1973."

8. VenueEdge — FORTRESS OR GRAVEYARD
   Find: Home/away record at this specific stadium, capacity/atmosphere factor, altitude/pitch/weather conditions, travel distance for away team, memorable past matches here.
   Gold standard: "The Estadio has been a fortress — 23W-4D-1L in the last 28 home matches. The visiting side has won here just once since 2018."

9. ManagerDuel — THE TACTICAL BRAIN WAR
   Find: Head-to-head managerial record (wins/draws/losses between these two managers), tactical philosophy clash, recent press conference quotes, career milestone.
   Gold standard: "Guardiola is 2-5-1 against Klopp in competitive matches. No other manager has a winning record against him over 5+ meetings."

10. SetPieceAngle — THE DEAD-BALL EDGE
    Find: Set-piece goal percentage, corner conversion rate, free-kick threat, aerial duel dominance, penalty record, defensive vulnerability from set pieces.
    Gold standard: "37% of their goals this season have come from set pieces — the highest in the league. Their opponents concede from corners at 2x the league average."

11. XFactor — THE WILDCARD
    Find: Breakout youngster, super-sub with disproportionate impact, unlikely hero narrative, underdog storyline, emotional context (comeback from injury, playing against former club).
    Gold standard: "The 19-year-old has 4 goals in his last 3 starts. He wasn't in the squad 6 weeks ago. This is the breakout story of the season."

12. MatchVerdict — THE ANALYST'S CALL
    Find: Data-driven prediction with clear reasoning, expected scoreline, the 2-3 decisive factors, percentage probability, upset potential.
    Gold standard: "Model prediction: Home win (58%), Draw (24%), Away win (18%). The decisive factor: Home's set-piece dominance vs Away's aerial weakness."

CRITICAL RULES:
- Every insight MUST cite specific names, exact numbers, dates, or statistics. Zero generic claims.
- All evidence must be traceable to the provided context data. Absolutely NO hallucination.
- Skip any pillar where the data is insufficient for a meaningful insight. 3 great insights > 12 mediocre ones.
- confidence (0.0-1.0) = how solid the evidence is. score (0-100) = how engaging/valuable the insight is.
- Aim for 6-10 high-quality insights. Never pad with filler.
- Each insight's evidence field should be a dense, specific data sentence — not a vague summary.

OUTPUT FORMAT (strict JSON):
{
  "insights": [
    {
      "entityType": "Match"|"Team"|"Player"|"Coach"|"Rivalry"|"Competition",
      "entityName": "descriptive name of the subject",
      "insightType": "one of the 12 pillars above",
      "evidence": "specific quantitative data point with numbers, names, dates",
      "confidence": 0.0-1.0,
      "score": 0-100
    }
  ]
}`;

  const userPrompt = `Build a comprehensive intelligence dossier for this match. Extract ONLY insights backed by the data below — never invent statistics.

${contextBlock}`;

  try {
    const res = await generateJSON<{ insights: DiscoveredInsight[] }>(systemPrompt, userPrompt);
    const insights = res.insights || [];
    console.log(`Discovered ${insights.length} insights across 12-pillar framework for fixture ${fixture.id}`);

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
  minConfidence = 0.55,
  minScore = 35,
  maxInsights = 25
): DiscoveredInsight[] {
  const filtered = insights.filter(i => i.confidence >= minConfidence && i.score >= minScore);

  if (filtered.length === 0 && insights.length > 0) {
    const best = [...insights].sort((a, b) => b.score - a.score)[0];
    return [best];
  }

  // Ensure pillar diversity — prefer one high-scoring insight per pillar
  const pillarBest = new Map<string, DiscoveredInsight>();
  const extras: DiscoveredInsight[] = [];

  const sorted = [...filtered].sort((a, b) => b.score - a.score);
  for (const insight of sorted) {
    if (!pillarBest.has(insight.insightType)) {
      pillarBest.set(insight.insightType, insight);
    } else {
      extras.push(insight);
    }
  }

  // Merge: best-per-pillar first, then remaining extras by score
  const result = [...pillarBest.values(), ...extras.sort((a, b) => b.score - a.score)];
  return result.slice(0, maxInsights);
}
