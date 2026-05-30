import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'immodirekt' as const;
const BASE_URL = 'https://www.immodirekt.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'buy' : 'rent';
  const type = params.propertyType === 'house' ? 'house' : 'apartment';
  return `${BASE_URL}/en/${tx}/${type}`;
}

export async function scrapeImmodirekt(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.property-item',
    '[class*="listing"]',
    '.annonce-item',
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
