import type { Property, SearchParams } from '../types.js';
import { fetchHtml, generateId, makeProperty, parsePrice, extractFeatures } from './shared.js';

const SOURCE = 'fischbach' as const;
// No www — fischbach.lu redirects from www
const BASE_URL = 'https://fischbach.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'vente' : 'location';
  return `${BASE_URL}/biens/${tx}/all/all/0/0/`;
}

export async function scrapeFischbach(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  const $ = await fetchHtml(url);
  if (!$) {
    console.log(`[${SOURCE}] 0 listings (fetch failed)`);
    return [];
  }

  const cards = $('article.grid-33').toArray();
  console.log(`[${SOURCE}] found ${cards.length} article.grid-33 cards`);

  const results: Property[] = [];
  for (const card of cards.slice(0, 30)) {
    const el = $(card);
    const href = el.find('a').first().attr('href') ?? '';
    const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;

    const title = el.find('.bien').first().text().trim();
    const priceText = el.find('.prix').first().text().trim();
    const price = parsePrice(priceText);
    if (!price || price < 100) continue;

    const commune = el.find('h1').first().text().trim() || 'Luxembourg';
    const detailsText = el.find('.details').last().text();
    const bedroomMatch = detailsText.match(/(\d+)\s*chambre/i);
    const bedrooms = bedroomMatch ? parseInt(bedroomMatch[1]) : 0;
    const areaMatch = detailsText.match(/(\d+)\s*m[²2]/i);
    const area = areaMatch ? parseInt(areaMatch[1]) : 0;

    // Image from background-image CSS
    const bgStyle = el.find('.bg').attr('style') ?? '';
    const imgMatch = bgStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/);
    const imgPath = imgMatch?.[1] ?? '';
    const image = imgPath ? (imgPath.startsWith('http') ? imgPath : BASE_URL + imgPath) : '';

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
