import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'engelvoelkers' as const;
const BASE_URL = 'https://www.engelvoelkers.com';

function buildUrl(params: SearchParams): string {
  const typ = params.transaction === 'sale' ? 'buy' : 'rent';
  return `${BASE_URL}/en-lu/search/?q=&businessArea=residential&sortField=sortPrice&sortOrder=DESC&pageSize=18&facets=cntry%3Aluxembourg%3Btyp%3A${typ}`;
}

export async function scrapeEngelVoelkers(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  // E&V is React-rendered — Cheerio rarely works, Playwright may be needed.
  let $ = await fetchHtml(url, { Referer: 'https://www.google.com/' });
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '[class*="property-card"]',
    '[class*="PropertyCard"]',
    '.ev-property-card',
    'article.property',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL) : [];
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
