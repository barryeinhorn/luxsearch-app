import { API_URL } from './api';

export type IsochroneFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
};

// Extracts the outer ring as Leaflet [lat, lng] pairs from a Polygon feature
export function toLeafletPositions(feature: IsochroneFeature): [number, number][] | null {
  if (feature.geometry.type !== 'Polygon') return null;
  const ring = (feature.geometry.coordinates as number[][][])[0];
  if (!ring) return null;
  return ring.map(([lng, lat]): [number, number] => [lat, lng]);
}

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
    console.log(`[isochrone] response status=${res.status} for ${key}`);

    if (!res.ok) {
      const text = await res.text();
      console.error(`[isochrone] server error ${res.status}:`, text.slice(0, 300));
      return null;
    }

    const data = await res.json() as { features?: IsochroneFeature[] };
    const featureCount = data.features?.length ?? 0;
    console.log(`[isochrone] got ${featureCount} feature(s) for ${key}`);

    const feature = data.features?.[0] ?? null;
    if (feature) {
      cache[key] = feature;
      console.log(`[isochrone] stored polygon with ${(feature.geometry.coordinates as number[][][])[0]?.length ?? '?'} points`);
    } else {
      console.warn(`[isochrone] no features in response:`, JSON.stringify(data).slice(0, 200));
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
