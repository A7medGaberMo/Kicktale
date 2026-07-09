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
  h2hHistory: string;       // Real H2H data from web
  recordsMilestones: string; // Real records/milestones from web
  recentForm: string;        // Real form data
  injuries: string;          // Latest injury news
  tacticalAnalysis: string;  // Real tactical analysis
  refereeInfo: string;       // Referee info if available
  venueInfo: string;         // Venue/atmosphere info
}

/**
 * Run parallel web searches to enrich match context with real, verifiable data.
 */
export async function enrichMatchData(
  homeTeam: string,
  awayTeam: string,
  competition: string
): Promise<EnrichedMatchData> {
  const matchQuery = `"${homeTeam}" "${awayTeam}" ${competition}`;

  const searches = [
    searchWithTavily(`${matchQuery} head to head history results record`, 4),
    searchWithTavily(`${homeTeam} ${competition} recent form results goals scorers 2026`, 4),
    searchWithTavily(`${awayTeam} ${competition} recent form results goals scorers 2026`, 4),
    searchWithTavily(`${homeTeam} injury squad news latest`, 3),
    searchWithTavily(`${awayTeam} injury squad news latest`, 3),
    searchWithTavily(`${matchQuery} tactical analysis formation style`, 3),
    searchWithTavily(`${matchQuery} stadium venue referee atmosphere`, 3),
    searchWithTavily(`${homeTeam} ${awayTeam} milestone record player achievement`, 3),
  ];

  const allResults = await Promise.allSettled(searches);
  const [h2hRes, homeFormRes, awayFormRes, homeInjRes, awayInjRes, tactRes, venueRes, recRes] = allResults;

  const extractContent = (r: PromiseSettledResult<TavilySearchResult[]>, maxChars = 1200): string => {
    if (r.status !== 'fulfilled' || r.value.length === 0) return '';
    return r.value
      .slice(0, 3)
      .map(item => `[${item.title}](${item.url})\n${item.content}`)
      .join('\n\n')
      .substring(0, maxChars);
  };

  const recordsMilestones = extractContent(recRes, 1500);
  const recentForm = `${homeTeam}: ${extractContent(homeFormRes, 800)}\n\n${awayTeam}: ${extractContent(awayFormRes, 800)}`;
  const injuries = `${homeTeam}: ${extractContent(homeInjRes, 600)}\n\n${awayTeam}: ${extractContent(awayInjRes, 600)}`;
  const tacticalAnalysis = extractContent(tactRes, 1200);
  const venueInfo = extractContent(venueRes, 800);

  // Try H2H from primary search; if empty, fallback to broader query
  let h2hHistory = extractContent(h2hRes, 1500);
  if (!h2hHistory) {
    const fallback = await searchWithTavily(`${homeTeam} vs ${awayTeam} all time record stats`, 4);
    h2hHistory = fallback.slice(0, 3).map(i => `[${i.title}]\n${i.content}`).join('\n\n').substring(0, 1500);
  }

  return {
    h2hHistory,
    recordsMilestones,
    recentForm,
    injuries,
    tacticalAnalysis,
    refereeInfo: '',  // Tavily rarely returns referee data; keep slot for future
    venueInfo,
  };
}
