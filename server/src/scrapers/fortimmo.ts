import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'fortimmo' as const;
const BASE_URL = 'https://www.fortimmo.lu';

function buildUrl(params: SearchParams): string {
  return params.transaction === 'sale' ? `${BASE_URL}/vente/` : `${BASE_URL}/location/`;
}

export async function scrapeFortimmo(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.property',
    '.listing-item',
    '[class*="bien"]',
    '.annonce',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL) : [];
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
