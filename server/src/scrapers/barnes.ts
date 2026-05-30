import type { Property, SearchParams } from '../types.js';
import { fetchHtml, generateId, makeProperty, parsePrice, extractCommune, extractFeatures } from './shared.js';

const SOURCE = 'barnes' as const;
const BASE_URL = 'https://www.barnes-luxembourg.com';

// BARNES uses different page layouts for rent vs sale
// Rental: /fr/location.html — .homelengo-box cards (prices hidden / POA)
// Sale:   /fr/vente.html   — .box-location cards (prices visible in h6.title)
function buildUrl(params: SearchParams): string {
  return params.transaction === 'sale'
    ? `${BASE_URL}/fr/vente.html`
    : `${BASE_URL}/fr/location.html`;
}

export async function scrapeBarnes(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  const $ = await fetchHtml(url);
  if (!$) {
    console.log(`[${SOURCE}] 0 listings (fetch failed)`);
    return [];
  }

  const results: Property[] = [];

  if (params.transaction === 'sale') {
    // Sale page: .box-location cards with visible prices in h6.title
    const cards = $('.box-location').toArray();
    console.log(`[${SOURCE}] found ${cards.length} .box-location cards`);

    for (const card of cards.slice(0, 30)) {
      const el = $(card);
      const href = el.find('a').first().attr('href') ?? '';
      const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;
      const title = el.find('span.sub-title, .sub-title').first().text().trim()
        || el.find('img').first().attr('alt') || '';
      const priceText = el.find('h6.title, .title').first().text().trim();
      const price = parsePrice(priceText);
      if (!price || price < 100) continue;
      if (params.maxTotalPrice > 0 && price > params.maxTotalPrice) continue;

      const image = el.find('img').first().attr('data-src') || el.find('img').first().attr('src') || '';
      const bedroomMatch = title.match(/(\d+)\s*chambre/i);
      const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : 0;
      const areaMatch = title.match(/(\d+)\s*m[²2]/i);
      const area = areaMatch ? parseInt(areaMatch[1]) : 0;

      results.push(makeProperty(SOURCE, {
        id: generateId(SOURCE, sourceUrl ?? title + price),
        sourceUrl,
        title: title || undefined,
        transaction: 'sale',
        price,
        bedrooms,
        area,
        commune: extractCommune(title),
        images: image ? [image] : [],
        lat: 0,
        lng: 0,
        features: extractFeatures(title),
      }));
    }
  } else {
    // Rent page: .homelengo-box cards — prices hidden (luxury / POA)
    const cards = $('.homelengo-box').toArray();
    console.log(`[${SOURCE}] found ${cards.length} .homelengo-box cards (prices not shown publicly)`);
    // Barnes luxury rental prices are not visible without contacting them
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
