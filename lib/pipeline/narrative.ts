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

  const systemPrompt = `You are Kicktale's Narrative Architect — a world-class football data journalist who writes at the intersection of The Athletic's editorial craft, Opta's statistical rigor, and StatsBomb's analytical depth.

MISSION: Transform a raw intelligence insight into a premium, publication-ready content block. This content should feel like it came from a paid subscription football analysis platform — NOT a generic preview site.

EDITORIAL ARCHITECTURE:
1. THE HOOK — Your first sentence must stop the scroll. Lead with the most striking data point or contrarian angle.
2. THE DEPTH — Build the narrative with 2-3 layers of supporting evidence. Each layer adds new information, not repetition.
3. THE EDGE — End with the "so what?" — what does this mean for the match? Connect the data to an outcome.
4. THE FORMAT — Use markdown formatting for scannability: **bold** key numbers, use line breaks between paragraphs, bullet points for comparative data.

NON-NEGOTIABLE QUALITY STANDARDS:
- Every paragraph must contain at least ONE specific statistic, name, or date.
- No filler phrases: ban "it remains to be seen", "only time will tell", "in what promises to be".
- No emojis. No hashtags. No social media language.
- No clichés: ban "clash of titans", "must-win", "game of two halves", "fierce rivals".
- Write in present tense for current analysis, past tense for historical facts.
- Content should be 150-300 words. Dense with information, not padded with atmosphere.

OUTPUT FORMAT (strict JSON):
{
  "title": "A sharp headline (5-10 words). Must contain a specific stat or name. Not generic.",
  "content": "The full narrative block. Multi-paragraph with markdown formatting. 150-300 words of pure analytical substance.",
  "evidence": "A single-line factual summary with the key numbers."
}

PILLAR-SPECIFIC VOICE & STRUCTURE:
${pillarGuide}`;

  const userPrompt = `Generate a premium analytical narrative for this intelligence node:

Subject: ${insight.entityName}
Entity Type: ${insight.entityType}
Analysis Pillar: ${insight.insightType}
Raw Evidence: ${insight.evidence}
Intelligence Score: ${insight.score}/100 | Confidence: ${(insight.confidence * 100).toFixed(0)}%

Transform this into publication-quality content. The evidence above is verified — use it as your statistical foundation.`;

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
