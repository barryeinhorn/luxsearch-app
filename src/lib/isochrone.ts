import { API_URL } from './api';

export type IsochroneFeature = {
  type: 'Feature';
  geometry: {
    type: string;
    coordinates: number[][][];
  };
  properties: Record<string, unknown>;
};

// Module-level cache — survives re-renders, deduplicates fetches
const cache: Record<string, IsochroneFeature> = {};

export async function fetchIsochrone(
  schoolId: string,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<IsochroneFeature | null> {
  const key = cacheKey(schoolId, radiusKm);
  if (cache[key]) {
    console.log(`[isochrone] cache hit: ${key}`);
    return cache[key];
  }

  const url = `${API_URL}/api/isochrone?lat=${lat}&lng=${lng}&km=${radiusKm}`;
  console.log(`[isochrone] fetching ${url}`);

  try {
    const res = await fetch(url);
    console.log(`[isochrone] status=${res.status} key=${key}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[isochrone] error ${res.status}:`, text.slice(0, 300));
      return null;
    }

    const data = await res.json() as { features?: IsochroneFeature[] };
    console.log(`[isochrone] features=${data.features?.length ?? 0}`);

    const feature = data.features?.[0] ?? null;
    if (feature) {
      cache[key] = feature;
      const ring = feature.geometry?.coordinates?.[0];
      console.log(`[isochrone] stored key=${key} points=${ring?.length ?? '?'} first=${JSON.stringify(ring?.[0])}`);
    } else {
      console.warn('[isochrone] no features in response:', JSON.stringify(data).slice(0, 300));
    }
    return feature;
  } catch (err) {
    console.error('[isochrone] fetch error:', err);
    return null;
  }
}

export function cacheKey(schoolId: string, radiusKm: number): string {
  return `${schoolId}:${radiusKm}`;
}
