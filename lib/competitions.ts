export const TOP_LEVEL_COMPETITIONS = new Set([
  'WC',
  'CL',
  'UCL',
  'EL',
  'UEL',
  'PL',
  'PD',
  'SA',
  'BL1',
  'FL1',
  'EC',
  'CAN',
]);

const COMPETITION_ALIASES: Record<string, string> = {
  UCL: 'CL',
  UEL: 'EL',
};

export function normalizeCompetitionCode(code?: string | null): string {
  const upper = (code || '').toUpperCase();
  return COMPETITION_ALIASES[upper] || upper;
}

export function isTopLevelCompetition(code?: string | null): boolean {
  const upper = (code || '').toUpperCase();
  return TOP_LEVEL_COMPETITIONS.has(upper) || TOP_LEVEL_COMPETITIONS.has(normalizeCompetitionCode(upper));
}
