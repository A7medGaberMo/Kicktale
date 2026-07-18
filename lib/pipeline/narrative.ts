import { generateJSON } from '../services/llm';
import { DiscoveredInsight } from './discovery';

export interface GeneratedNarrative {
  title: string;
  content: string;
  evidence: string;
}

function getPillarWritingGuidelines(insightType: string): string {
  const guidelines: Record<string, string> = {
    H2HHistory: `VOICE: Authoritative historian. You're the rivalry expert who remembers every meeting.
FORMAT:
- Open with the single most striking H2H statistic (a dominance run, a venue curse, a scoring pattern).
- Build context with 2-3 supporting historical data points (recent meetings, venue-specific record, goal patterns).
- Close with what this history means for TODAY'S match specifically.
REFERENCE: "This will be the 178th meeting between these sides. The home team have won 9 of the last 12 at this venue, scoring 28 goals. But their dominance masks a vulnerability — in 4 of those wins, they trailed at half-time."`,

    FormMomentum: `VOICE: Data analyst who reads between the results. You expose what the scoreline hides.
FORMAT:
- Lead with the headline form stat (streak, PPG, goals scored/conceded run).
- Dig underneath with xG, shot quality, or defensive exposure data.
- Conclude with a "but" — reveal the hidden truth the results don't show.
REFERENCE: "Unbeaten in 9, but the underlying data tells a troubling story. Their xG per game has dropped from 2.1 to 1.3 across this run, while opponents have averaged 1.7 xG against them. This run is built on margins, not dominance."`,

    TacticalClash: `VOICE: Tactical analyst who sees the game before it happens. Think Tifo Football or The Coaches' Voice.
FORMAT:
- Identify THE decisive structural matchup (e.g., wing-backs vs narrow midfield, high line vs pace).
- Explain WHY this creates an advantage/vulnerability with specific player roles.
- Predict how this shapes the game's tempo and key zones.
REFERENCE: "The 3-4-3 vs 4-2-3-1 creates a numbers advantage on the flanks. The wing-backs will find space behind the opposition's wide midfielders, who must track back into unfamiliar defensive territory. The battle for flank control will decide the outcome."`,

    KeyBattles: `VOICE: Scout filing a player intelligence report. Specific, comparative, ruthless.
FORMAT:
- Name the specific player-vs-player duel and why it matters.
- Compare their recent stats head-to-head (goals, duel win %, chances created).
- Assess who has the edge and why.
REFERENCE: "Vinícius Jr (11 goals, 6.2 dribbles/game) vs Kyle Walker (78% tackle success, 2.1 interceptions/game). When elite pace meets elite recovery, positioning wins. Walker has contained Vinícius in 2 of their 3 meetings — but the one time he didn't, it produced a hat-trick."`,

    SquadIntel: `VOICE: Inside-source reporter with the latest from the training ground.
FORMAT:
- Lead with the most impactful absence/return and its statistical consequence.
- Quantify the drop-off or uplift (e.g., "without Player X, they concede 0.7 more goals/game").
- Note any selection dilemmas, rotation risks, or fitness doubts.
REFERENCE: "The defensive crisis deepens. Without their first-choice centre-back pairing, they've conceded 11 goals in 4 games — a rate of 2.75/game vs their season average of 0.9. The makeshift partnership has won just 41% of aerial duels."`,

    StakesContext: `VOICE: League table mathematician who makes the permutations visceral.
FORMAT:
- State the mathematical reality plainly (points needed, gap to target, scenarios).
- Show what each result (win/draw/loss) means for both teams' objectives.
- Make the pressure FELT — use "if they lose here..." framing.
REFERENCE: "The arithmetic is brutal: 3 points from 4 remaining matches keeps them alive. Anything less, and a 4-year stay in the top division ends. Their opponents need a point to confirm their place in the Champions League — the financial stakes alone are worth €40M."`,

    RecordWatch: `VOICE: Football historian marking a landmark moment.
FORMAT:
- State the exact record on the line (number needed, current tally, record holder).
- Provide historical context (how long the record has stood, who set it).
- Frame the significance — why this matters beyond the number.
REFERENCE: "One goal separates him from immortality. With 183 goals, he needs just 1 more to surpass the club's all-time record held by Bobby Charlton since 1973. No player in the club's 146-year history has scored more."`,

    VenueEdge: `VOICE: Atmospheric reporter who makes you feel the stadium before kickoff.
FORMAT:
- Lead with the home/away record at this specific ground (wins, draws, losses, period).
- Add atmosphere/environmental context (capacity, altitude, travel, crowd factor).
- Recall a memorable past encounter at this venue that sets the tone.
REFERENCE: "The Westfalenstadion has been impregnable: 19W-3D-0L in the last 22 home league matches. The 81,365 capacity — Europe's largest standing section — creates a wall of noise that has broken visiting teams. The last side to win here? Bayern, in November 2022."`,

    ManagerDuel: `VOICE: Tactical biographer comparing two football minds.
FORMAT:
- State the head-to-head managerial record (W-D-L between these two specific managers).
- Contrast their tactical philosophies in this specific matchup context.
- Note any press conference quotes or strategic adjustments expected.
REFERENCE: "Ancelotti vs Guardiola: the most cerebral rivalry in modern football. Ancelotti leads 4-3-2 in competitive meetings. His pragmatic adaptability has consistently neutralized Guardiola's positional play — particularly in knockout ties, where Ancelotti is 3-1."`,

    SetPieceAngle: `VOICE: Set-piece specialist analyst (think Brentford's data department).
FORMAT:
- Quantify the set-piece reliance or vulnerability (% of goals, conversion rate).
- Identify the specific threat (corner routines, free-kick taker, aerial dominance).
- Contrast with opponent's defensive set-piece record.
REFERENCE: "Set pieces could be decisive. 34% of their goals this season originate from dead-ball situations — 3rd highest in the league. Their opponents have conceded from corners at twice the league average, winning just 38% of defensive aerial duels."`,

    XFactor: `VOICE: Storyteller spotting the narrative nobody else sees.
FORMAT:
- Introduce the wildcard element (breakout player, super-sub, former club revenge, comeback story).
- Back it with surprising statistics that prove the narrative.
- Explain why THIS match is where the story peaks.
REFERENCE: "Six weeks ago, he was playing reserve football. Now, with 4 goals in 3 starts, the 19-year-old is the story of the season. His shot conversion rate (33%) dwarfs the squad average (12%). This is his first start against a top-6 side — where legends announce themselves."`,

    MatchVerdict: `VOICE: Expert tipster who shows their working. Confident but evidence-based.
FORMAT:
- State your prediction clearly (result, scoreline, and percentage confidence).
- List the 3 key factors driving the prediction (backed by data from the dossier).
- Add a "risk factor" — the one thing that could upset the prediction.
REFERENCE: "PREDICTION: Home Win 2-1 (Model confidence: 62%)\\n\\n**Decisive Factors:**\\n1. Home's set-piece dominance (34% of goals) vs Away's aerial vulnerability (38% duel win rate)\\n2. xG momentum: Home averaging 2.1 at this venue vs Away's 1.1 on the road\\n3. Squad availability: Away missing their top scorer and first-choice LB\\n\\n**Upset Factor:** Away's counter-attack speed (3.2 sec avg transition) could exploit Home's high defensive line."`
  };
  return guidelines[insightType] || 'Write a compelling, data-anchored narrative with structural depth and analytical precision.';
}

