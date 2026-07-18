import { generateJSON } from '../services/llm';
import { NewsArticle } from '../services/news';

export interface SynthesizedNews {
  injuriesAndSuspensions: string[];
  tacticalInsights: string[];
  narrativeDrama: string[];
  formContext: string[];
  squadRotation: string[];
}

export async function synthesizeNews(teamName: string, articles: NewsArticle[]): Promise<SynthesizedNews> {
  if (!articles || articles.length === 0) {
    return {
      injuriesAndSuspensions: [],
      tacticalInsights: [],
      narrativeDrama: [],
      formContext: [],
      squadRotation: [],
    };
  }

  const articleSummaries = articles
    .map((a, idx) => `[${idx + 1}] ${a.source.name} | ${a.title}\n${a.description}`)
    .join('\n\n');

  const systemPrompt = `You are a Senior Football Intelligence Analyst at a premium analytics publication (ESPN, Opta, TNT Sports). Your role is to read raw headlines and descriptions about ${teamName} and distill ONLY verified, tactical, and narrative-significant intel.

EXTRACTION CATEGORIES:

1. injuriesAndSuspensions — Specific injuries with severity, timeline, and quantified impact. Suspension accumulation data. Fitness concerns from manager quotes with XI implications.
   GOLD STANDARD: "Rodri (ACL, out for season — without him, City's win rate drops from 78% to 61%). Stones (hamstring, doubtful — trained separately Friday, expected to miss start). Grealish fit after 3-week layoff."

2. tacticalInsights — Formation changes, pressing trigger adjustments, structural experiments from training. Manager press conference tactical revelations. Set-piece pattern changes.
   GOLD STANDARD: "Arteta switched to 3-2-4-1 in training this week, with Ødegaard deployed as false 9. High press intensity reduced significantly — deeper block expected to protect exposed centre-backs."

3. narrativeDrama — High-stakes storylines: manager pressure with betting market implications, player-manager tensions, media controversies affecting squad morale, contract sagas with performance impact.
   GOLD STANDARD: "Ten Hag facing the sack if United lose — betting markets show 4/6 next manager to leave. Players reportedly 'confused' by tactical changes. Rashford dropped after nightclub incident."

4. formContext — Results with xG context, performance trends, home vs away splits, scoring/conceding patterns with underlying data.
   GOLD STANDARD: "Won 4 of last 5 (only defeat: Arsenal 0-1, 0.3 xG). Averaging 2.3 goals/game at home vs 0.9 away. Clean sheets in 3 of last 4, but xG conceded rising: 1.4, 1.6, 1.8, 2.1."

5. squadRotation — Expected changes with specific player names, rest patterns for congested schedule, youth call-ups, returning loanees.
   GOLD STANDARD: "Likely to rotate after Wednesday's 120-min CL match. Foden and Haaland expected to bench. Academy winger Bobb trained with first team all week."

RULES:
- Exclude all speculative transfer gossip, clickbait, and duplicate information.
- Focus on concrete facts: cite specific players, dates, match names, and numbers.
- Keep bullets concise but packed with quantified information.
- If no data fits a category, return an empty array. Do NOT invent details.
- Prioritize reports from reliable journalistic sources (ESPN, The Athletic, Sky Sports, BBC).

Respond strictly as JSON:
{
  "injuriesAndSuspensions": string[],
  "tacticalInsights": string[],
  "narrativeDrama": string[],
  "formContext": string[],
  "squadRotation": string[]
}`;

  try {
    const result = await generateJSON<SynthesizedNews>(systemPrompt, `Team: ${teamName}\n\nArticles:\n${articleSummaries}`);
    return {
      injuriesAndSuspensions: result.injuriesAndSuspensions || [],
      tacticalInsights: result.tacticalInsights || [],
      narrativeDrama: result.narrativeDrama || [],
      formContext: result.formContext || [],
      squadRotation: result.squadRotation || [],
    };
  } catch (err) {
    console.error(`Synthesizer failed for ${teamName}:`, err);
    return { injuriesAndSuspensions: [], tacticalInsights: [], narrativeDrama: [], formContext: [], squadRotation: [] };
  }
}
