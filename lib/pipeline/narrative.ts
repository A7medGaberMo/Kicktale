import { generateJSON } from '../services/llm';
import { DiscoveredInsight } from './discovery';

export interface GeneratedNarrative {
  title: string;
  content: string;
  evidence: string;
}

function getPillarWritingGuidelines(insightType: string): string {
  const guidelines: Record<string, string> = {
    H2HHistory: `VIBE: Rivalry, Tension, History.
NARRATIVE: Start with a sharp hook about the venue or streak. Highlight the exact dates or scoring patterns that define this fixture.
EXAMPLE: "Argentina have won just once in their last 8 visits to this ground — a 94th-minute penalty. Can they break the curse tonight?"`,
    RecordsMilestones: `VIBE: Legacy, Urgency, Historic.
NARRATIVE: Lead with the exact record on the line. Make it feel massive. Frame the player/team as chasing history.
EXAMPLE: "History on the line: Messi needs ONE goal to become the all-time top scorer against this exact opponent. A record standing since 1998."`,
    FormGuide: `VIBE: Analytical but punchy.
NARRATIVE: Expose the reality of current form using underlying numbers (xG, defensive stats). Show what the results hide.
EXAMPLE: "Don't let the 4-game unbeaten streak fool you. Their xG conceded is 1.8 per game. They are surviving, not dominating."`,
    StorylinesStakes: `VIBE: High-Stakes, Do-or-Die.
NARRATIVE: Frame the match's significance through table math and points. Make the pressure palpable.
EXAMPLE: "Win or go home. A loss here leaves them mathematically eliminated from the title race, requiring a 12-point swing in 4 matches."`,
    VenueConditions: `VIBE: Atmospheric, Nostalgic, Haunting.
NARRATIVE: Recall a memorable, authentic past match played at this specific stadium. Frame how that history haunts or inspires today's clash.
EXAMPLE: "The ghosts of 2017: The last time these two met in this stadium, a 19-year-old scored a hat-trick that shocked the world. Seven years later, the tension remains."`,
    RefereeWatch: `VIBE: Investigative, Sharp.
NARRATIVE: Highlight the referee's exact historical win/loss and card record with these specific teams.
EXAMPLE: "Caution advised: Referee [Name] averages 4.7 yellow cards per game in this competition. The hosts have won just 1 of their last 6 matches under his watch."`,
    InjuryImpact: `VIBE: Consequential, Structural Shift.
NARRATIVE: Explain the absence through statistical drop-off. Show how xG or win percentage changes without the star player.
EXAMPLE: "A massive blow: Without [Player], their xG drops from 2.1 to 0.8 per game, and their win rate plummets by 40%."`
  };
  return guidelines[insightType] || 'Write a compelling, specific narrative backed by data.';
}

export async function generateNarrative(insight: DiscoveredInsight): Promise<GeneratedNarrative> {
  const pillarGuide = getPillarWritingGuidelines(insight.insightType);

  const systemPrompt = `You are Kicktale's Premium Narrative Engine — an elite football copywriter at The Athletic / Opta Analyst tier. Your content is read by serious football fans who demand depth, data, and narrative craft.

MISSION: Transform a raw quantitative football insight into a viral, engaging, and premium Social Media-ready block. It must be perfect to copy-paste into X (Twitter), Facebook, or Instagram.

EDITORIAL STANDARDS (The "Vibe" & The "Math"):
1. The Hook: Start with an attention-grabbing first sentence.
2. The Math: Anchor the narrative heavily in authentic numbers, milestones, and dates. Ensure 100% accuracy based on the provided context.
3. The Formatting: Use rich Markdown, clean line breaks, and bold text for key stats to make it incredibly scannable. Write professionally. DO NOT use emojis.
4. The Vibe: Keep the tone premium, elite, and analytical—like an Opta Analyst or The Athletic journalist hyping up the match using underlying data.
5. Zero clichés: Ban "clash of titans", "must-win", "game of two halves". Use specific statistics to build the hype instead.

OUTPUT FORMAT (Valid JSON only):
{
  "title": "A sharp, engaging headline (max 8 words) highlighting the core story.",
  "content": "A beautifully formatted data-journalism block. Use clean line breaks, bullet points, and bold stats. No emojis. Professional tone.",
  "evidence": "A one-line strict numerical stat summary."
}

PILLAR-SPECIFIC VOICE:
${pillarGuide}`;

  const userPrompt = `Write a premium narrative for this insight:
Match: ${insight.entityName} (${insight.entityType})
Pillar: ${insight.insightType}
Evidence: ${insight.evidence}
Score: ${insight.score}/100 | Confidence: ${(insight.confidence * 100).toFixed(0)}%`;

  try {
    const result = await generateJSON<GeneratedNarrative>(systemPrompt, userPrompt);
    return {
      title: result.title || '',
      content: result.content || '',
      evidence: result.evidence || insight.evidence,
    };
  } catch (err) {
    console.error(`Narrative Engine failed for ${insight.entityName} (${insight.insightType}):`, err);
    return {
      title: insight.entityName,
      content: `Analysis: ${insight.evidence}`,
      evidence: insight.evidence,
    };
  }
}