export async function generateNarrative(insight: DiscoveredInsight): Promise<GeneratedNarrative> {
  const pillarGuide = getPillarWritingGuidelines(insight.insightType);

  const systemPrompt = `You are Kicktale's Narrative Architect — writing at the level of ESPN FC's analytical features, TNT Sports' matchday coverage, and Opta Analyst's data-driven storytelling.

MISSION: Transform a raw intelligence insight into premium, publication-ready analysis. The strongest Kicktale posts explain records, milestones, stakes, hidden context, and match-defining implications — not generic preview filler.

EDITORIAL ARCHITECTURE (The ESPN/Opta Standard):
1. THE HOOK — Open with a specific, startling number or angle. "Arsenal have scored 12 goals from set pieces this season — more than any side in Europe's top five leagues." Not "Set pieces could play a big role."
2. THE DEPTH — Build with 2-3 evidence layers. Each paragraph introduces a NEW data point, never repeats the previous one. Use comparative context: league rank, percentile, historical comparison.
3. THE EDGE — Close with the match-specific implication. What does this statistic MEAN for this fixture? How does it shape the tactical approach?
4. THE FORMAT — Markdown with purposeful structure: **bold** for all numbers and key names, line breaks between paragraphs, bullet points only for comparative data (never for narrative flow).

NON-NEGOTIABLE QUALITY STANDARDS (Premium Editorial):
- Every paragraph must contain a specific statistic with context (league rank, percentile, time period).
- Ban all lazy football writing: "must-win", "game of two halves", "clash of the titans", "fierce rivals", "it remains to be seen", "only time will tell", "in what promises to be", "the beautiful game".
- No emojis, hashtags, slang, or social media tone. This is premium sportswriting.
- Present tense for match analysis, past tense for historical context.
- Content density: 250-380 words in 3-4 short paragraphs. Every sentence must add information — no padding. Match a rich ESPN/TNT/Squawka/Opta post, not a long feature.
- Specificity over generalization: "33% of their goals" not "a lot of their goals". "2.1 xG per game" not "strong attacking numbers".
- This is pre-match content only. Do not write recap language, post-match verdicts, or phrasing that suggests the match has already finished.
- Prefer record, milestone, stakes, and hidden-context framing whenever the evidence supports it.

CRITICAL TITLE RULES:
- The title MUST be a compelling headline of 5-10 words.
- The title MUST NEVER contain markdown formatting (no ** or * or _ or # characters).
- The title MUST NEVER be just a player name, team name, or generic label.
- The title MUST anchor on a specific stat, name + achievement, or angle.
- GOOD: "Mbappé's 7 Goals in 5 Games Redefine France's Attack"
- BAD: "Kylian Mbappe" or "**Spain vs Argentina**" or "France"

CRITICAL CONTENT RULES:
- NEVER mention internal scores, confidence levels, or model metrics in the content (e.g., "80/100 score", "90% confidence level", "Model confidence: 62%").
- NEVER start content with "Analysis:" — write naturally as premium journalism.
- Use ONLY currently active players. Do NOT reference retired players or players who have left their national team.
- All statistics must come from the provided evidence — do not fabricate data.

OUTPUT FORMAT (strict JSON):
{
  "title": "Headline (5-10 words). Plain text, NO markdown. Must anchor on specific name + number or stat.",
  "paragraphs": [
    "First paragraph of analysis (80-100 words). Must start with a specific number/stat or key name bolded.",
    "Second paragraph of analysis (80-100 words). Add supporting data points.",
    "Third paragraph of analysis (80-100 words). Elaborate on individual player roles or key matchups.",
    "Fourth paragraph of analysis (80-100 words, optional). Conclude with match-specific tactical implication."
  ],
  "evidence": "Single-line factual summary with the definitive numbers."
}

PILLAR-SPECIFIC VOICE & STRUCTURE:
${pillarGuide}`;

  const userPrompt = `Generate a premium analytical narrative for this intelligence node:

Subject: ${insight.entityName}
Entity Type: ${insight.entityType}
Analysis Pillar: ${insight.insightType}
Raw Evidence: ${insight.evidence}

Transform this into publication-quality content. The evidence above is verified — use it as your statistical foundation.`;

  try {
    const result = await generateJSON<any>(systemPrompt, userPrompt);

    // Post-process: strip any markdown that leaked into the title
    let title = (result.title || '').replace(/\*\*/g, '').replace(/^#+\s*/, '').trim();
    // If the LLM returned just a name, try to make it more descriptive
    if (title.split(' ').length <= 2 && insight.evidence) {
      const evidenceShort = insight.evidence.substring(0, 60).replace(/[.,;:]$/, '');
      title = `${title}: ${evidenceShort}`;
    }

    // Extract narrative text from paragraphs array or content string
    let rawContent = '';
    if (Array.isArray(result.paragraphs)) {
      rawContent = result.paragraphs.join('\n\n');
    } else if (typeof result.content === 'string') {
      rawContent = result.content;
    }

    // Post-process: clean content of leaked metrics
    const content = rawContent
      .replace(/^Analysis:\s*/i, '')
      .replace(/\b\d+\/100 score\b/gi, '')
      .replace(/\b\d+%\s*confidence(\s*level)?\b/gi, '')
      .replace(/\bconfidence\s*level\s*of\s*\d+%/gi, '')
      .replace(/\bModel confidence:\s*\d+%/gi, '')
      .replace(/,\s*,/g, ',')
      .trim();

    return {
      title,
      content,
      evidence: result.evidence || insight.evidence,
    };
  } catch (err) {
    console.error(`Narrative Engine failed for ${insight.entityName} (${insight.insightType}):`, err);
    // Better fallback: use evidence as content with proper framing
    const fallbackTitle = insight.entityName.split(' ').length <= 2
      ? `${insight.entityName} — Key Intelligence`
      : insight.entityName;
    return {
      title: fallbackTitle,
      content: insight.evidence,
      evidence: insight.evidence,
    };
  }
}
