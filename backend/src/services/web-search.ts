import { config } from '../config/index.js';
import { logger } from './logger.js';

// ── Search result types ───────────────────────────────────

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  results: SearchResult[];
  provider: 'tavily' | 'google';
  cached: boolean;
}

// ── Simple in-memory cache for search results ─────────────

interface CacheEntry {
  data: WebSearchResponse;
  expiresAt: number;
}

const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCachedSearch(query: string): WebSearchResponse | null {
  const key = query.toLowerCase().trim();
  const entry = searchCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return { ...entry.data, cached: true };
  }
  if (entry) searchCache.delete(key);
  return null;
}

function setCachedSearch(query: string, data: WebSearchResponse): void {
  const key = query.toLowerCase().trim();
  searchCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });

  // Evict old entries if cache grows too large
  if (searchCache.size > 200) {
    const now = Date.now();
    for (const [k, v] of searchCache) {
      if (v.expiresAt < now) searchCache.delete(k);
    }
  }
}

// ── Tavily search ─────────────────────────────────────────

async function searchTavily(query: string): Promise<WebSearchResponse> {
  const res = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: config.tavilyApiKey,
      query,
      search_depth: 'basic',
      max_results: 5,
      include_answer: false,
      include_raw_content: false,
    }),
    signal: AbortSignal.timeout(10000), // 10 s timeout
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Tavily error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as any;

  const results: SearchResult[] = (data.results || []).map(
    (r: { title: string; url: string; content: string }) => ({
      title: r.title,
      url: r.url,
      snippet: r.content?.slice(0, 300) || '',
    }),
  );

  return { query, results, provider: 'tavily', cached: false };
}

// ── Google Custom Search fallback ─────────────────────────

async function searchGoogle(query: string): Promise<WebSearchResponse> {
  const params = new URLSearchParams({
    key: config.googleSearchApiKey,
    cx: config.googleSearchCx,
    q: query,
    num: '5',
  });

  const res = await fetch(
    `https://www.googleapis.com/customsearch/v1?${params.toString()}`,
    { signal: AbortSignal.timeout(10000) },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Search error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as any;

  const results: SearchResult[] = (data.items || []).map(
    (item: { title: string; link: string; snippet: string }) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet?.slice(0, 300) || '',
    }),
  );

  return { query, results, provider: 'google', cached: false };
}

// ── LangSearch fallback ───────────────────────────────────

async function searchLangSearch(query: string): Promise<WebSearchResponse> {
  const res = await fetch('https://api.langsearch.com/v1/web-search', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.langsearchApiKey}`,
    },
    body: JSON.stringify({
      query,
      freshness: 'noLimit',
      summary: false,
      count: 5,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LangSearch error ${res.status}: ${body}`);
  }

  const data = (await res.json()) as any;

  const results: SearchResult[] = (data.data?.webPages?.value || []).map(
    (item: { name: string; url: string; snippet: string }) => ({
      title: item.name,
      url: item.url,
      snippet: item.snippet?.slice(0, 300) || '',
    }),
  );

  return { query, results, provider: 'tavily' as const, cached: false };
}

// ── Public API ────────────────────────────────────────────

/**
 * Perform a web search using Tavily (primary) with automatic
 * fallback chain: Tavily → LangSearch → Google Custom Search.
 */
export async function webSearch(query: string): Promise<WebSearchResponse> {
  // Check cache first
  const cached = getCachedSearch(query);
  if (cached) {
    logger.info(`🔍 Web search (cached): "${query}"`);
    return cached;
  }

  // Try Tavily first
  if (config.tavilyApiKey) {
    try {
      const result = await searchTavily(query);
      logger.info(`🔍 Tavily search: "${query}" → ${result.results.length} results`);
      setCachedSearch(query, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`⚠️ Tavily failed: ${msg} – falling back to LangSearch`);
    }
  }

  // Fallback to LangSearch
  if (config.langsearchApiKey) {
    try {
      const result = await searchLangSearch(query);
      logger.info(`🔍 LangSearch fallback: "${query}" → ${result.results.length} results`);
      setCachedSearch(query, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn(`⚠️ LangSearch failed: ${msg} – falling back to Google`);
    }
  }

  // Fallback to Google Custom Search
  if (config.googleSearchApiKey && config.googleSearchCx) {
    try {
      const result = await searchGoogle(query);
      logger.info(`🔍 Google search fallback: "${query}" → ${result.results.length} results`);
      setCachedSearch(query, result);
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error(`❌ Google Search also failed: ${msg}`);
    }
  }

  // Return empty results if all fail
  logger.error('❌ All search providers failed');
  return { query, results: [], provider: 'tavily', cached: false };
}

/**
 * Format search results into a context string to inject into the AI prompt.
 */
export function formatSearchContext(searchResponse: WebSearchResponse): string {
  if (searchResponse.results.length === 0) return '';

  const lines = searchResponse.results.map(
    (r, i) =>
      `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`,
  );

  return `\n\n---\n📌 **Web Search Results** (query: "${searchResponse.query}"):\n\n${lines.join('\n\n')}\n\n---\nUse the above search results to provide an accurate, up-to-date answer. Cite sources when relevant using [Source Title](URL) format.\n`;
}

/**
 * Check whether any search provider is configured.
 */
export function isSearchConfigured(): boolean {
  return !!(
    config.tavilyApiKey ||
    config.langsearchApiKey ||
    (config.googleSearchApiKey && config.googleSearchCx)
  );
}

