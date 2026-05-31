import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'properstar' as const;
const BASE_URL = 'https://www.properstar.com';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'buy' : 'rent';
  const communeQ = params.communes.length > 0
    ? `?location=${encodeURIComponent(params.communes[0].toLowerCase())}`
    : '';
  return `${BASE_URL}/luxembourg/${tx}/apartment${communeQ}`;
}

export async function scrapeProperstar(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.property-listing-item',
    '[class*="listing-card"]',
    'article.property',
    '.search-result-item',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL) : [];
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
