import { keyPool } from './keys';

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = 3): Promise<any> {
  let attempts = 0;
  while (attempts < retries) {
    const key = keyPool.getKey('football_data');
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          'X-Auth-Token': key,
        },
      });

      if (response.status === 429) throw new Error('429 Rate Limit');
      if (!response.ok) throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      keyPool.reportSuccess('football_data', key);
      return data;
    } catch (error: any) {
      attempts++;
      console.error(`Football-Data API error on attempt ${attempts}:`, error.message);
      keyPool.reportFailure('football_data', key);
      if (attempts >= retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 500 * attempts));
    }
  }
}

export interface TeamInfo {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface MatchData {
  id: number;
  utcDate: string;
  status: string;
  matchday: number;
  stage: string;
  group: string | null;
  homeTeam: TeamInfo;
  awayTeam: TeamInfo;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
  };
}

export async function getCompetitionMatches(competitionCode: string): Promise<MatchData[]> {
  const url = `https://api.football-data.org/v4/competitions/${competitionCode}/matches`;
  const data = await fetchWithRetry(url);
  return data.matches || [];
}

export async function getGeneralMatches(dateFrom?: string, dateTo?: string): Promise<any[]> {
  let url = 'https://api.football-data.org/v4/matches';
  const params: string[] = [];
  if (dateFrom) params.push(`dateFrom=${dateFrom}`);
  if (dateTo) params.push(`dateTo=${dateTo}`);
  if (params.length > 0) {
    url += `?${params.join('&')}`;
  }
  const data = await fetchWithRetry(url);
  return data.matches || [];
}

export async function getMatchDetails(matchId: number): Promise<any> {
  const url = `https://api.football-data.org/v4/matches/${matchId}`;
  return await fetchWithRetry(url);
}

export async function getCompetitionStandings(competitionCode: string): Promise<any> {
  const url = `https://api.football-data.org/v4/competitions/${competitionCode}/standings`;
  return await fetchWithRetry(url);
}
