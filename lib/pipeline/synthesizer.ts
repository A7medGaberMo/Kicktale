import { generateJSON } from '../services/llm';
import { NewsArticle } from '../services/news';

export interface SynthesizedNews {
  injuriesAndSuspensions: string[];
  tacticalInsights: string[];
  narrativeDrama: string[];
}

export async function synthesizeNews(teamName: string, articles: NewsArticle[]): Promise<SynthesizedNews> {
  if (!articles || articles.length === 0) {
    return {
      injuriesAndSuspensions: [],
      tacticalInsights: [],
      narrativeDrama: [],
    };
  }

  const articleSummaries = articles
    .map((a, idx) => `[${idx + 1}] ${a.source.name} | ${a.title}\n${a.description}`)
    .join('\n\n');

  const systemPrompt = `You are a Senior Football Intelligence Analyst & News Synthesizer. Your role is to read raw headlines and descriptions about ${teamName} and distill ONLY verified, tactical, and narrative-significant intel.

CATEGORIES TO EXTRACT:
1. injuriesAndSuspensions: Specific injuries, severity, expected return dates, suspensions, fitness updates, and direct starting XI implications.
2. tacticalInsights: Structural shifts, tactical experiments, manager press conference notes, formation changes, press triggers, and set-piece details.
3. narrativeDrama: High-stakes club news, player-manager relations, pressure metrics (e.g. manager sack watch), media controversies, and specific milestones.

RULES:
- Exclude all speculative transfer gossip, clickbait, and duplicate articles.
- Focus on concrete facts: cite specific players, dates, and match names.
- Keep bullet points concise but highly information-dense.
- If no data fits a category, return an empty array. Do not invent details.
- Prioritize reports from reliable athletic/journalistic sources.

Respond strictly as JSON:
{
  "injuriesAndSuspensions": string[],
  "tacticalInsights": string[],
  "narrativeDrama": string[]
}`;

  try {
    const result = await generateJSON<SynthesizedNews>(systemPrompt, `Team: ${teamName}\n\nArticles:\n${articleSummaries}`);
    return {
      injuriesAndSuspensions: result.injuriesAndSuspensions || [],
      tacticalInsights: result.tacticalInsights || [],
      narrativeDrama: result.narrativeDrama || [],
    };
  } catch (err) {
    console.error(`Synthesizer failed for ${teamName}:`, err);
    return { injuriesAndSuspensions: [], tacticalInsights: [], narrativeDrama: [] };
  }
}
