import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'homein' as const;
const BASE_URL = 'https://www.homein.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'sale' : 'rent';
  const type = params.propertyType === 'all' ? 'apartment' : params.propertyType;
  return `${BASE_URL}/en/${tx}/${type}`;
}

export async function scrapeHomein(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.property-item',
    '[class*="listing"]',
    '.result',
  ]) : [];

  if (results.length === 0) {
    console.log(`[${SOURCE}] Cheerio 0 — trying Playwright`);
    $ = await fetchWithPlaywright(url);
    results = $ ? extractCardsFromPage($, SOURCE, BASE_URL) : [];
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
