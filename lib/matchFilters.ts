export const FINISHED_STATUSES = new Set(['FINISHED', 'FT', 'COMPLETED', 'AWARDED']);
export const LIVE_STATUSES = new Set(['LIVE', 'IN_PLAY', 'PAUSED']);

export function isFinishedStatus(status?: string | null) {
  return FINISHED_STATUSES.has((status || '').toUpperCase());
}

export function isLiveStatus(status?: string | null) {
  return LIVE_STATUSES.has((status || '').toUpperCase());
}

export function hasPlayableTeams(match: any) {
  const home = match.homeTeam?.name || match.home_team_name;
  const away = match.awayTeam?.name || match.away_team_name;
  return Boolean(home && away && home !== 'TBD' && away !== 'TBD');
}

export function isContentEligibleMatch(match: any, now = new Date()) {
  if (isFinishedStatus(match.status) || !hasPlayableTeams(match)) return false;
  if (isLiveStatus(match.status)) return true;

  const rawDate = match.utcDate || match.utc_date;
  const kickoff = rawDate ? new Date(rawDate) : null;
  if (!kickoff || Number.isNaN(kickoff.getTime())) return false;

  const staleCutoff = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return kickoff >= staleCutoff;
}
