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

  const systemPrompt = `You are a Senior Football Intelligence Analyst & News Synthesizer. Your role is to read raw headlines and descriptions about ${teamName} and distill ONLY verified, tactical, and narrative-significant intel.

EXTRACTION CATEGORIES:

1. injuriesAndSuspensions — Specific injuries with severity and timeline. Suspensions (yellow card accumulation, red card bans). Fitness concerns from manager quotes. Starting XI implications.
   EXAMPLE: "Rodri (ACL, out for season). Stones (hamstring, doubtful — trained separately Friday). Grealish fit after 3-week layoff, expected bench role."

2. tacticalInsights — Formation changes, pressing triggers, structural experiments from training or recent matches. Manager press conference tactical hints. Set-piece adjustments.
   EXAMPLE: "Arteta switched to 3-2-4-1 in training this week. Ødegaard deployed as false 9 in two sessions. High press intensity reduced — sitting deeper block expected."

3. narrativeDrama — High-stakes storylines: manager pressure, player-manager tensions, media controversies, dressing room dynamics, fan protests, contract sagas directly affecting performance.
   EXAMPLE: "10 Hag facing the sack if United lose. Players reportedly 'confused' by tactical changes. Rashford dropped from squad after nightclub incident — club statement pending."

4. formContext — Recent results with context (scorers, xG, dominant stats). Performance trends. Home vs away splits. Goal-scoring/conceding runs.
   EXAMPLE: "Won 4 of last 5 (L1 to Arsenal 0-1). Averaging 2.3 goals/game at home. Clean sheets in 3 of last 4. But xG conceded rising: 1.4, 1.6, 1.8, 2.1 in last 4."

5. squadRotation — Expected lineup changes, resting patterns for congested schedule, youth call-ups, returning loanees, squad depth concerns.
   EXAMPLE: "Likely to rotate after Wednesday's CL match. Foden and Haaland played 120 mins — bench expected. Academy winger Oscar Bobb trained with first team."

RULES:
- Exclude all speculative transfer gossip, clickbait, and duplicate information.
- Focus on concrete facts: cite specific players, dates, and match names.
- Keep bullets concise but packed with information.
- If no data fits a category, return an empty array. Do NOT invent details.
- Prioritize reports from reliable athletic/journalistic sources.

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
