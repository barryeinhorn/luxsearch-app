import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getCachedGeocode, cacheGeocode } from './cache.js';

const CACHE_PATH = join(__dirname, '../data/geocodeCache.json');

type GeoPoint = { lat: number; lng: number };
type GeoCache = Record<string, GeoPoint>;

let memCache: GeoCache = {};
let cacheLoaded = false;
let lastRequestAt = 0;

function loadFileCache() {
  if (cacheLoaded) return;
  try {
    if (existsSync(CACHE_PATH)) {
      memCache = JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
    }
  } catch {
    memCache = {};
  }
  cacheLoaded = true;
}

function saveFileCache() {
  try {
    writeFileSync(CACHE_PATH, JSON.stringify(memCache, null, 2));
  } catch (err) {
    console.warn('[geocode] failed to save cache:', err);
  }
}

// Nominatim: max 1 request/second
async function nominatim(address: string): Promise<GeoPoint | null> {
  const now = Date.now();
  const wait = 1100 - (now - lastRequestAt);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestAt = Date.now();

  try {
    const q = encodeURIComponent(`${address}, Luxembourg`);
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=lu`;
    const resp = await fetch(url, {
      headers: { 'User-Agent': 'LuxSearch/1.0 (barry.ein@gmail.com)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!resp.ok) return null;
    const data = await resp.json() as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  loadFileCache();
  const key = address.toLowerCase().trim();

  // 1. In-memory + file cache
  if (memCache[key]) return memCache[key];

  // 2. Supabase cache (survives deploys)
  const supabaseCached = await getCachedGeocode(address);
  if (supabaseCached) {
    memCache[key] = supabaseCached;
    return supabaseCached;
  }

  // 3. Nominatim API
  const result = await nominatim(address);
  if (result) {
    memCache[key] = result;
    saveFileCache();
    await cacheGeocode(address, result.lat, result.lng);
  }
  return result;
}

export async function geocodeProperties<T extends { lat: number; lng: number; address?: string }>(
  items: T[],
  maxNew = 20,
): Promise<T[]> {
  loadFileCache();
  let geocoded = 0;
  for (const item of items) {
    if (item.lat !== 49.61 && item.lng !== 6.12 && item.lat !== 0) continue;
    if (!item.address || item.address.length < 5) continue;
    if (geocoded >= maxNew) break;
    const point = await geocodeAddress(item.address);
    if (point) {
      item.lat = point.lat;
      item.lng = point.lng;
      geocoded++;
    }
  }
  return items;
}
