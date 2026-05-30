/**
 * atHome.lu scraper — uses the internal JSON API discovered from the JS bundle.
 *
 * Endpoint:  POST https://www.athome.lu/portal-srp/api/v1/search
 * Auth:      None (public endpoint, standard browser headers required)
 * Pagination: page/size params; returns total count
 *
 * Key constants extracted from portal-srp/search-*.js:
 *   site       = "lu_at_home"
 *   hkey       = "33e38b1b"  (Luxembourg city location hash)
 *   MEDIA_SERVER = "https://i1.static.athome.eu/images/annonces2/image_/"
 *   SRP size   = "360x265/"
 */

import type { Property, SearchParams } from '../types.js';
import { extractCommune, generateId } from './shared.js';

const SOURCE = 'athome' as const;
const API_URL = 'https://www.athome.lu/portal-srp/api/v1/search';
const SITE_URL = 'https://www.athome.lu';
const MEDIA_BASE = 'https://i1.static.athome.eu/images/annonces2/image_/360x265';

// Luxembourg city location identifiers (from pre-rendered Redux state)
const LU_CITY_LEVELS = { L9: 'luxembourg' };
const LU_CITY_HKEY = '33e38b1b';

// Property type mapping from our SearchParams to athome API values.
// 'all' explicitly restricts to residential groups to exclude commercial/retail.
const PTYPE_MAP: Record<string, string[]> = {
  apartment: ['flat'],
  house:     ['house'],
  studio:    ['flat'],
  all:       ['flat', 'house'],
};

type AthomeListing = {
  id: number;
  typeKey: string;
  transaction: string;
  price: number;
  isPriceOnDemand: boolean;
  permalink: { en: string };
  address: {
    suburb: string;
    city: string;
    zip: string;
    floor: number;
    pin: { lat: number; lon: number };
  };
  characteristic?: {
    rooms: number;
    bedrooms: number;
    bathrooms: number;
    showers: number;
    garages: number;
    indoorParking: number;
    outdoorParking: number;
    surface: number;
    groundSurface: number;
    basement: number;
  };
  media?: { photos: string[] };
  previewDescriptions?: { en?: string; fr?: string };
};

function buildBody(params: SearchParams, page = 1): object {
  const txType = params.transaction === 'sale' ? 'buy' : 'rent';
  const ptypes = PTYPE_MAP[params.propertyType] ?? [];

  const filters: Record<string, unknown> = {
    'transaction.type': txType,
    'portal_immotype_group': ptypes,
  };

  if (params.minBedrooms > 0) {
    filters['bedrooms'] = { gte: params.minBedrooms };
  }

  return {
    apireq: {
      site: 'lu_at_home',
      page,
      size: 25,
      sort: [],
      fgroup: 'srp',
      query: [{
        where: [
          { levels: LU_CITY_LEVELS },
          { hkey: LU_CITY_HKEY },
        ],
        filters,
        modifiers: {
          with_child: true,
          apply_to_child: true,
          with_characteristic: true,
          with_agencies: false,
        },
        seo: [],
      }],
      aggregate: [`last_inserted@20260515T000000Z`],
    },
    domain: 'athome.lu',
    locale: 'en',
    uri: `/en/${txType}/apartment/luxembourg`,
    queryFilters: {
      page,
      locForSearch: 'L9-luxembourg',
      tr: txType,
      ptypes,
    },
  };
}

function photoUrl(path: string): string {
  // paths come as "/41/ae/a8/hash.jpg" — strip leading slash
  return `${MEDIA_BASE}/${path.replace(/^\//, '')}`;
}

function normalizeCommune(listing: AthomeListing): string {
  if (listing.address.suburb && listing.address.suburb.trim()) {
    // suburb is e.g. "Kirchberg", "Centre Ville", "Belair"
    return listing.address.suburb.trim();
  }
  // city is e.g. "Luxembourg-Kirchberg" — extract after hyphen
  return extractCommune(listing.address.city);
}

function toListing(raw: AthomeListing): Property {
  const char = raw.characteristic;
  const price = raw.isPriceOnDemand ? 0 : (raw.price ?? 0);
  const area = char?.surface ?? 0;
  const bedrooms = char?.bedrooms ?? 0;
  const bathrooms = (char?.bathrooms ?? 0) + (char?.showers ?? 0);
  const hasGarage = ((char?.garages ?? 0) + (char?.indoorParking ?? 0) + (char?.outdoorParking ?? 0)) > 0;
  const commune = normalizeCommune(raw);
  const photos = (raw.media?.photos ?? []).slice(0, 6).map(photoUrl);
  const description = raw.previewDescriptions?.en ?? raw.previewDescriptions?.fr ?? '';

  return {
    id: generateId(SOURCE, String(raw.id)),
    source: SOURCE,
    sourceUrl: `${SITE_URL}${raw.permalink.en}`,
    title: `${bedrooms > 0 ? `${bedrooms}BR ` : ''}${raw.typeKey || 'apartment'} in ${commune}`,
    type: raw.typeKey || 'apartment',
    transaction: raw.transaction === 'buy' ? 'sale' : 'rent',
    price,
    charges: 0,
    chargesKnown: false,
    totalMonthly: price,
    bedrooms,
    bathrooms,
    area,
    address: raw.address.city,
    commune,
    postalCode: raw.address.zip ? `L-${raw.address.zip}` : '',
    lat: raw.address.pin.lat,
    lng: raw.address.pin.lon,
    floor: raw.address.floor,
    images: photos,
    description: description.slice(0, 500),
    available: 'Contact agent',
    features: {
      garage: hasGarage,
      balcony: false,
      terrace: false,
      garden: (char?.groundSurface ?? 0) > 0,
      furnished: false,
      elevator: false,
      cellar: (char?.basement ?? 0) > 0,
      evCharger: false,
    },
    rentPerSqm: price > 0 && area > 0 ? Math.round(price / area) : undefined,
    scrapedAt: new Date().toISOString(),
  };
}

export async function athomeSearch(params: SearchParams): Promise<Property[]> {
  console.log(`[${SOURCE}] calling JSON API (transaction=${params.transaction}, minBedrooms=${params.minBedrooms})`);

  try {
    const resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Origin': SITE_URL,
        'Referer': `${SITE_URL}/en/rent/apartment/luxembourg`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-GB,en;q=0.9',
      },
      body: JSON.stringify(buildBody(params)),
      signal: AbortSignal.timeout(20000),
    });

    if (!resp.ok) {
      console.warn(`[${SOURCE}] API returned HTTP ${resp.status}`);
      return [];
    }

    const data = await resp.json() as {
      error: boolean;
      total?: number;
      listings?: AthomeListing[];
    };

    if (data.error || !data.listings) {
      console.warn(`[${SOURCE}] API error field=true or no listings`);
      return [];
    }

    const listings = data.listings
      .filter(l => !l.isPriceOnDemand && l.price > 100)
      .map(toListing);

    console.log(`[${SOURCE}] ${listings.length} listings (total available: ${data.total ?? '?'})`);
    return listings;
  } catch (err) {
    console.warn(`[${SOURCE}] error:`, (err as Error).message);
    return [];
  }
}
