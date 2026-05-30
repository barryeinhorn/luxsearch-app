import { load } from 'cheerio';
import type { Property, SearchParams } from '../types.js';
import { parsePrice, extractNumber, extractCommune, extractFeatures, generateId, makeProperty } from './shared.js';

const SOURCE = 'immotop' as const;
const BASE_URL = 'https://www.immotop.lu';

function buildUrl(params: SearchParams): string {
  const tx = params.transaction === 'sale' ? 'sale' : 'rent';
  return `${BASE_URL}/en/search/?transaction=${tx}&bedrooms=${params.minBedrooms}`;
}

export async function immotopSearch(params: SearchParams): Promise<Property[]> {
  const url = buildUrl(params);
  console.log(`[${SOURCE}] fetching ${url}`);

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-GB,en;q=0.9,fr;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      console.warn(`[${SOURCE}] HTTP ${response.status}`);
      return [];
    }

    const html = await response.text();
    const $ = load(html);

    // Try JSON-LD first
    const jsonLd = $('script[type="application/ld+json"]').first().text().trim();
    if (jsonLd) {
      try {
        const parsed = JSON.parse(jsonLd);
        const offers = Array.isArray(parsed) ? parsed : parsed?.itemListElement ?? [];
        const items = offers
          .map((entry: any) => {
            const data = entry?.item || entry;
            if (!data) return null;
            const price = parsePrice(data.offers?.price?.toString() ?? '');
            if (!price) return null;
            return makeProperty(SOURCE, {
              id: generateId(SOURCE, data['@id'] ?? data.url ?? data.name),
              sourceUrl: data.url,
              title: data.name,
              commune: data.address?.addressLocality,
              bedrooms: Number(data.numberOfRooms ?? params.minBedrooms),
              bathrooms: Number(data.bathroomCount ?? 1),
              area: Number(data.floorSize?.value ?? 0),
              price,
              charges: 0,
              lat: Number(data.geo?.latitude ?? 0),
              lng: Number(data.geo?.longitude ?? 0),
            });
          })
          .filter(Boolean) as Property[];
        if (items.length) {
          console.log(`[${SOURCE}] ${items.length} items from JSON-LD`);
          return items.slice(0, 20);
        }
      } catch {}
    }

    const found = $(
      '.search-card, .offer-item, .property-card, .listing-card, [class*="PropertyCard"], [class*="listing-item"]'
    ).toArray();

    if (!found.length) {
      console.warn(`[${SOURCE}] selectors returned 0`);
      return [];
    }

    return found.slice(0, 20).flatMap(card => {
      const el = $(card);
      const href = el.find('a').first().attr('href') || '';
      const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;
      const title = el.find('.title, .headline, .offer-title, h2, h3').first().text().trim();
      const address = el.find('.location, .city, .address').first().text().trim();
      const priceText = el.find('.price, .offer-price').first().text().trim();
      const areaText = el.find('.size, .area, .surface').first().text().trim();
      const price = parsePrice(priceText);
      if (!price) return [];

      return [makeProperty(SOURCE, {
        id: generateId(SOURCE, sourceUrl || title + price),
        sourceUrl,
        title: title || undefined,
        price,
        bedrooms: params.minBedrooms,
        area: extractNumber(areaText),
        address: address || undefined,
        commune: extractCommune(address),
        features: extractFeatures(el.text()),
      })];
    });
  } catch (err) {
    console.warn(`[${SOURCE}] error:`, err);
    return [];
  }
}
