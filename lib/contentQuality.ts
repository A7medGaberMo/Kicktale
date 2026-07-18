const VALID_INSIGHT_TYPES = new Set([
  'H2HHistory',
  'FormMomentum',
  'TacticalClash',
  'KeyBattles',
  'SquadIntel',
  'StakesContext',
  'RecordWatch',
  'VenueEdge',
  'ManagerDuel',
  'SetPieceAngle',
  'XFactor',
  'MatchVerdict',
]);

const BAD_CONTENT_PATTERNS = [
  /^Analysis:\s*/i,
  /\b\d+\/100 score\b/i,
  /\b\d+%\s*confidence(\s*level)?\b/i,
  /\bModel confidence:\s*\d+%/i,
  /no (data|information|record|milestone|notable|significant|stats|relevant)/i,
  /\bit remains to be seen\b/i,
  /\bonly time will tell\b/i,
  /\bin what promises to be\b/i,
  /\bpromises to be\b/i,
  /\bthrilling encounter\b/i,
  /\bfootballing powerhouses\b/i,
  /\bclash of (the )?titans\b/i,
];

function countWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function isPublishableInsight(insight: any) {
  const title = String(insight.title || '').trim();
  const content = String(insight.content || '').trim();
  const evidence = String(insight.evidence || '').trim();
  const words = countWords(content);

  if (!VALID_INSIGHT_TYPES.has(insight.insight_type)) return false;
  if (!title || title.split(/\s+/).length < 3) return false;
  if (!content || words < 100 || words > 300) return false;
  if (!evidence || evidence.length < 30) return false;
  if (BAD_CONTENT_PATTERNS.some(pattern => pattern.test(title) || pattern.test(content) || pattern.test(evidence))) {
    return false;
  }
  return true;
}
