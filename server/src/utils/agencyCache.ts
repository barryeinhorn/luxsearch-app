import { supabase } from '../lib/supabase.js';
import type { ScrapedAgency } from '../scrapers/editus.js';

const TTL_DAYS = 7;

export type Agency = ScrapedAgency & { scrapedAt: string };

export async function getCachedAgencies(): Promise<Agency[] | null> {
  if (!supabase) return null;

  const cutoff = new Date(Date.now() - TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from('agencies')
    .select('*')
    .gte('scraped_at', cutoff)
    .order('name', { ascending: true });

  if (error || !data || data.length === 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.map((row: any) => ({
    name: row.name,
    address: row.address ?? '',
    commune: row.commune ?? '',
    phone: row.phone ?? '',
    website: row.website ?? '',
    editusUrl: row.editus_url ?? '',
    scrapedAt: row.scraped_at,
  }));
}

export async function cacheAgencies(agencies: ScrapedAgency[]): Promise<void> {
  if (!supabase || agencies.length === 0) return;

  // Full refresh: clear existing rows then re-insert
  const { error: delErr } = await supabase.from('agencies').delete().gte('id', 1);
  if (delErr) console.warn('[agencies] delete error:', delErr.message);

  const rows = agencies.map(a => ({
    name: a.name,
    address: a.address,
    commune: a.commune,
    phone: a.phone,
    website: a.website,
    editus_url: a.editusUrl,
    scraped_at: new Date().toISOString(),
  }));

  for (let i = 0; i < rows.length; i += 100) {
    const { error } = await supabase.from('agencies').insert(rows.slice(i, i + 100));
    if (error) console.error(`[agencies] insert error at offset ${i}:`, error.message);
  }

  console.log(`[agencies] cached ${agencies.length} agencies`);
}
