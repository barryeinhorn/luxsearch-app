import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { fetchListings, runAllScrapers, SCRAPER_REGISTRY } from './scrapers/index.js';
import { marketData } from './data/marketData.js';
import { hashParams, getCachedProperties, cacheProperties } from './utils/cache.js';
import type { SearchParams } from './types.js';


const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'https://luxsearch-app.vercel.app',
    /\.vercel\.app$/,
  ],
}));

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', scrapers: SCRAPER_REGISTRY.length });
});

app.get('/api/market', (_req, res) => {
  res.json(marketData);
});

app.get('/api/search', async (req, res) => {
  const params: SearchParams = {
    transaction: (req.query.transaction as string) === 'sale' ? 'sale' : 'rent',
    minBedrooms: Number(req.query.minBedrooms ?? '0'),
    maxTotalPrice: Number(req.query.maxTotalPrice ?? '0'),
    communes: req.query.communes ? String(req.query.communes).split(',') : [],
    propertyType: (['apartment', 'house', 'studio'].includes(String(req.query.propertyType))
      ? req.query.propertyType as 'apartment' | 'house' | 'studio'
      : 'all'),
  };

  try {
    // Check Supabase cache first (15-min TTL)
    const hash = hashParams(params);
    const cached = await getCachedProperties(hash);
    if (cached && cached.length > 0) {
      console.log(`[search] Cache hit: ${cached.length} properties`);
      const activeIds = new Set<string>(cached.map((p: { source: string }) => p.source));
      const cachedSources = SCRAPER_REGISTRY.map(s => ({
        name: s.id,
        status: (activeIds.has(s.id) ? 'ok' : 'empty') as 'ok' | 'empty',
      }));
      return res.json({ properties: cached, sources: cachedSources, isMock: false });
    }

    // Run all scrapers
    const result = await fetchListings(params);

    // Persist to Supabase cache (skip mock data)
    if (!result.isMock && result.properties.length > 0) {
      cacheProperties(result.properties, hash).catch(err =>
        console.warn('[search] cache write failed:', err)
      );
    }

    res.json(result);
  } catch (error) {
    console.warn('[api/search] error', error);
    res.status(500).json({ properties: [], sources: [], isMock: false });
  }
});

// Debug: run one scraper and return diagnostics
app.get('/api/debug/scraper/:name', async (req, res) => {
  const name = req.params.name;
  const def = SCRAPER_REGISTRY.find(d => d.id === name);
  if (!def) {
    const available = SCRAPER_REGISTRY.map(d => d.id).join(', ');
    return res.status(404).json({ error: `Scraper '${name}' not found. Available: ${available}` });
  }

  const params: SearchParams = { transaction: 'rent', minBedrooms: 0, maxTotalPrice: 0, communes: [], propertyType: 'all' };
  const start = Date.now();
  let htmlSnippet = '';
  let resultCount = 0;
  let sampleResult = null;
  let errorMsg = null;
  let status = 'ok';

  try {
    const resp = await fetch(def.baseUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await resp.text();
    htmlSnippet = html.slice(0, 1000);

    const results = await def.fn(params);
    resultCount = results.length;
    sampleResult = results[0] ?? null;
    status = results.length > 0 ? 'ok' : 'blocked';
  } catch (err) {
    errorMsg = String(err);
    status = 'error';
  }

  res.json({
    scraper: name,
    name: def.name,
    category: def.category,
    baseUrl: def.baseUrl,
    resultCount,
    sampleResult,
    htmlSnippet,
    error: errorMsg,
    status,
    durationMs: Date.now() - start,
  });
});

// Debug: run all scrapers and return summary table
app.get('/api/debug/all', async (_req, res) => {
  const params: SearchParams = { transaction: 'rent', minBedrooms: 0, maxTotalPrice: 0, communes: [], propertyType: 'all' };
  const results = await runAllScrapers(params);

  const totalRaw = results.reduce((s, r) => s + r.items.length, 0);
  const summary = results.map(r => ({
    source: r.source,
    name: r.name,
    category: r.category,
    count: r.items.length,
    durationMs: r.durationMs,
    status: r.items.length > 0 ? 'ok' : r.status,
  }));

  const allIds = new Set<string>();
  let duplicates = 0;
  for (const r of results) {
    for (const p of r.items) {
      if (allIds.has(p.id)) duplicates++;
      allIds.add(p.id);
    }
  }

  res.json({
    summary,
    totalRaw,
    totalUnique: allIds.size,
    duplicatesRemoved: duplicates,
    scraperCount: SCRAPER_REGISTRY.length,
  });
});

// Isochrone proxy — calls OpenRouteService and returns GeoJSON polygon
app.get('/api/isochrone', async (req, res) => {
  const lat = Number(req.query.lat);
  const lng = Number(req.query.lng);
  const km = Number(req.query.km);

  if (!lat || !lng || !km) {
    return res.status(400).json({ error: 'lat, lng, km required' });
  }

  const apiKey = process.env.ORS_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ORS_API_KEY not configured' });
  }

  try {
    const orsRes = await fetch('https://api.openrouteservice.org/v2/isochrones/driving-car', {
      method: 'POST',
      headers: {
        'Authorization': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        locations: [[lng, lat]],
        range: [km * 1000],
        range_type: 'distance',
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!orsRes.ok) {
      const text = await orsRes.text();
      console.warn('[isochrone] ORS error', orsRes.status, text);
      return res.status(orsRes.status).json({ error: text });
    }

    const data = await orsRes.json();
    res.json(data);
  } catch (err) {
    console.warn('[isochrone] fetch failed', err);
    res.status(500).json({ error: String(err) });
  }
});

// Clear geocode cache
app.delete('/api/cache', async (_req, res) => {
  const { writeFileSync } = await import('fs');
  const { join } = await import('path');
  writeFileSync(join(__dirname, 'data/geocodeCache.json'), '{}');
  res.json({ ok: true, message: 'Geocode cache cleared' });
});

const port = process.env.PORT ? Number(process.env.PORT) : 3001;
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
  console.log(`Scrapers registered: ${SCRAPER_REGISTRY.length}`);
});
