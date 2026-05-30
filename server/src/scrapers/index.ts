import type { Property, SourceStatus, ScraperDefinition, SearchParams } from '../types.js';
import { athomeSearch } from './athome.js';
import { viviSearch } from './vivi.js';
import { scrapeBarnes } from './barnes.js';
import { scrapeNewimmo } from './newimmo.js';
import { scrapeBeckimmo } from './beckimmo.js';
import { scrapeFischbach } from './fischbach.js';
import { getRobotsTxt, isAllowedByRobots } from '../utils/robots.js';
import { MOCK_LISTINGS } from '../data/mockListings.js';

// Only scrapers that reliably return results from Render's US servers.
// All other agencies are geo-IP blocked or require JS rendering — see DIRECTORY_AGENCIES in sources.ts.
export const SCRAPER_REGISTRY: ScraperDefinition[] = [
  { id: 'athome',   name: 'atHome.lu',        category: 'portal',  baseUrl: 'https://www.athome.lu',              fn: athomeSearch },
  { id: 'vivi',     name: 'Vivi.lu',          category: 'portal',  baseUrl: 'https://www.vivi.lu',                fn: viviSearch },
  { id: 'barnes',   name: 'BARNES Luxembourg',category: 'network', baseUrl: 'https://www.barnes-luxembourg.com',  fn: scrapeBarnes },
  { id: 'newimmo',  name: 'New Immo',         category: 'agency',  baseUrl: 'https://www.newimmo.lu',             fn: scrapeNewimmo },
  { id: 'beckimmo', name: 'Beck Immo',        category: 'agency',  baseUrl: 'https://www.beckimmo.lu',            fn: scrapeBeckimmo },
  { id: 'fischbach',name: 'Fischbach Immo',   category: 'agency',  baseUrl: 'https://www.fischbach.lu',           fn: scrapeFischbach },
];

export type ScraperRunResult = {
  source: string;
  name: string;
  category: string;
  items: Property[];
  durationMs: number;
  status: 'ok' | 'playwright' | 'blocked' | 'error';
};

const domainLastRequest = new Map<string, number>();

async function applyRateLimit(domain: string) {
  const last = domainLastRequest.get(domain) ?? 0;
  const wait = 1500 - (Date.now() - last);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  domainLastRequest.set(domain, Date.now());
}

async function runOneScraper(def: ScraperDefinition, params: SearchParams): Promise<ScraperRunResult> {
  const start = Date.now();
  const domain = new URL(def.baseUrl).hostname;
  try {
    const robots = await getRobotsTxt(def.baseUrl);
    if (!isAllowedByRobots(def.baseUrl + '/', robots)) {
      console.warn(`[${def.id}] disallowed by robots.txt`);
      return { source: def.id, name: def.name, category: def.category, items: [], durationMs: Date.now() - start, status: 'blocked' };
    }
    await applyRateLimit(domain);
    const items = await def.fn(params);
    return {
      source: def.id,
      name: def.name,
      category: def.category,
      items,
      durationMs: Date.now() - start,
      status: 'ok',
    };
  } catch (err) {
    console.warn(`[${def.id}] error:`, err);
    return { source: def.id, name: def.name, category: def.category, items: [], durationMs: Date.now() - start, status: 'error' };
  }
}

export async function runAllScrapers(params: SearchParams): Promise<ScraperRunResult[]> {
  const settled = await Promise.allSettled(
    SCRAPER_REGISTRY.map(def => runOneScraper(def, params))
  );
  return settled.map((r, i) =>
    r.status === 'fulfilled'
      ? r.value
      : {
          source: SCRAPER_REGISTRY[i].id,
          name: SCRAPER_REGISTRY[i].name,
          category: SCRAPER_REGISTRY[i].category,
          items: [],
          durationMs: 0,
          status: 'error' as const,
        }
  );
}

function deduplicateProperties(properties: Property[]): Property[] {
  const seen = new Set<string>();
  return properties.filter(p => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
}

function clearPlaceholderImages(properties: Property[]): Property[] {
  const freq = new Map<string, number>();
  for (const p of properties) {
    for (const img of p.images ?? []) {
      freq.set(img, (freq.get(img) ?? 0) + 1);
    }
  }
  const placeholders = new Set(
    [...freq.entries()].filter(([, n]) => n > 2).map(([url]) => url),
  );
  if (placeholders.size === 0) return properties;
  console.log(`[scrapers] clearing ${placeholders.size} placeholder image URL(s) shared across 3+ listings`);
  return properties.map(p => ({
    ...p,
    images: (p.images ?? []).filter(img => !placeholders.has(img)),
  }));
}

export async function fetchListings(params: SearchParams) {
  const results = await runAllScrapers(params);
  const rawProperties = results.flatMap(r => r.items);
  const properties = clearPlaceholderImages(deduplicateProperties(rawProperties));

  const sources: SourceStatus[] = results.map(r => {
    let st: SourceStatus['status'];
    if (r.items.length > 0) st = 'ok';
    else if (r.status === 'blocked' || r.status === 'playwright') st = 'blocked';
    else if (r.status === 'ok') st = 'empty';
    else st = 'failed';
    return { name: r.source, status: st };
  });

  if (properties.length === 0) {
    console.log('[scrapers] All scrapers returned 0 — using mock data');
    const mockSources: SourceStatus[] = SCRAPER_REGISTRY.map(def => ({
      name: def.id,
      status: 'failed' as const,
    }));
    return { properties: MOCK_LISTINGS as Property[], sources: mockSources, isMock: true };
  }

  console.log(`[scrapers] ${rawProperties.length} raw → ${properties.length} after dedup`);
  return { properties, sources, isMock: false };
}
