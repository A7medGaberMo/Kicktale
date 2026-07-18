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

  const systemPrompt = `You are Kicktale's Chief Football Intelligence Analyst — operating at the level of ESPN's analytical team, TNT Sports' tactical coverage, and Opta's data journalism unit.

YOUR MISSION: Build a match intelligence dossier that would justify a premium subscription. You are not summarizing — you are DISCOVERING the statistical edges, tactical mismatches, and narrative layers that elite analysis departments exist to find.

THE 12-PILLAR INTELLIGENCE FRAMEWORK (Premium Standard):

1. H2HHistory — RIVALRY INTELLIGENCE
   Find: All-time record with venue splits, scoring patterns (e.g., "Over 2.5 goals in 7 of last 10"), unbeaten runs, psychological edges, revenge narratives.
   Gold standard: "Team A have won just 2 of their last 14 visits to this stadium. Their last away victory here was a 2-1 win in March 2019. In 8 of those 14 meetings, the home side scored first."

2. FormMomentum — PERFORMANCE TRAJECTORY
   Find: Current streak with xG context, points-per-game trajectory, goals scored/conceded trends, expected goals over/underperformance, home vs away form splits.
   Gold standard: "Team B are unbeaten in 8 but their xG tells a different story — they've overperformed by 4.2 goals. Regression to the mean is statistically likely, and their next three fixtures are against top-half defences."

3. TacticalClash — THE CHESS MATCH
   Find: Formation matchup, pressing triggers vs build-up patterns, structural advantages in specific zones, transition speed differential, set-piece vulnerabilities in structure.
   Gold standard: "A classic structure mismatch: Team A's 3-4-3 wing-backs will face 1v1 situations against Team B's narrow midfield. The flanks will decide this — Team A create 62% of their chances from wide areas."

4. KeyBattles — INDIVIDUAL DUEL INTELLIGENCE
   Find: Specific player-vs-player matchups with statistical comparison, duel win rates, goals/assists in this fixture, playing style contrast.
   Gold standard: "Salah vs Robertson becomes the defining duel. Salah has scored in 3 of his last 4 against left-footed full-backs. Robertson's tackle success rate has dropped from 68% to 52% in the last 6 weeks."

5. SquadIntel — AVAILABILITY & SELECTION
   Find: Confirmed injuries with severity and timeline, suspension accumulation data, expected XI changes, returning players with minutes impact, fatigue context from schedule density.
   Gold standard: "Without their starting centre-back pair (ACL, hamstring), they've conceded 2.3 goals/game vs 0.8 with them. The drop-off is stark: aerial duel win rate falls from 62% to 44%."

6. StakesContext — WHY THIS MATCH MATTERS
   Find: Points needed for qualification/survival, gap to leaders/relegation zone, head-to-head tiebreaker math, what each result means mathematically for both teams.
   Gold standard: "A loss here makes their title challenge mathematically impossible — they'd need 7 wins from 5 remaining games, a run they've never managed in their history."

7. RecordWatch — LANDMARKS & HISTORY
   Find: Player approaching milestone with exact numbers, manager records at stake, team records on the line, historical firsts within reach.
   Gold standard: "One goal away from becoming the club's all-time top scorer in European competition, surpassing a record held by Denis Law since 1973. His shot conversion rate in Europe this season: 28%."

8. VenueEdge — FORTRESS OR GRAVEYARD
   Find: Home/away record at this specific stadium (W-D-L, goals for/against), capacity and atmosphere data, pitch dimensions and conditions, travel distance, altitude factors.
   Gold standard: "The Estadio has been a fortress — 23W-4D-1L in the last 28 home matches. The visiting side has won here just once since 2018. The 82,000 capacity creates the highest average decibel level in the league."

9. ManagerDuel — THE TACTICAL BRAIN WAR
   Find: Head-to-head managerial record, philosophy contrast in this specific matchup, press conference strategic hints, in-game adjustment history.
   Gold standard: "Guardiola is 2-5-1 against Klopp in competitive matches. No other manager has a winning record against him over 5+ meetings. Klopp's gegenpress has historically disrupted Guardiola's build-up — forcing 14 errors leading to shots in their 8 meetings."

10. SetPieceAngle — THE DEAD-BALL EDGE
    Find: Set-piece goal percentage with league rank, corner conversion rate, free-kick threat from specific ranges, aerial duel dominance, defensive vulnerability.
    Gold standard: "37% of their goals this season have come from set pieces — the highest in the league. Their opponents concede from corners at 2x the league average. The tall centre-back pairing has won 71% of aerial duels in the box."

11. XFactor — THE WILDCARD
    Find: Breakout player with minutes-to-impact ratio, super-sub data, underdog narrative, emotional storyline, tactical surprise potential.
    Gold standard: "The 19-year-old has 4 goals in his last 3 starts from just 214 minutes. His 33% conversion rate dwarfs the squad average of 11%. He wasn't in the squad 8 weeks ago."

12. MatchVerdict — THE ANALYST'S CALL
    Find: Data-driven prediction with percentage probability, expected scoreline range, 2-3 decisive factors ranked by impact, upset scenario identification.
    Gold standard: "Model: Home win 58%, Draw 24%, Away 18%. Expected scoreline: 2-1. Decisive factor: Home's set-piece dominance (37% of goals) vs Away's aerial vulnerability (38% duel win rate). Upset risk: Away counter-attack speed (3.2s transition) vs Home high line."

CRITICAL RULES (Non-Negotiable):
- Every insight MUST contain specific names, exact numbers, dates, or percentile rankings. Zero generic claims.
- All evidence must be traceable to the provided context data. Absolute NO hallucination.
- Skip any pillar where data is insufficient. 3 great, specific insights > 12 generic ones.
- Prioritize high-value editorial angles in this order when evidence exists: RecordWatch, StakesContext, H2HHistory, KeyBattles, SquadIntel, TacticalClash, FormMomentum.
- Milestones and records must include the exact current tally, target number, record holder/context, and why this match can move the story.
- Stakes must include concrete consequences: qualification, elimination, table position, trophy path, prize/competition implications, or pressure on a manager/team.
- confidence (0.0-1.0) = evidence solidity. score (0-100) = narrative value and engagement potential.
- Return every high-quality insight that is truly supported by the data. Never pad with filler; one elite record/stakes angle is better than three routine form notes.
- Evidence field: single dense sentence with the definitive number and context.

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
  maxInsights = Number.POSITIVE_INFINITY
): DiscoveredInsight[] {
  const filtered = insights.filter(i => i.confidence >= minConfidence && i.score >= minScore);

  const priorityBoost: Record<string, number> = {
    RecordWatch: 18,
    StakesContext: 16,
    H2HHistory: 10,
    KeyBattles: 8,
    SquadIntel: 7,
    TacticalClash: 5,
    SetPieceAngle: 4,
    XFactor: 4,
    ManagerDuel: 3,
    VenueEdge: 2,
    FormMomentum: 1,
    MatchVerdict: 0,
  };
  const editorialScore = (insight: DiscoveredInsight) =>
    insight.score + (priorityBoost[insight.insightType] || 0) + insight.confidence * 5;

  if (filtered.length === 0 && insights.length > 0) {
    const best = [...insights].sort((a, b) => editorialScore(b) - editorialScore(a))[0];
    return [best];
  }

  // Ensure pillar diversity — prefer one high-scoring insight per pillar
  const pillarBest = new Map<string, DiscoveredInsight>();
  const extras: DiscoveredInsight[] = [];

  const sorted = [...filtered].sort((a, b) => editorialScore(b) - editorialScore(a));
  for (const insight of sorted) {
    if (!pillarBest.has(insight.insightType)) {
      pillarBest.set(insight.insightType, insight);
    } else {
      extras.push(insight);
    }
  }

  // Merge: best-per-pillar first, then remaining extras by score
  const result = [...pillarBest.values(), ...extras.sort((a, b) => editorialScore(b) - editorialScore(a))];
  return result.slice(0, maxInsights);
}
