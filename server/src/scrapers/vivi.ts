/**
 * vivi.lu scraper — uses the internal AJAX search endpoint discovered from the jQuery bundle.
 *
 * Endpoint:  POST https://www.vivi.lu/en/search
 * Auth:      None (public endpoint, X-Requested-With: XMLHttpRequest required)
 * Format:    application/x-www-form-urlencoded
 * Response:  { result: true, data: { properties: [...], total: "264 results", pages: 14 } }
 *
 * Type codes:
 *   transaction 11 = rent, 10 = buy
 *   type 101 = apartment, 102 = house
 *
 * Location: locationReference=3833 is Luxembourg city (found in server-rendered HTML params)
 */

import type { Property, SearchParams } from '../types.js';
import { generateId } from './shared.js';

const SOURCE = 'vivi' as const;
const BASE_URL = 'https://www.vivi.lu';
const API_URL = `${BASE_URL}/en/search`;

// Transaction codes from HTML comment params on respective pages
const TX_MAP: Record<string, number> = { rent: 11, sale: 10 };

// Type codes from HTML comment params on respective pages
const TYPE_MAP: Record<string, number[]> = {
  apartment: [101],
  house:     [102],
  studio:    [101],
  all:       [101, 102],
};

// Luxembourg city location reference (from server-rendered HTML params)
const LU_REFERENCE = 3833;

type ViviProperty = {
  type: 'property' | 'ad';
  id: number;
  link: string;
  title: string;
  images: string[];
  price: string;
  surface: string;
  city: string;
  position: { latitude: string; longitude: string };
  attributes: { bedroom?: number; bathroom?: string; 'parking.all'?: string };
};

type ViviResponse = {
  result: boolean;
  data: {
    properties: ViviProperty[];
    total: string;
    pages: number;
  };
};

function buildBody(params: SearchParams, typeCode: number): URLSearchParams {
  const body = new URLSearchParams();
  body.set('limit', '20');
  body.set('page', '1');
  body.set('transaction', String(TX_MAP[params.transaction] ?? 11));
  body.set('type', String(typeCode));
  body.set('locationType', 'city');
  body.set('locationValue', 'Luxembourg');
  body.set('locationReference', String(LU_REFERENCE));
  body.set('sorting', 'dateDESC');
  body.set('bedroom_min', String(params.minBedrooms > 0 ? params.minBedrooms : 0));
  body.set('bedroom_max', '0');
  return body;
}

function toListing(raw: ViviProperty, transaction: SearchParams['transaction']): Property {
  const price = parseFloat(raw.price) || 0;
  const area = parseFloat(raw.surface) || 0;
  const bedrooms = raw.attributes.bedroom ?? 0;
  const bathrooms = parseInt(raw.attributes.bathroom ?? '0') || 0;
  const hasParking = parseInt(raw.attributes['parking.all'] ?? '0') > 0;
  const lat = parseFloat(raw.position?.latitude) || 0;
  const lng = parseFloat(raw.position?.longitude) || 0;
  const images = Array.isArray(raw.images) ? raw.images.filter(Boolean) : [];

  if (!lat || !lng) {
    console.warn(`[${SOURCE}] listing ${raw.id} has no coordinates`);
  }
  console.log(`[${SOURCE}] listing ${raw.id} images (${images.length}):`, images);

  return {
    id: generateId(SOURCE, String(raw.id)),
    source: SOURCE,
    sourceUrl: raw.link,
    title: raw.title,
    type: raw.title.toLowerCase().includes('house') ? 'house' : 'apartment',
    transaction,
    price,
    charges: 0,
    chargesKnown: false,
    totalMonthly: price,
    bedrooms,
    bathrooms,
    area,
    address: raw.city,
    commune: raw.city,
    postalCode: '',
    lat,
    lng,
    images,
    description: '',
    available: 'Contact agent',
    features: {
      garage: hasParking,
      balcony: false,
      terrace: false,
      garden: false,
      furnished: false,
      elevator: false,
      cellar: false,
      evCharger: false,
    },
    rentPerSqm: price > 0 && area > 0 ? Math.round(price / area) : undefined,
    scrapedAt: new Date().toISOString(),
  };
}

async function fetchType(params: SearchParams, typeCode: number): Promise<Property[]> {
  const txCode = TX_MAP[params.transaction] ?? 11;
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'Accept': 'application/json, text/javascript, */*; q=0.01',
      'Origin': BASE_URL,
      'Referer': `${BASE_URL}/en/${params.transaction === 'sale' ? 'buy' : 'rent'}/apartment/luxembourg`,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
    body: buildBody(params, typeCode).toString(),
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    console.warn(`[${SOURCE}] HTTP ${resp.status} for type=${typeCode}`);
    return [];
  }

  const data = await resp.json() as ViviResponse;
  if (!data.result || !data.data?.properties) return [];

  return data.data.properties
    .filter((p): p is ViviProperty & { type: 'property' } => p.type === 'property' && parseFloat(p.price) > 100)
    .map(p => toListing(p, params.transaction));
}

export async function viviSearch(params: SearchParams): Promise<Property[]> {
  console.log(`[${SOURCE}] calling AJAX API (transaction=${params.transaction}, minBedrooms=${params.minBedrooms})`);

  try {
    const typeCodes = TYPE_MAP[params.propertyType] ?? [101, 102];

    const results = await Promise.all(typeCodes.map(tc => fetchType(params, tc)));
    const all = results.flat();

    // Deduplicate by id (shouldn't overlap, but be safe)
    const seen = new Set<string>();
    const unique = all.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    console.log(`[${SOURCE}] ${unique.length} listings`);
    return unique;
  } catch (err) {
    console.warn(`[${SOURCE}] error:`, (err as Error).message);
    return [];
  }
}
