import { useCallback, useEffect, useMemo, useState } from 'react';
import { ExternalLink, Home, RefreshCw } from 'lucide-react';
import { SearchPanel, SCHOOL_COLORS } from './components/SearchPanel';
import { MapView, type SchoolCircle } from './components/MapView';
import { PropertyCard } from './components/PropertyCard';
import { MarketInsights } from './components/MarketInsights';
import { SCHOOLS } from './data/schools';
import { API_URL } from './lib/api';
import type { Filters, Property, SourceStatus } from './types';
import { DEFAULT_FILTERS } from './types';

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function useLastRefreshed() {
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    if (!lastRefreshed) return;
    const interval = setInterval(() => {
      const secs = Math.round((Date.now() - lastRefreshed.getTime()) / 1000);
      if (secs < 60) setElapsed(`${secs}s ago`);
      else setElapsed(`${Math.floor(secs / 60)} min ago`);
    }, 10000);
    const secs = Math.round((Date.now() - lastRefreshed.getTime()) / 1000);
    setElapsed(secs < 60 ? `${secs}s ago` : `${Math.floor(secs / 60)} min ago`);
    return () => clearInterval(interval);
  }, [lastRefreshed]);

  return { setLastRefreshed, elapsed };
}

export default function App() {
  const [rawProperties, setRawProperties] = useState<Property[]>([]);
  const [sourcesStatus, setSourcesStatus] = useState<SourceStatus[]>([]);
  const [isMock, setIsMock] = useState(false);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showInsights, setShowInsights] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setLastRefreshed, elapsed } = useLastRefreshed();

  const doFetch = useCallback(async (currentFilters: Filters) => {
    setLoading(true);
    setError(null);
    try {
      const minBedrooms = currentFilters.bedrooms === 'any' ? 0 : parseInt(currentFilters.bedrooms);
      const qs = new URLSearchParams({ transaction: currentFilters.transaction });
      if (minBedrooms > 0) qs.set('minBedrooms', String(minBedrooms));
      // maxPrice < 8000 means the user explicitly set a budget; 8000 is the slider max = no limit
      if (currentFilters.maxPrice < 8000) qs.set('maxTotalPrice', String(currentFilters.maxPrice));
      if (currentFilters.propertyType !== 'all') qs.set('propertyType', currentFilters.propertyType);
      if (currentFilters.communes.length > 0) qs.set('communes', currentFilters.communes.join(','));

      const res = await fetch(`${API_URL}/api/search?${qs}`);
      if (!res.ok) throw new Error(`Search failed: ${res.status}`);
      const { properties, sources, isMock: mock } = (await res.json()) as {
        properties: Property[];
        sources: SourceStatus[];
        isMock: boolean;
      };
      setRawProperties(properties);
      setSourcesStatus(sources);
      setIsMock(mock);
      setLastRefreshed(new Date());
    } catch {
      setError('Unable to load properties. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [setLastRefreshed]);

  const loadListings = useCallback(() => doFetch(filters), [doFetch, filters]);

  // Run once on mount with default filters; re-run only when user clicks Search
  useEffect(() => {
    doFetch(DEFAULT_FILTERS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredProperties = useMemo(() => {
    return rawProperties.filter((p) => {
      if (p.transaction && p.transaction !== filters.transaction) return false;
      if (filters.propertyType !== 'all' && p.type && p.type !== filters.propertyType) return false;
      const bedroomMin = filters.bedrooms === 'any' ? 0 : parseInt(filters.bedrooms);
      if (p.bedrooms < bedroomMin) return false;
      const total = p.totalMonthly ?? p.price + p.charges;
      if (total > filters.maxPrice) return false;
      if (p.area < filters.minArea) return false;
      if (filters.communes.length > 0 && !filters.communes.includes(p.commune)) return false;
      const selectedSchoolIds = filters.selectedSchoolIds || [];
      if (selectedSchoolIds.length > 0) {
        const isWithinAny = selectedSchoolIds.some((schoolId) => {
          const school = SCHOOLS.find((s) => s.id === schoolId);
          if (!school) return false;
          return haversineKm(p.lat, p.lng, school.lat, school.lng) <= filters.radius;
        });
        if (!isWithinAny) return false;
      }
      if (filters.garage && !p.features?.garage) return false;
      if (filters.furnished && !p.features?.furnished) return false;
      if (filters.balcony && !p.features?.balcony) return false;
      if (filters.evCharger && !p.features?.evCharger) return false;
      if (filters.selectedSources.length > 0 && !filters.selectedSources.includes(p.source)) return false;
      return true;
    });
  }, [rawProperties, filters]);

  const [schoolColorMap, setSchoolColorMap] = useState<Record<string, string>>({});

  useEffect(() => {
    setSchoolColorMap(prev => {
      const next: Record<string, string> = {};
      for (const id of filters.selectedSchoolIds) {
        if (prev[id]) next[id] = prev[id];
      }
      for (const id of filters.selectedSchoolIds) {
        if (!next[id]) {
          const color = SCHOOL_COLORS.find(c => !Object.values(next).includes(c)) ?? SCHOOL_COLORS[0];
          next[id] = color;
        }
      }
      return next;
    });
  }, [filters.selectedSchoolIds]);

  const schoolCircles = useMemo(() => {
    if (!filters.selectedSchoolIds.length) return [];
    return filters.selectedSchoolIds
      .map(id => {
        const school = SCHOOLS.find(s => s.id === id);
        if (!school) return null;
        return {
          id,
          lat: school.lat,
          lng: school.lng,
          radius: filters.radius * 1000,
          name: school.name,
          shortName: school.shortName,
          color: schoolColorMap[id] ?? '#3b82f6',
          commune: school.commune,
          cost: school.cost,
          curriculum: school.curriculum,
          feeRange: school.feeRange,
          ageRange: school.ageRange,
          website: school.website,
        };
      })
      .filter((c): c is SchoolCircle => c !== null);
  }, [filters.selectedSchoolIds, filters.radius, schoolColorMap]);

  const okSources = useMemo(() => sourcesStatus.filter(s => s.status === 'ok'), [sourcesStatus]);
  const totalSources = sourcesStatus.length;
  const onMapCount = filteredProperties.filter(p => p.lat !== 0 && p.lng !== 0).length;

  const deepLinkPills = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of rawProperties) counts[p.source] = (counts[p.source] ?? 0) + 1;

    const statusMap: Record<string, SourceStatus['status']> = {};
    for (const s of sourcesStatus) statusMap[s.name] = s.status;

    const commune0 = filters.communes[0]?.toLowerCase();

    const txImmotop = filters.transaction === 'rent' ? 'location-appartements' : 'vente-appartements';
    const immotopBase = `https://www.immotop.lu/en/${txImmotop}/${commune0 ?? 'luxembourg'}/`;
    const immotopParams = new URLSearchParams();
    const minBedrooms = filters.bedrooms === 'any' ? 0 : parseInt(filters.bedrooms);
    if (minBedrooms > 0) immotopParams.set('nb_rooms_min', String(minBedrooms));
    if (filters.maxPrice < 8000) immotopParams.set('price_max', String(filters.maxPrice));
    const qs = immotopParams.toString();

    const txPath = filters.transaction === 'rent' ? 'rent' : 'buy';
    const communeSlug = commune0 ?? 'luxembourg';

    const candidates: { id: string; label: string; url: string; alwaysShow?: boolean }[] = [
      { id: 'immotop',    label: 'Immotop',    url: qs ? `${immotopBase}?${qs}` : immotopBase, alwaysShow: true },
      { id: 'properstar', label: 'Properstar', url: `https://www.properstar.com/luxembourg/${communeSlug}-loc/${txPath}/apartment-house/apartment` },
      { id: 'athome',     label: 'atHome',     url: 'https://www.athome.lu' },
      { id: 'vivi',       label: 'Vivi',       url: commune0 ? `https://www.vivi.lu/en/${txPath}/apartment/${commune0}` : `https://www.vivi.lu/en/${txPath}/apartment/` },
    ];

    return candidates.filter(c => c.alwaysShow || (counts[c.id] ?? 0) === 0 || statusMap[c.id] === 'blocked');
  }, [rawProperties, sourcesStatus, filters.transaction, filters.communes, filters.bedrooms, filters.maxPrice]);

  return (
    <div className="h-screen bg-slate-50 font-sans overflow-hidden flex flex-col">

      {/* ── Fixed Header ── */}
      <header className="h-14 shrink-0 bg-white border-b border-slate-200 z-50 flex items-center px-4 gap-3">
        <div className="flex items-center gap-2 shrink-0">
          <Home size={20} className="text-red-500" />
          <span className="font-semibold text-slate-900">LuxSearch</span>
          <span className="text-xs text-slate-400 hidden sm:inline">Luxembourg</span>
        </div>

        <div className="flex-1 text-center hidden sm:block">
          <span className="text-sm text-slate-500">
            {loading ? 'Loading…' : `${filteredProperties.length} listings from ${okSources.length} of ${totalSources} sources`}
          </span>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Source health dots with tooltip */}
          <div className="hidden sm:flex items-center gap-2" title={`${okSources.length}/${totalSources} sources active`}>
            <div className={`w-2.5 h-2.5 rounded-full ${okSources.length >= 3 ? 'bg-green-500' : okSources.length >= 1 ? 'bg-amber-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium text-slate-600">{okSources.length} active / {totalSources} total</span>
          </div>

          <button
            onClick={() => setShowInsights(!showInsights)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg px-3 py-1.5 hover:bg-slate-50 transition-colors"
          >
            Market insights
          </button>
        </div>
      </header>

      {/* ── Below header: sidebar + main ── */}
      <div
        className="flex-1 flex overflow-hidden"
        style={{ paddingRight: showInsights ? 400 : 0, transition: 'padding-right 0.3s ease' }}
      >

        <SearchPanel
          filters={filters}
          onFiltersChange={setFilters}
          properties={filteredProperties}
          rawProperties={rawProperties}
          sourcesStatus={sourcesStatus}
          onSearch={loadListings}
          schoolColorMap={schoolColorMap}
        />

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">

          {/* isMock banner */}
          {isMock && (
            <div className="bg-amber-50 border-b border-amber-200 py-2 px-4 text-sm text-amber-700 text-center shrink-0">
              Showing preview data — live scraping loading in background
            </div>
          )}

          {/* Stats bar */}
          <div className="shrink-0 bg-white border-b border-slate-100 px-4 py-2 flex items-center gap-4 text-xs text-slate-500">
            <span>
              <span className="font-semibold text-slate-700">{filteredProperties.length}</span> listings
              {onMapCount < filteredProperties.length && (
                <span className="text-slate-400 ml-1">({onMapCount} on map)</span>
              )}
            </span>
            <span>·</span>
            <span>
              <span className="font-semibold text-slate-700">{okSources.length}</span> of {totalSources} sources
            </span>
            {elapsed && (
              <>
                <span>·</span>
                <span>Last refreshed {elapsed}</span>
              </>
            )}
            <button
              onClick={async () => {
                await fetch(`${API_URL}/api/cache`, { method: 'DELETE' });
                loadListings();
              }}
              disabled={loading}
              className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 disabled:opacity-40 transition-colors"
            >
              <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          {/* "Search also on" bar — only sources with 0 results or blocked status */}
          {!loading && deepLinkPills.length > 0 && (
            <div className="shrink-0 bg-slate-50 border-b border-slate-200 px-4 py-2 flex items-center gap-3 flex-wrap">
              <span className="text-xs text-slate-400 shrink-0">Also search on:</span>
              {deepLinkPills.map(({ label, url }) => (
                <a
                  key={label}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 border border-slate-200 rounded-full px-3 py-1 text-xs text-slate-600 hover:bg-white hover:border-slate-400 transition shrink-0"
                >
                  {label}
                  <ExternalLink size={10} />
                </a>
              ))}
            </div>
          )}

          {/* Map */}
          <div className="flex-1 min-h-0 relative">
            <MapView properties={filteredProperties} schoolCircles={schoolCircles} />
            {error && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-white/80 px-6 text-center">
                <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="font-semibold text-slate-900">Could not load listings</p>
                  <p className="mt-2 text-sm text-slate-600">{error}</p>
                </div>
              </div>
            )}
          </div>

          {/* Property card strip */}
          <div className="shrink-0 border-t border-slate-100 bg-white" style={{ height: 220 }}>
            <div className="flex gap-3 px-3 py-3 h-full overflow-x-auto overflow-y-hidden">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-[200px] flex-shrink-0 rounded-xl border border-slate-100 bg-slate-50 animate-pulse" />
                ))
              ) : filteredProperties.length > 0 ? (
                filteredProperties.map((p) => <PropertyCard key={p.id} property={p} />)
              ) : (
                <div className="flex items-center text-sm text-slate-500 px-2">
                  No listings match your current filters.
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Market Insights slide-out */}
      <div
        className={`fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl transform transition-transform duration-300 ${
          showInsights ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full pt-14">
          <MarketInsights onClose={() => setShowInsights(false)} />
        </div>
      </div>
    </div>
  );
}
