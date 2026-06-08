import { prisma } from '../prisma';
import { decrypt } from '../crypto';

export async function getSearchApiCredentials() {
  const settings = await prisma.settings.findFirst();
  
  let searchApiKey = process.env.SEARCHAPI_KEY || '';
  if (!searchApiKey && settings?.encryptedSearchApiKey) {
    try { searchApiKey = decrypt(settings.encryptedSearchApiKey); } catch(e) {}
  }
  
  let serpApiKey = process.env.SERPAPI_KEY || '';
  if (!serpApiKey && settings?.encryptedSerpApiKey) {
    try { serpApiKey = decrypt(settings.encryptedSerpApiKey); } catch(e) {}
  }
  
  return { searchApiKey, serpApiKey };
}

export interface SearchApiResult {
  title: string;
  url: string;
  snippet: string;
  provider: 'searchapi' | 'serpapi';
}

export async function performGoogleSearch(query: string, limit = 10): Promise<SearchApiResult[]> {
  const { searchApiKey, serpApiKey } = await getSearchApiCredentials();
  
  if (searchApiKey) {
    return await searchWithSearchApiIo(query, searchApiKey, limit);
  } else if (serpApiKey) {
    return await searchWithSerpApi(query, serpApiKey, limit);
  }
  
  return []; // Neither key available
}

async function searchWithSearchApiIo(query: string, apiKey: string, limit: number): Promise<SearchApiResult[]> {
  try {
    const url = new URL('https://www.searchapi.io/api/v1/search');
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', query);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('num', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`SearchAPI.io failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results: SearchApiResult[] = [];
    
    if (data.organic_results && Array.isArray(data.organic_results)) {
      for (const item of data.organic_results) {
        if (item.link && item.title) {
          results.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet || '',
            provider: 'searchapi'
          });
        }
      }
    }
    
    return results;
  } catch (err) {
    console.error('SearchAPI.io exception:', err);
    return [];
  }
}

async function searchWithSerpApi(query: string, apiKey: string, limit: number): Promise<SearchApiResult[]> {
  try {
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', query);
    url.searchParams.append('api_key', apiKey);
    url.searchParams.append('num', limit.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      console.warn(`SerpApi failed: ${response.status} ${response.statusText}`);
      return [];
    }

    const data = await response.json();
    const results: SearchApiResult[] = [];
    
    if (data.organic_results && Array.isArray(data.organic_results)) {
      for (const item of data.organic_results) {
        if (item.link && item.title) {
          results.push({
            title: item.title,
            url: item.link,
            snippet: item.snippet || '',
            provider: 'serpapi'
          });
        }
      }
    }
    
    return results;
  } catch (err) {
    console.error('SerpApi exception:', err);
    return [];
  }
}
