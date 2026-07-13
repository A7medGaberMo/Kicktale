import { keyPool } from './keys';

interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
  published_date?: string;
}

interface TavilyResponse {
  answer?: string;
  query: string;
  results: TavilySearchResult[];
  response_time: number;
}

/**
 * Search the web via Tavily — returns real, source-grounded content.
 */
async function searchWithTavily(query: string, maxResults = 5): Promise<TavilySearchResult[]> {
  const key = keyPool.getKey('tavily');

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: key,
        query,
        max_results: maxResults,
        include_answer: true,
        search_depth: 'advanced'
      })
    });

    if (!res.ok) {
      const text = await res.text();
      if (res.status === 429) throw new Error('429 Rate Limit');
      throw new Error(`Tavily HTTP ${res.status}: ${text}`);
    }

    const data: TavilyResponse = await res.json();
    keyPool.reportSuccess('tavily', key);
    return data.results || [];
  } catch (err: any) {
    keyPool.reportFailure('tavily', key);
    console.error(`Tavily search failed for "${query.substring(0, 60)}":`, err.message);
    return [];
  }
}

export interface EnrichedMatchData {
  h2hHistory: string;          // Historical H2H record and rivalry context
  recordsMilestones: string;   // Player/team records and milestones approaching
  recentForm: string;          // Form data with underlying xG and performance stats
  injuries: string;            // Latest injury/suspension news
  tacticalAnalysis: string;    // Formation and tactical intelligence
  refereeInfo: string;         // Referee assignment and disciplinary record
  venueInfo: string;           // Venue/atmosphere/travel info
  managerAnalysis: string;     // Manager head-to-head and philosophy
  keyPlayers: string;          // Individual player form and key matchups
}

/**
 * Run targeted web searches to build a comprehensive match intelligence file.
 * Queries are crafted to find the specific analytical content that
 * sports data platforms (Opta, StatsBomb, FBref) produce.
 */
export async function enrichMatchData(
  homeTeam: string,
  awayTeam: string,
  competition: string
): Promise<EnrichedMatchData> {
  const matchup = `${homeTeam} vs ${awayTeam}`;
  const year = new Date().getFullYear();

  // Targeted search queries designed to find analytical content, not generic news
  const searches = [
    // H2H — find historical record and rivalry stats
    searchWithTavily(`"${homeTeam}" "${awayTeam}" head to head record all time wins draws history statistics`, 4),
    // Form — find xG and underlying performance data
    searchWithTavily(`${homeTeam} ${year} season statistics xG goals scored conceded form results`, 4),
    searchWithTavily(`${awayTeam} ${year} season statistics xG goals scored conceded form results`, 4),
    // Injuries — find confirmed squad news
    searchWithTavily(`${homeTeam} injury news squad update team news lineup ${year}`, 3),
    searchWithTavily(`${awayTeam} injury news squad update team news lineup ${year}`, 3),
    // Tactical — find formation and tactical analysis
    searchWithTavily(`${matchup} ${competition} tactical preview formation analysis key battles`, 3),
    // Venue — find stadium record and atmosphere
    searchWithTavily(`${matchup} stadium venue home record atmosphere ${year}`, 3),
    // Records — find milestones and landmarks
    searchWithTavily(`${homeTeam} ${awayTeam} player records milestones goals appearances ${year}`, 3),
    // Manager — find managerial analysis and philosophy
    searchWithTavily(`${matchup} manager head to head tactical philosophy press conference`, 3),
    // Key players — find individual form and matchup data
    searchWithTavily(`${matchup} key players form goals assists statistics ${year}`, 3),
  ];

  const allResults = await Promise.allSettled(searches);
  const [
    h2hRes, homeFormRes, awayFormRes,
    homeInjRes, awayInjRes,
    tactRes, venueRes, recRes,
    managerRes, keyPlayersRes
  ] = allResults;

  const extractContent = (r: PromiseSettledResult<TavilySearchResult[]>, maxChars = 1200): string => {
    if (r.status !== 'fulfilled' || r.value.length === 0) return '';
    return r.value
      .slice(0, 3)
      .map(item => `[${item.title}](${item.url})\n${item.content}`)
      .join('\n\n')
      .substring(0, maxChars);
  };

  const recordsMilestones = extractContent(recRes, 1500);
  const recentForm = `${homeTeam}: ${extractContent(homeFormRes, 1000)}\n\n${awayTeam}: ${extractContent(awayFormRes, 1000)}`;
  const injuries = `${homeTeam}: ${extractContent(homeInjRes, 800)}\n\n${awayTeam}: ${extractContent(awayInjRes, 800)}`;
  const tacticalAnalysis = extractContent(tactRes, 1500);
  const venueInfo = extractContent(venueRes, 1000);
  const managerAnalysis = extractContent(managerRes, 1000);
  const keyPlayers = extractContent(keyPlayersRes, 1200);

  // Try H2H from primary search; if empty, fallback to broader query
  let h2hHistory = extractContent(h2hRes, 1500);
  if (!h2hHistory) {
    const fallback = await searchWithTavily(`${homeTeam} vs ${awayTeam} all time record head to head stats`, 4);
    h2hHistory = fallback.slice(0, 3).map(i => `[${i.title}]\n${i.content}`).join('\n\n').substring(0, 1500);
  }

  return {
    h2hHistory,
    recordsMilestones,
    recentForm,
    injuries,
    tacticalAnalysis,
    refereeInfo: '',  // Tavily rarely returns referee-specific data; slot reserved
    venueInfo,
    managerAnalysis,
    keyPlayers,
  };
}
