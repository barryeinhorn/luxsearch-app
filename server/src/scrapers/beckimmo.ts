import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'beckimmo' as const;
const BASE_URL = 'https://www.beckimmo.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'vente' : 'location';
  return `${BASE_URL}/property-transaction/${tx}/`;
}

export async function scrapeBeckimmo(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.listing_item',
    '.property',
    '[class*="listing"]',
    'article',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL) : [];
  }

  const filtered = params.maxTotalPrice > 0
    ? results.filter(p => p.price <= params.maxTotalPrice)
    : results;
  console.log(`[${SOURCE}] ${filtered.length} listings`);
  return filtered;
}
