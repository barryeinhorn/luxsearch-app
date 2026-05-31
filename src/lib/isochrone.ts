import { API_URL } from './api';

export type IsochroneFeature = {
  type: 'Feature';
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][] | number[][][][];
  };
  properties: Record<string, unknown>;
};

const cache: Record<string, IsochroneFeature> = {};

export async function fetchIsochrone(
  schoolId: string,
  lat: number,
  lng: number,
  radiusKm: number,
): Promise<IsochroneFeature | null> {
  const key = cacheKey(schoolId, radiusKm);
  if (cache[key]) return cache[key];

  try {
    const res = await fetch(`${API_URL}/api/isochrone?lat=${lat}&lng=${lng}&km=${radiusKm}`);
    if (!res.ok) return null;
    const data = await res.json() as { features?: IsochroneFeature[] };
    const feature = data.features?.[0] ?? null;
    if (feature) cache[key] = feature;
    return feature;
  } catch {
    return null;
  }
}

export function cacheKey(schoolId: string, radiusKm: number): string {
  return `${schoolId}:${radiusKm}`;
}
