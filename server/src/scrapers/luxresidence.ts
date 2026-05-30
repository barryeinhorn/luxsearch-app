import type { Property, SearchParams } from '../types.js';
import { fetchHtml, fetchWithPlaywright, extractCardsFromPage } from './shared.js';

const SOURCE = 'luxresidence' as const;
const BASE_URL = 'https://www.luxresidence.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'sale' : 'rent';
  return `${BASE_URL}/en/${tx}`;
}

export async function scrapeLuxresidence(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  let $ = await fetchHtml(url);
  let results = $ ? extractCardsFromPage($, SOURCE, BASE_URL, [
    '.property',
    '[class*="listing"]',
    '.bien-item',
    'article.property',
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
