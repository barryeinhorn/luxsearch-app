import type { Property, SearchParams } from '../types.js';
import { fetchHtml, generateId, makeProperty, extractFeatures } from './shared.js';

const SOURCE = 'newimmo' as const;
const BASE_URL = 'https://www.newimmo.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'acheter' : 'louer';
  return `${BASE_URL}/fr/${tx}/`;
}

export async function scrapeNewimmo(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  const $ = await fetchHtml(url);
  if (!$) {
    console.log(`[${SOURCE}] 0 listings (fetch failed)`);
    return [];
  }

  const results: Property[] = [];
  const cards = $('[class*="tag-appartement"], [class*="tag-maison"], [class*="tag-studio"]').toArray();
  console.log(`[${SOURCE}] found ${cards.length} cards via tag-* classes`);

  for (const card of cards.slice(0, 30)) {
    const el = $(card);
    const raw = el.attr('data-filter');
    if (!raw) continue;

    let data: { name?: string; surface?: number; price?: number; location?: string[]; rooms?: string } = {};
    try { data = JSON.parse(raw); } catch { continue; }

    const price = data.price ?? 0;
    if (!price || price < 100) continue;

    const href = el.find('a').first().attr('href') ?? '';
    const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;
    const image = el.find('img').first().attr('data-src') || el.find('img').first().attr('src') || '';
    const commune = (data.location?.[0] ?? 'Luxembourg');
    const area = data.surface ?? 0;
    const roomsRaw = parseInt(data.rooms ?? '0', 10);
    const bedrooms = roomsRaw > 0 && roomsRaw < 20 ? roomsRaw : 0;
    const title = data.name
      ? data.name.replace(/^\d+-/, '').replace(/-/g, ' ')
      : `Property in ${commune}`;

    results.push(makeProperty(SOURCE, {
      id: generateId(SOURCE, sourceUrl ?? data.name ?? String(price)),
      sourceUrl,
      title,
      transaction: params.transaction,
      price,
      bedrooms,
      area,
      commune: commune.charAt(0).toUpperCase() + commune.slice(1),
      images: image ? [image] : [],
      lat: 0,
      lng: 0,
      features: extractFeatures(title),
    }));
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
