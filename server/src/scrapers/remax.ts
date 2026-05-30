import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'remax' as const;
const BASE_URL = 'https://www.remax.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'buy' : 'rent';
  return `${BASE_URL}/en/search/${tx}/apartment`;
}

export async function scrapeRemax(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  // RE/MAX Luxembourg is React-rendered — try Cheerio first, expect to fall through.
  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '[class*="ListingCard"]',
    '[class*="property-card"]',
    '[class*="listing-card"]',
    '.property-item',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
      '[class*="ListingCard"]',
      '[class*="property-card"]',
    ]) : [];
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
