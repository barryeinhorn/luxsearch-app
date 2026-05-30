import type { Property, SearchParams } from '../types.js';
import { fetchHtml, generateId, makeProperty, extractFeatures } from './shared.js';

const SOURCE = 'newimmo' as const;
const BASE_URL = 'https://www.newimmo.lu';

const RENT_TYPES = new Set(['appartement', 'g-appartement', 'maison', 'g-maison', 'studio', 'g-studio', 'penthouse', 'g-penthouse']);
const SALE_TYPES = new Set(['appartement', 'g-appartement', 'maison', 'g-maison', 'studio', 'g-studio', 'penthouse', 'g-penthouse']);

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'acheter' : 'louer';
  return `${BASE_URL}/fr/${tx}/`;
}

function parseCard(el: ReturnType<any>, $: any, params: SearchParams): Property | null {
  const raw = el.attr('data-filter');
  if (!raw) return null;

  let data: { name?: string; surface?: number; price?: number; location?: string[]; rooms?: string; type?: string[] } = {};
  try { data = JSON.parse(raw); } catch { return null; }

  const price = data.price ?? 0;
  if (!price || price < 100) return null;
  if (params.maxTotalPrice > 0 && price > params.maxTotalPrice) return null;

  // Filter irrelevant types (bureaux, commerces, garages, terrains)
  const types = data.type ?? [];
  const validTypes = params.transaction === 'sale' ? SALE_TYPES : RENT_TYPES;
  if (types.length > 0 && !types.some(t => validTypes.has(t.toLowerCase()))) return null;

  const href = el.find('a').first().attr('href') ?? '';
  const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;
  const image = el.find('img').first().attr('data-src') || el.find('img').first().attr('src') || '';
  const commune = data.location?.[0] ?? 'Luxembourg';
  const area = data.surface ?? 0;
  const roomsRaw = parseInt(data.rooms ?? '0', 10);
  const bedrooms = roomsRaw > 0 && roomsRaw < 20 ? roomsRaw : 0;
  const title = data.name
    ? data.name.replace(/^\d+-/, '').replace(/-/g, ' ')
    : `Property in ${commune}`;

  return makeProperty(SOURCE, {
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
  });
}

export async function scrapeNewimmo(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  const $ = await fetchHtml(url);
  if (!$) {
    console.log(`[${SOURCE}] 0 listings (fetch failed)`);
    return [];
  }

  // Primary: find cards by UIkit tag-* filter class
  let cards = $('[class*="tag-appartement"], [class*="tag-maison"], [class*="tag-studio"]').toArray();
  console.log(`[${SOURCE}] tag-* selector: ${cards.length} elements`);

  // Fallback: find any element with data-filter JSON containing price
  if (cards.length === 0) {
    cards = $('[data-filter]').toArray();
    console.log(`[${SOURCE}] data-filter fallback: ${cards.length} elements`);
  }

  const results: Property[] = [];
  for (const card of cards.slice(0, 50)) {
    const prop = parseCard($(card), $, params);
    if (prop) results.push(prop);
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
