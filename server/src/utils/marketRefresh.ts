import { supabase } from '../lib/supabase.js';
import { athomeSearch } from '../scrapers/athome.js';
import { viviSearch } from '../scrapers/vivi.js';
import { marketData as staticMarket } from '../data/marketData.js';
import type { Property, SearchParams } from '../types.js';

type CommuneData = {
  commune: string;
  avgRent1BR: number;
  avgRent2BR: number;
  avgRent3BR: number;
  avgSalePricePerM2: number;
  medianDaysOnMarket: number;
  yoyChange: number;
};

export type LiveMarketData = {
  communes: CommuneData[];
  cityAvgRent1BR: number;
  cityAvgRent2BR: number;
  cityAvgRent3BR: number;
  cityAvgSalePriceM2: number;
  totalActiveListings: number;
  sampleSize: number;
  isLive: boolean;
  isEstimated?: boolean;
  calculatedAt: string;
  lastUpdated: string;
  sources: string[];
};

const TARGET_COMMUNES = [
  'Belair', 'Limpertsberg', 'Merl', 'Strassen',
  'Bonnevoie', 'Bertrange', 'Kirchberg', 'Gasperich',
];

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : sorted[mid];
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((s, v) => s + v, 0) / arr.length);
}

function matchesCommune(listing: Property, commune: string): boolean {
  return listing.commune.toLowerCase() === commune.toLowerCase();
}

export async function getCachedMarketData(): Promise<LiveMarketData | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('market_data')
      .select('data, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) return null;

    const ageMs = Date.now() - new Date(data.updated_at as string).getTime();
    if (ageMs > 24 * 60 * 60 * 1000) return null;

    const snapshot = data.data as LiveMarketData;
    if (!snapshot?.isLive) return null;

    return snapshot;
  } catch {
    return null;
  }
}

export async function refreshMarketData(): Promise<LiveMarketData> {
  console.log('[market] Starting live data refresh...');

  const rentParams: SearchParams = {
    transaction: 'rent', minBedrooms: 0, maxTotalPrice: 0, communes: [], propertyType: 'all',
  };
  const saleParams: SearchParams = {
    transaction: 'sale', minBedrooms: 0, maxTotalPrice: 0, communes: [], propertyType: 'all',
  };

  const [athomeRent, athomeSale, viviRent, viviSale] = await Promise.allSettled([
    athomeSearch(rentParams),
    athomeSearch(saleParams),
    viviSearch(rentParams),
    viviSearch(saleParams),
  ]);

  const rentListings: Property[] = [
    ...(athomeRent.status === 'fulfilled' ? athomeRent.value : []),
    ...(viviRent.status === 'fulfilled' ? viviRent.value : []),
  ];
  const saleListings: Property[] = [
    ...(athomeSale.status === 'fulfilled' ? athomeSale.value : []),
    ...(viviSale.status === 'fulfilled' ? viviSale.value : []),
  ];

  const totalSample = rentListings.length + saleListings.length;
  console.log(`[market] Scraped ${rentListings.length} rent + ${saleListings.length} sale listings`);

  const communes: CommuneData[] = TARGET_COMMUNES.map(commune => {
    const fallback = staticMarket.communes.find(c => c.commune === commune) ?? staticMarket.communes[0];

    const cRent = rentListings.filter(p => matchesCommune(p, commune));
    const cSale = saleListings.filter(p => matchesCommune(p, commune));

    const r1 = cRent.filter(p => p.bedrooms === 1 && p.price > 500).map(p => p.price);
    const r2 = cRent.filter(p => p.bedrooms === 2 && p.price > 500).map(p => p.price);
    const r3 = cRent.filter(p => p.bedrooms >= 3 && p.price > 500).map(p => p.price);
    const sM2 = cSale.filter(p => p.area > 10 && p.price > 50000).map(p => Math.round(p.price / p.area));

    return {
      commune,
      avgRent1BR:       r1.length >= 2 ? median(r1) : fallback.avgRent1BR,
      avgRent2BR:       r2.length >= 2 ? median(r2) : fallback.avgRent2BR,
      avgRent3BR:       r3.length >= 2 ? median(r3) : fallback.avgRent3BR,
      avgSalePricePerM2: sM2.length >= 2 ? median(sM2) : fallback.avgSalePricePerM2,
      medianDaysOnMarket: fallback.medianDaysOnMarket,
      yoyChange: fallback.yoyChange,
    };
  });

  const calculatedAt = new Date().toISOString();
  const snapshot: LiveMarketData = {
    communes,
    cityAvgRent1BR:     avg(communes.map(c => c.avgRent1BR)),
    cityAvgRent2BR:     avg(communes.map(c => c.avgRent2BR)),
    cityAvgRent3BR:     avg(communes.map(c => c.avgRent3BR)),
    cityAvgSalePriceM2: avg(communes.map(c => c.avgSalePricePerM2)),
    totalActiveListings: totalSample,
    sampleSize: totalSample,
    isLive: true,
    calculatedAt,
    lastUpdated: calculatedAt.slice(0, 10),
    sources: ['athome.lu', 'vivi.lu'],
  };

  if (supabase) {
    const { error } = await supabase
      .from('market_data')
      .upsert({ id: 1, data: snapshot, updated_at: calculatedAt }, { onConflict: 'id' });

    if (error) {
      console.warn('[market] Supabase save failed:', error.message);
    } else {
      console.log(`[market] Saved live snapshot: ${communes.length} communes, ${totalSample} listings`);
    }
  }

  return snapshot;
}
