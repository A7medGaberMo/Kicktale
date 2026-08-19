export const FINISHED_STATUSES = new Set(['FINISHED', 'FT', 'COMPLETED', 'AWARDED']);
export const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

export function isFinishedStatus(status?: string | null): boolean {
  return FINISHED_STATUSES.has((status || '').toUpperCase());
}

export function isLiveStatus(status?: string | null): boolean {
  return LIVE_STATUSES.has((status || '').toUpperCase());
}

export function hasPlayableTeams(match: any): boolean {
  const home = match.homeTeam?.name || match.home_team_name;
  const away = match.awayTeam?.name || match.away_team_name;
  return Boolean(home && away && home !== 'TBD' && away !== 'TBD');
}

/**
 * Curated list of elite clubs and national teams for top-tier focus.
 */
const TOP_TEAM_KEYWORDS = [
  // Premier League
  'arsenal', 'manchester city', 'man city', 'liverpool', 'manchester united',
  'man utd', 'chelsea', 'tottenham', 'spurs', 'newcastle', 'aston villa',
  // La Liga
  'real madrid', 'barcelona', 'atlético', 'atletico madrid', 'athletic club',
  'real sociedad', 'sevilla', 'villarreal', 'betis',
  // Serie A
  'inter', 'internazionale', 'ac milan', 'milan', 'juventus', 'napoli',
  'roma', 'as roma', 'lazio', 'atalanta', 'fiorentina',
  // Bundesliga
  'bayern', 'bayern münchen', 'bayern munich', 'borussia dortmund', 'dortmund',
  'bayer leverkusen', 'leverkusen', 'rb leipzig', 'leipzig', 'frankfurt', 'stuttgart',
  // Ligue 1 & Other Elite Europe
  'paris saint-germain', 'psg', 'marseille', 'monaco', 'lyon', 'lille',
  'sporting', 'sporting cp', 'benfica', 'porto', 'fc porto', 'ajax',
  'feyenoord', 'psv', 'celtic', 'rangers', 'galatasaray', 'fenerbahce',
  // Top National Teams (World Cup / Euro)
  'argentina', 'france', 'england', 'brazil', 'spain', 'germany', 'portugal',
  'netherlands', 'italy', 'belgium', 'croatia', 'morocco', 'uruguay',
  'colombia', 'japan', 'united states', 'usa', 'mexico', 'switzerland',
  'denmark', 'austria', 'turkey', 'nigeria', 'senegal', 'egypt', 'algeria'
];

export function isTopTeam(name?: string | null): boolean {
  if (!name) return false;
  const lower = name.toLowerCase().trim();
  return TOP_TEAM_KEYWORDS.some(k => lower.includes(k));
}

export function isTopTeamMatch(match: any): boolean {
  const home = match.homeTeam?.name || match.home_team_name;
  const away = match.awayTeam?.name || match.away_team_name;
  const compCode = (match.competition?.code || match.competition_code || '').toUpperCase();

  // Champions League knockout rounds and World Cup/Euro knockouts are always marquee
  const isEliteComp = compCode === 'CL' || compCode === 'UCL' || compCode === 'WC' || compCode === 'EC';
  const stage = (match.stage || '').toUpperCase();
  const isKnockout = stage.includes('KNOCKOUT') || stage.includes('ROUND_OF') || stage.includes('QUARTER') || stage.includes('SEMI') || stage.includes('FINAL');

  if (isEliteComp && isKnockout) return true;

  // Match features at least one top team
  return isTopTeam(home) || isTopTeam(away);
}

export function isContentEligibleMatch(match: any, now = new Date()): boolean {
  if (isFinishedStatus(match.status) || !hasPlayableTeams(match)) return false;
  if (!isTopTeamMatch(match)) return false;
  if (isLiveStatus(match.status)) return true;

  const rawDate = match.utcDate || match.utc_date;
  const kickoff = rawDate ? new Date(rawDate) : null;
  if (!kickoff || Number.isNaN(kickoff.getTime())) return false;

  const staleCutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return kickoff >= staleCutoff;
}

