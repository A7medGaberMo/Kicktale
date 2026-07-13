import { keyPool } from './keys';

async function fetchNewsWithRetry(url: string, retries = 3): Promise<any> {
  let attempts = 0;
  while (attempts < retries) {
    const key = await keyPool.getKey('news_api');
    try {
      const fullUrl = `${url}&apiKey=${key}`;
      const response = await fetch(fullUrl);

      if (response.status === 429) throw new Error('429 Rate Limit');
      if (!response.ok) throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);

      const data = await response.json();
      if (data.status === 'error') throw new Error(`NewsAPI Error: ${data.message}`);

      await keyPool.reportSuccess('news_api', key);
      return data;
    } catch (error: any) {
      attempts++;
      console.error(`NewsAPI attempt ${attempts} failed:`, error.message);
      await keyPool.reportFailure('news_api', key);
      if (attempts >= retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 2000 * Math.pow(2, attempts - 1)));
    }
  }
}

export interface NewsArticle {
  title: string;
  description: string;
  content: string;
  url: string;
  source: { name: string };
  publishedAt: string;
}

export async function fetchTeamNews(teamName: string): Promise<NewsArticle[]> {
  const domains = [
    'espn.com',
    'theathletic.com',
    'optaanalyst.com',
    'skysports.com',
    'bbc.co.uk',
    'goal.com',
    'fifa.com',
    'theguardian.com',
    'thetimes.co.uk',
    'telegraph.co.uk'
  ].join(',');

  // Search team with broader football keywords for richer results
  const encodedQuery = encodeURIComponent(
    `"${teamName}" AND (football OR soccer OR match OR squad OR injury OR form OR record OR milestone)`
  );
  const url = `https://newsapi.org/v2/everything?q=${encodedQuery}&domains=${domains}&language=en&sortBy=relevance&pageSize=10`;

  try {
    const data = await fetchNewsWithRetry(url);
    return data.articles || [];
  } catch (err) {
    console.error(`Failed to fetch news for ${teamName}:`, err);
    return [];
  }
}
