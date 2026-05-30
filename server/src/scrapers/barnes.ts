import type { Property, SearchParams } from '../types.js';
import { fetchHtml, generateId, makeProperty, parsePrice, extractCommune, extractFeatures } from './shared.js';

const SOURCE = 'barnes' as const;
const BASE_URL = 'https://www.barnes-luxembourg.com';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'buy' : 'rent';
  return `${BASE_URL}/en/${tx}/`;
}

export async function scrapeBarnes(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  const $ = await fetchHtml(url);
  if (!$) {
    console.log(`[${SOURCE}] 0 listings (fetch failed)`);
    return [];
  }

  const cards = $('.box-location').toArray();
  console.log(`[${SOURCE}] found ${cards.length} .box-location cards`);

  const results: Property[] = [];
  for (const card of cards.slice(0, 30)) {
    const el = $(card);
    const href = el.find('a').first().attr('href') ?? '';
    const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;

    // Filter to correct transaction type by URL pattern
    if (params.transaction === 'rent' && href.includes('/vente/')) continue;
    if (params.transaction === 'sale' && href.includes('/location/')) continue;

    const title = el.find('span.sub-title, .sub-title').first().text().trim()
      || el.find('img').first().attr('alt') || '';
    const priceText = el.find('h6.title, .title').first().text().trim();
    const price = parsePrice(priceText);
    if (!price || price < 100) continue;

    const image = el.find('img').first().attr('data-src')
      || el.find('img').first().attr('src') || '';

    // Bedrooms from title: "2 chambres"
    const bedroomMatch = title.match(/(\d+)\s*chambre/i);
    const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : 0;

    // Area from title: "180m2" or "180 m²"
    const areaMatch = title.match(/(\d+)\s*m[²2]/i);
    const area = areaMatch ? parseInt(areaMatch[1]) : 0;

    const commune = extractCommune(title);

    results.push(makeProperty(SOURCE, {
      id: generateId(SOURCE, sourceUrl ?? title + price),
      sourceUrl,
      title: title || undefined,
      transaction: params.transaction,
      price,
      bedrooms,
      area,
      commune,
      images: image ? [image] : [],
      lat: 0,
      lng: 0,
      features: extractFeatures(title),
    }));
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
