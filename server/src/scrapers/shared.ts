import { load, type CheerioAPI } from 'cheerio';
import type { Property, PropertyFeatures, SourceName } from '../types.js';

const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-GB,en;q=0.9,fr;q=0.8,de;q=0.7',
  'Accept-Encoding': 'gzip, deflate, br',
  'DNT': '1',
};

export async function fetchHtml(url: string, extra: Record<string, string> = {}): Promise<CheerioAPI | null> {
  try {
    const resp = await fetch(url, {
      headers: { ...DEFAULT_HEADERS, ...extra },
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      console.warn(`[scraper] ${new URL(url).hostname} returned HTTP ${resp.status}`);
      return null;
    }
    return load(await resp.text());
  } catch (err) {
    console.warn(`[scraper] fetch failed for ${url}:`, (err as Error).message);
    return null;
  }
}

export async function fetchWithPlaywright(url: string): Promise<CheerioAPI | null> {
  try {
    // Dynamically import so server starts even if playwright is not installed.
    // Install with: npm install playwright && npx playwright install chromium
    const { chromium } = await import('playwright' as any);
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({ 'User-Agent': DEFAULT_HEADERS['User-Agent'] });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const html = await page.content();
    await browser.close();
    return load(html);
  } catch {
    return null;
  }
}

// Ordered from most specific to least — first match wins.
export const CARD_SELECTORS = [
  'article[data-id]',
  '[data-testid="listing-card"]',
  '[data-testid*="listing"]',
  '.property-item',
  '.listing-item',
  '.search-card',
  '.offer-item',
  '.result-item',
  '.annonce-item',
  '.bien-item',
  '.card-bien',
  'article.property',
  'article.listing',
  'li.property',
  '[class*="property-card"]',
  '[class*="listing-card"]',
  '[class*="PropertyCard"]',
  '[class*="ListingCard"]',
  '[class*="property-item"]',
  '[class*="listing-item"]',
];

export function findCards($: CheerioAPI, extra: string[] = []) {
  for (const sel of [...extra, ...CARD_SELECTORS]) {
    const found = $(sel).toArray();
    if (found.length > 0) return { cards: found, selector: sel };
  }
  return { cards: [], selector: '' };
}

export function parsePrice(text: string): number {
  if (!text) return 0;
  const clean = text
    .replace(/[\s  ]/g, '')
    .replace(/[€EUReur]/gi, '')
    .replace(/'/g, '');
  const m = clean.match(/\d[\d.,']*\d|\d/);
  if (!m) return 0;
  let raw = m[0];
  // European thousands-separator: "3.500" or "1.500.000"
  if (/^\d{1,3}(\.\d{3})+$/.test(raw)) {
    return parseInt(raw.replace(/\./g, ''), 10);
  }
  // Mixed: "3.500,00" (EU) or "3,500.00" (US)
  const hasComma = raw.includes(',');
  const hasDot = raw.includes('.');
  if (hasComma && hasDot) {
    if (raw.lastIndexOf(',') > raw.lastIndexOf('.')) {
      raw = raw.replace(/\./g, '').replace(',', '.');
    } else {
      raw = raw.replace(/,/g, '');
    }
  } else if (hasComma) {
    raw = /,\d{3}$/.test(raw) ? raw.replace(',', '') : raw.replace(',', '.');
  }
  return Math.round(Math.abs(parseFloat(raw))) || 0;
}
export function extractNumber(text: string): number {
  const m = (text ?? '').match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

const COMMUNE_LIST = [
  'Belair', 'Bonnevoie', 'Bertrange', 'Cessange', 'Gasperich', 'Gare',
  'Hesperange', 'Hollerich', 'Kirchberg', 'Limpertsberg', 'Merl',
  'Rollingergrund', 'Strassen', 'Weimerskirch', 'Luxembourg',
  'Hamm', 'Clausen', 'Grund', 'Pfaffenthal', 'Cents',
];

export function extractCommune(address: string): string {
  if (!address) return 'Luxembourg';
  for (const c of COMMUNE_LIST) {
    if (new RegExp(`\\b${c}\\b`, 'i').test(address)) return c;
  }
  const parts = address.split(/[,\n]/).map(p => p.trim()).filter(Boolean);
  return parts.at(-1) || 'Luxembourg';
}

export function extractPostalCode(address: string): string {
  const m = (address ?? '').match(/L?-?\s*(\d{4})/);
  return m ? `L-${m[1]}` : '';
}

export function extractEnergyClass(text: string): string {
  const m = (text ?? '').match(/\bénerg\w*[:\s]+([A-I]\+{0,2})\b|\b(A\+\+|A\+|A|B|C|D|E|F|G|H|I)\b/i);
  return m ? (m[1] || m[2] || '').toUpperCase() : '';
}

export function extractFeatures(text: string): PropertyFeatures {
  const t = (text ?? '').toLowerCase();
  return {
    garage: /garage|parking/i.test(t),
    balcony: /balcon|balcony/i.test(t),
    terrace: /terrasse|terrace/i.test(t),
    garden: /jardin|garden/i.test(t),
    furnished: /meublé|meuble|furnished/i.test(t),
    elevator: /ascenseur|lift|elevator/i.test(t),
    cellar: /cave|cellar/i.test(t),
    evCharger: /borne.?(de.)?recharge|ev.charg|charging.point/i.test(t),
  };
}

export function generateId(source: string, key: string): string {
  let hash = 5381;
  for (let i = 0; i < key.length; i++) {
    hash = ((hash << 5) + hash) ^ key.charCodeAt(i);
  }
  return `${source}-${(hash >>> 0).toString(36)}`;
}

export function makeProperty(source: SourceName, base: Partial<Property>): Property {
  const price = base.price ?? 0;
  const area = base.area || 0;
  const charges = base.charges ?? Math.round(price * 0.08);
  return {
    id: base.id ?? generateId(source, (base.sourceUrl ?? '') + price),
    source,
    sourceUrl: base.sourceUrl,
    title: base.title || `Property in ${base.commune || 'Luxembourg'}`,
    type: base.type || 'apartment',
    transaction: base.transaction || 'rent',
    price,
    charges,
    chargesKnown: base.chargesKnown ?? charges > 0,
    totalMonthly: price + charges,
    bedrooms: base.bedrooms ?? 0,
    bathrooms: base.bathrooms ?? 0,
    area,
    address: base.address,
    commune: base.commune || 'Luxembourg',
    postalCode: base.postalCode,
    lat: base.lat ?? (49.61 + Math.random() * 0.05),
    lng: base.lng ?? (6.12 + Math.random() * 0.08),
    images: base.images ?? [],
    available: base.available ?? 'Contact agent',
    features: base.features ?? extractFeatures(''),
    energyClass: base.energyClass,
    scrapedAt: new Date().toISOString(),
    agencyFee: base.agencyFee,
    daysOnMarket: base.daysOnMarket,
    rentPerSqm: price > 0 && area > 0 ? Math.round(price / area) : undefined,
  };
}

// Standard card extraction from a Cheerio API instance
export function extractCardsFromPage(
  $: CheerioAPI,
  source: SourceName,
  baseUrl: string,
  extraSelectors: string[] = [],
): Property[] {
  const { cards, selector } = findCards($, extraSelectors);
  if (!cards.length) return [];
  console.log(`[${source}] selector "${selector}" → ${cards.length} cards`);

  return cards.slice(0, 25).flatMap(card => {
    const el = $(card);
    const href = el.find('a').first().attr('href') || '';
    const sourceUrl = href.startsWith('http') ? href : href ? baseUrl + href : undefined;
    const title = el.find('h1, h2, h3, [class*="title"], [class*="headline"]').first().text().trim();
    const priceText = el.find('[class*="price"], .price, [itemprop="price"]').first().text().trim();
    const price = parsePrice(priceText);
    if (!price || price < 100) return [];

    const chargesText = el.find('[class*="charge"], [class*="cost"], .charges').first().text().trim();
    const charges = parsePrice(chargesText);
    const bedroomsText = el.find('[class*="bedroom"], [class*="room"], [class*="chambre"], [class*="pieces"]').first().text().trim();
    const areaText = el.find('[class*="area"], [class*="surface"], [class*="size"], [class*="m2"]').first().text().trim();
    const address = el.find('[class*="address"], [class*="location"], [class*="adresse"], [class*="city"]').first().text().trim();
    const image = el.find('img').first().attr('src') || el.find('img').first().attr('data-src') || '';
    const allText = el.text();

    return [makeProperty(source, {
      id: generateId(source, sourceUrl || title + price),
      sourceUrl,
      title: title || undefined,
      price,
      charges: charges || undefined,
      chargesKnown: charges > 0,
      bedrooms: extractNumber(bedroomsText),
      area: extractNumber(areaText),
      address: address || undefined,
      commune: extractCommune(address),
      postalCode: extractPostalCode(address),
      images: image ? [image] : [],
      features: extractFeatures(allText),
      energyClass: extractEnergyClass(allText),
    })];
  });
}
