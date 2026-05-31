import type { Property, SearchParams } from '../types.js';
import { fetchHtml, generateId, makeProperty, parsePrice, extractCommune, extractFeatures } from './shared.js';

const SOURCE = 'barnes' as const;
const BASE_URL = 'https://www.barnes-luxembourg.com';

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

  // Both rent and sale pages now use homelengo-box cards
  const cards = $('.homelengo-box').toArray();
  console.log(`[${SOURCE}] found ${cards.length} .homelengo-box cards`);

  if (cards.length === 0) {
    const html = $.html();
    console.log(`[${SOURCE}] HTML snippet (chars 3000-5500): ${html.slice(3000, 5500)}`);
    return [];
  }

  const results: Property[] = [];

  for (const card of cards.slice(0, 40)) {
    const el = $(card);

    const anchor = el.find('.content-top h3 a.link').first();
    const href = anchor.attr('href') ?? '';
    const sourceUrl = href.startsWith('http') ? href : href ? BASE_URL + href : undefined;
    const title = anchor.text().trim();

    // Location label: "Luxembourg, Ville-Haute" / "Belair" etc.
    const locationText = el.find('.archive-top .bottom').text().replace(/\s+/g, ' ').trim();

    // Price: "1 800 €" or "500 000 €" — strip / mois suffix automatically
    const priceText = el.find('.content-bottom h5.price').first().text().trim();
    const price = parsePrice(priceText);
    if (!price || price < 100) continue;
    if (params.maxTotalPrice > 0 && price > params.maxTotalPrice) continue;

    // Bedrooms and area from meta-list spans
    let bedrooms = 0;
    let area = 0;
    el.find('.meta-list .item span.price').each((_, span) => {
      const text = $(span).text().trim();
      const bedroomMatch = text.match(/(\d+)\s*chambre/i);
      if (bedroomMatch) { bedrooms = parseInt(bedroomMatch[1]); return; }
      const areaMatch = text.match(/^(\d+)\s*m[²2]?/i);
      if (areaMatch) { area = parseInt(areaMatch[1]); }
    });

    // Fallback: bedroom count from title
    if (bedrooms === 0) {
      const bm = (title + ' ' + locationText).match(/(\d+)\s*chambre/i);
      if (bm) bedrooms = parseInt(bm[1]);
    }

    if (params.minBedrooms > 0 && bedrooms < params.minBedrooms) continue;

    // Image: lazyload uses data-src, fallback to src
    const imgEl = el.find('.archive-top img').first();
    const image = imgEl.attr('data-src') || imgEl.attr('src') || '';

    const commune = extractCommune(locationText) !== 'Luxembourg'
      ? extractCommune(locationText)
      : extractCommune(title);

    results.push(makeProperty(SOURCE, {
      id: generateId(SOURCE, sourceUrl ?? title + price),
      sourceUrl,
      title: title || undefined,
      transaction: params.transaction,
      price,
      charges: 0,
      chargesKnown: false,
      bedrooms,
      area,
      commune,
      images: image ? [image] : [],
      lat: 0,
      lng: 0,
      features: extractFeatures(title + ' ' + locationText),
    }));
  }

  console.log(`[${SOURCE}] ${results.length} listings`);
  return results;
}
