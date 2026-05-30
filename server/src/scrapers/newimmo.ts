import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'newimmo' as const;
const BASE_URL = 'https://www.newimmo.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'sale' : 'rent';
  const type = params.propertyType === 'house' ? 'house' : 'apartment';
  return `${BASE_URL}/en/search?transaction=${tx}&type=${type}`;
}

export async function scrapeNewimmo(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.property-item',
    '.card-property',
    '[class*="listing"]',
    'article',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL) : [];
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
