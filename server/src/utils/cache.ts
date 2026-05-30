import { createHash } from 'crypto';
import { supabase } from '../lib/supabase.js';
import type { Property, SearchParams } from '../types.js';

const CACHE_TTL_MINUTES = 15;

export function hashParams(params: SearchParams): string {
  return createHash('md5').update(JSON.stringify(params)).digest('hex');
}

export async function getCachedProperties(hash: string): Promise<Property[] | null> {
  if (!supabase) return null;

  const cutoff = new Date(Date.now() - CACHE_TTL_MINUTES * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('search_params_hash', hash)
    .gte('scraped_at', cutoff)
    .order('scraped_at', { ascending: false });

  if (error || !data || data.length === 0) return null;

  return data.map(row => ({
    id: row.id,
    source: row.source,
    sourceUrl: row.source_url,
    title: row.title,
    type: row.type,
    transaction: row.transaction,
    price: row.price,
    charges: row.charges,
    chargesKnown: row.charges_known,
    totalMonthly: row.total_monthly,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    area: row.area,
    address: row.address,
    commune: row.commune,
    postalCode: row.postal_code,
    lat: row.lat,
    lng: row.lng,
    images: row.images || [],
    available: row.available,
    description: row.description,
    features: row.features || {},
    energyClass: row.energy_class,
    yearBuilt: row.year_built,
    floor: row.floor,
    scrapedAt: row.scraped_at,
  })) as Property[];
}

export async function cacheProperties(properties: Property[], hash: string): Promise<void> {
  if (!supabase || properties.length === 0) return;

  const rows = properties.map(p => ({
    id: p.id,
    source: p.source,
    source_url: p.sourceUrl,
    title: p.title,
    type: p.type,
    transaction: p.transaction,
    price: p.price,
    charges: p.charges,
    charges_known: p.chargesKnown,
    total_monthly: p.totalMonthly,
    bedrooms: p.bedrooms,
    bathrooms: p.bathrooms,
    area: p.area,
    address: p.address,
    commune: p.commune,
    postal_code: p.postalCode,
    lat: p.lat,
    lng: p.lng,
    images: p.images,
    available: p.available,
    description: p.description,
    features: p.features,
    energy_class: p.energyClass,
    year_built: p.yearBuilt,
    floor: p.floor,
    search_params_hash: hash,
    scraped_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('properties')
    .upsert(rows, { onConflict: 'id' });

  if (error) console.error('[cache] Supabase upsert error:', error.message);
}

export async function getCachedGeocode(address: string): Promise<{ lat: number; lng: number } | null> {
  if (!supabase) return null;

  const { data } = await supabase
    .from('geocode_cache')
    .select('lat, lng')
    .eq('address', address.toLowerCase().trim())
    .single();

  return data ? { lat: data.lat, lng: data.lng } : null;
}

export async function cacheGeocode(address: string, lat: number, lng: number): Promise<void> {
  if (!supabase) return;

  await supabase
    .from('geocode_cache')
    .upsert({ address: address.toLowerCase().trim(), lat, lng });
}
