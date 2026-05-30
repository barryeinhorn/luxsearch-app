import { useEffect, useRef, useState } from 'react';
import { Search, ChevronDown, X, ChevronRight } from 'lucide-react';
import { SCHOOLS } from '../data/schools';
import { SOURCE_META, CATEGORY_SOURCES, type SourceCategory } from '../constants/sources';
import type { Filters, Property, School, SourceStatus } from '../types';
import { DEFAULT_FILTERS } from '../types';

export const SCHOOL_COLORS = ['#3b82f6', '#22c55e', '#f97316', '#a855f7', '#ef4444', '#14b8a6'];

const ALL_COMMUNES = [
  'Belair', 'Bonnevoie', 'Bertrange', 'Cessange', 'Gasperich', 'Gare',
  'Hesperange', 'Hollerich', 'Kirchberg', 'Limpertsberg', 'Merl',
  'Rollingergrund', 'Strassen', 'Weimerskirch',
];

function getSchoolTypeBadge(type: School['type']): string {
  switch (type) {
    case 'primary': return 'bg-blue-100 text-blue-700';
    case 'secondary': return 'bg-slate-100 text-slate-700';
    case 'international':
    case 'private': return 'bg-purple-100 text-purple-700';
    case 'european': return 'bg-green-100 text-green-700';
  }
}

function getSchoolTypeLabel(type: School['type']): string {
  switch (type) {
    case 'primary': return 'Primary';
    case 'secondary': return 'Secondary';
    case 'international':
    case 'private': return 'Intl';
    case 'european': return 'EU';
  }
}

function getSourceDotClass(id: string, status: SourceStatus | undefined, count: number): string {
  if (id === 'immotop') return 'bg-red-500';
  if (!status) return 'bg-slate-300';
  if (status.status === 'ok' && count > 0) return 'bg-green-500';
  if (status.status === 'blocked' || status.status === 'failed') return 'bg-red-500';
  return 'bg-slate-300';
}

function getSourceDotTitle(id: string, status: SourceStatus | undefined, count: number): string {
  if (id === 'immotop') return 'Blocked (DataDome) — requires a real browser';
  if (!status) return 'No status data';
  if (status.status === 'ok') return `Working — ${count} listing${count !== 1 ? 's' : ''}`;
  if (status.status === 'blocked') return status.error ?? 'Blocked by anti-bot protection';
  if (status.status === 'failed') return 'Scraper failed';
  return 'No results returned';
}

const LABEL = 'text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2';
const PILL_ACTIVE = 'bg-slate-900 text-white rounded-full px-3 py-1 text-sm cursor-pointer select-none';
const PILL_INACTIVE = 'bg-white border border-slate-200 text-slate-600 rounded-full px-3 py-1 text-sm cursor-pointer select-none hover:bg-slate-50';

const CATEGORY_LABELS: Record<SourceCategory, string> = {
  portal: 'Portals',
  network: 'Networks',
  agency: 'Agencies',
};

type SearchPanelProps = {
  filters: Filters;
  onFiltersChange: (f: Filters) => void;
  properties: Property[];
  rawProperties: Property[];
  sourcesStatus: SourceStatus[];
  onSearch: () => void;
};

export function SearchPanel({ filters, onFiltersChange, properties, rawProperties, sourcesStatus, onSearch }: SearchPanelProps) {
  const [communeOpen, setCommuneOpen] = useState(false);
  const [communeSearch, setCommuneSearch] = useState('');
  const [schoolOpen, setSchoolOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const communeRef = useRef<HTMLDivElement>(null);
  const schoolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (communeRef.current && !communeRef.current.contains(e.target as Node)) setCommuneOpen(false);
      if (schoolRef.current && !schoolRef.current.contains(e.target as Node)) setSchoolOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredCommunes = ALL_COMMUNES.filter((c) =>
    c.toLowerCase().includes(communeSearch.toLowerCase()),
  );

  const selectedSchoolIds = filters.selectedSchoolIds || [];

  function set(partial: Partial<Filters>) {
    onFiltersChange({ ...filters, ...partial });
  }

  function isCategorySelected(cat: SourceCategory): boolean {
    const catSources = CATEGORY_SOURCES[cat];
    if (filters.selectedSources.length === 0) return true;
    return catSources.every(s => filters.selectedSources.includes(s));
  }

  function isCategoryPartial(cat: SourceCategory): boolean {
    const catSources = CATEGORY_SOURCES[cat];
    if (filters.selectedSources.length === 0) return false;
    const included = catSources.filter(s => filters.selectedSources.includes(s));
    return included.length > 0 && included.length < catSources.length;
  }

  function toggleCategory(cat: SourceCategory) {
    const catSources = CATEGORY_SOURCES[cat];
    const allOtherSources = Object.entries(CATEGORY_SOURCES)
      .filter(([k]) => k !== cat)
      .flatMap(([, v]) => v);

    const currentlyAllSelected = isCategorySelected(cat);
    if (currentlyAllSelected && !isCategoryPartial(cat)) {
      const baseline = filters.selectedSources.length === 0
        ? [...allOtherSources]
        : filters.selectedSources.filter(s => !catSources.includes(s));
      set({ selectedSources: baseline.length === Object.values(CATEGORY_SOURCES).flat().length ? [] : baseline });
    } else {
      const base = filters.selectedSources.length === 0
        ? Object.values(CATEGORY_SOURCES).flat()
        : [...filters.selectedSources];
      const merged = Array.from(new Set([...base, ...catSources]));
      set({ selectedSources: merged.length === Object.values(CATEGORY_SOURCES).flat().length ? [] : merged });
    }
  }

  function toggleSource(id: string) {
    const allSources = Object.values(CATEGORY_SOURCES).flat();
    let next: string[];
    if (filters.selectedSources.length === 0) {
      next = allSources.filter(s => s !== id);
    } else if (filters.selectedSources.includes(id)) {
      next = filters.selectedSources.filter(s => s !== id);
    } else {
      next = [...filters.selectedSources, id];
    }
    set({ selectedSources: next.length === allSources.length ? [] : next });
  }

  function isSourceSelected(id: string): boolean {
    return filters.selectedSources.length === 0 || filters.selectedSources.includes(id);
  }

  const sourceCounts = rawProperties.reduce((acc, p) => {
    acc[p.source] = (acc[p.source] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalSourceCount = Object.values(CATEGORY_SOURCES).flat().length;
  const selectedSourceCount = filters.selectedSources.length === 0
    ? totalSourceCount
    : filters.selectedSources.length;
  const activeSourceCount = sourcesStatus.filter(s => s.status === 'ok').length;

  const panelContent = (
    <div className="p-4 space-y-5 overflow-y-auto h-full">

      {/* 1. Transaction */}
      <div>
        <p className={LABEL}>Transaction</p>
        <div className="flex gap-2">
          {(['rent', 'sale'] as const).map((t) => (
            <span key={t} className={filters.transaction === t ? PILL_ACTIVE : PILL_INACTIVE} onClick={() => set({ transaction: t })}>
              {t === 'rent' ? 'Rent' : 'Sale'}
            </span>
          ))}
        </div>
      </div>

      {/* 2. Property type */}
      <div>
        <p className={LABEL}>Property type</p>
        <div className="flex flex-wrap gap-2">
          {(['all', 'apartment', 'house', 'studio'] as const).map((t) => (
            <span key={t} className={filters.propertyType === t ? PILL_ACTIVE : PILL_INACTIVE} onClick={() => set({ propertyType: t })}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </span>
          ))}
        </div>
      </div>

      {/* 3. Bedrooms */}
      <div>
        <p className={LABEL}>Bedrooms</p>
        <div className="flex flex-wrap gap-2">
          {(['any', '1+', '2+', '3+', '4+'] as const).map((b) => (
            <span key={b} className={filters.bedrooms === b ? PILL_ACTIVE : PILL_INACTIVE} onClick={() => set({ bedrooms: b })}>
              {b === 'any' ? 'Any' : b}
            </span>
          ))}
        </div>
      </div>

      {/* 4. Max price */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={LABEL} style={{ marginBottom: 0 }}>Max total price (incl. charges)</p>
          <span className="font-semibold text-slate-900 text-sm">{filters.maxPrice.toLocaleString()} EUR/mo</span>
        </div>
        <input type="range" min={500} max={8000} step={100} value={filters.maxPrice}
          onChange={(e) => set({ maxPrice: Number(e.target.value) })}
          className="w-full h-1.5 rounded-full cursor-pointer accent-slate-900" />
      </div>

      {/* 5. Min area */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className={LABEL} style={{ marginBottom: 0 }}>Min area</p>
          <span className="font-semibold text-slate-900 text-sm">{filters.minArea} m²</span>
        </div>
        <input type="range" min={0} max={200} step={10} value={filters.minArea}
          onChange={(e) => set({ minArea: Number(e.target.value) })}
          className="w-full h-1.5 rounded-full cursor-pointer accent-slate-900" />
      </div>

      {/* 6. Communes */}
      <div>
        <p className={LABEL}>Communes</p>
        <div className="relative" ref={communeRef}>
          <button
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none"
            onClick={() => setCommuneOpen(!communeOpen)}
          >
            <span className={filters.communes.length === 0 ? 'text-slate-400' : 'text-slate-900'}>
              {filters.communes.length === 0 ? 'All communes' : `${filters.communes.length} selected`}
            </span>
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
          </button>
          {communeOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg p-2 max-h-48 overflow-y-auto">
              <input type="text" placeholder="Search communes…" value={communeSearch}
                onChange={(e) => setCommuneSearch(e.target.value)}
                className="w-full rounded px-2 py-1 text-xs border border-slate-200 mb-2 focus:outline-none focus:border-blue-400" />
              {filteredCommunes.map((c) => (
                <label key={c} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 cursor-pointer rounded text-sm text-slate-700">
                  <input type="checkbox" checked={filters.communes.includes(c)}
                    onChange={(e) => {
                      const next = e.target.checked ? [...filters.communes, c] : filters.communes.filter(x => x !== c);
                      set({ communes: next });
                    }} />
                  {c}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* School proximity divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">School proximity</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* 7. School multi-select dropdown */}
      <div>
        <p className={LABEL}>School</p>
        <div className="relative" ref={schoolRef}>
          <button
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-left flex items-center justify-between focus:outline-none"
            onClick={() => setSchoolOpen(!schoolOpen)}
          >
            {selectedSchoolIds.length > 0 ? (
              <span className="flex items-center gap-1.5">
                {selectedSchoolIds.map((id, idx) => (
                  <span key={id} className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: SCHOOL_COLORS[idx % SCHOOL_COLORS.length] }} />
                ))}
                <span className="text-slate-900 text-sm">
                  {selectedSchoolIds.length} school{selectedSchoolIds.length !== 1 ? 's' : ''}
                </span>
              </span>
            ) : (
              <span className="text-slate-400">No school selected</span>
            )}
            <ChevronDown size={14} className="text-slate-400 shrink-0 ml-2" />
          </button>
          {schoolOpen && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
              {SCHOOLS.map((school) => {
                const isSelected = selectedSchoolIds.includes(school.id);
                const selectedIndex = selectedSchoolIds.indexOf(school.id);
                const color = selectedIndex >= 0 ? SCHOOL_COLORS[selectedIndex % SCHOOL_COLORS.length] : undefined;
                return (
                  <label key={school.id} className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={isSelected}
                      onChange={() => {
                        const next = isSelected
                          ? selectedSchoolIds.filter(id => id !== school.id)
                          : [...selectedSchoolIds, school.id];
                        set({ selectedSchoolIds: next });
                      }}
                      className="rounded border-slate-300" />
                    {color
                      ? <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                      : <div className="w-2 h-2 shrink-0" />}
                    <span className="text-slate-900 truncate flex-1">{school.name}</span>
                    <span className={`text-xs rounded-full px-2 py-0.5 shrink-0 ${getSchoolTypeBadge(school.type)}`}>
                      {getSchoolTypeLabel(school.type)}
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 8. Radius slider (only when school(s) selected) */}
      {selectedSchoolIds.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className={LABEL} style={{ marginBottom: 0 }}>Radius</p>
            <span className="font-semibold text-slate-900 text-sm">{filters.radius.toFixed(1)} km</span>
          </div>
          <input type="range" min={0.5} max={10} step={0.5} value={filters.radius}
            onChange={(e) => set({ radius: Number(e.target.value) })}
            className="w-full h-1.5 rounded-full cursor-pointer accent-slate-900" />
        </div>
      )}

      {/* More filters divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">More filters</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* 9. Feature checkboxes */}
      <div>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: 'garage', label: 'Garage' },
              { key: 'furnished', label: 'Furnished' },
              { key: 'balcony', label: 'Balcony' },
              { key: 'evCharger', label: 'EV charger' },
            ] as { key: keyof Pick<Filters, 'garage' | 'furnished' | 'balcony' | 'evCharger'>; label: string }[]
          ).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={filters[key]}
                onChange={(e) => set({ [key]: e.target.checked })}
                className="rounded border-slate-300" />
              <span className="text-sm text-slate-600">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Sources divider */}
      <div className="relative flex items-center gap-3">
        <div className="flex-1 border-t border-slate-200" />
        <span className="text-xs text-slate-400 font-medium whitespace-nowrap">Sources</span>
        <div className="flex-1 border-t border-slate-200" />
      </div>

      {/* Sources: combined filter + health panel */}
      <div>
        <button
          onClick={() => setSourcesOpen(!sourcesOpen)}
          className="w-full flex items-center justify-between text-sm text-slate-600 hover:text-slate-900"
        >
          <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
            {selectedSourceCount} of {totalSourceCount} selected
            {activeSourceCount > 0 && (
              <span className="normal-case font-normal text-slate-400">
                · <span className="text-green-600 font-medium">{activeSourceCount}</span> active
              </span>
            )}
          </span>
          <ChevronRight size={14} className={`text-slate-400 transition-transform ${sourcesOpen ? 'rotate-90' : ''}`} />
        </button>

        {sourcesOpen && (
          <div className="mt-3 space-y-4">
            {(['portal', 'network', 'agency'] as SourceCategory[]).map(cat => (
              <div key={cat}>
                <label className="flex items-center gap-2 cursor-pointer mb-1.5">
                  <input
                    type="checkbox"
                    checked={isCategorySelected(cat)}
                    ref={el => { if (el) el.indeterminate = isCategoryPartial(cat); }}
                    onChange={() => toggleCategory(cat)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {CATEGORY_LABELS[cat]}
                  </span>
                </label>
                <div className="space-y-1 ml-4">
                  {CATEGORY_SOURCES[cat].map(id => {
                    const meta = SOURCE_META[id];
                    if (!meta) return null;
                    const isImmotop = id === 'immotop';
                    const statusEntry = sourcesStatus.find(s => s.name === id);
                    const count = sourceCounts[id] || 0;
                    const dotClass = getSourceDotClass(id, statusEntry, count);
                    const dotTitle = getSourceDotTitle(id, statusEntry, count);
                    const selected = !isImmotop && isSourceSelected(id);

                    return (
                      <div key={id} className="flex items-center gap-2 py-0.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${dotClass}`} title={dotTitle} />
                        <input
                          type="checkbox"
                          checked={selected}
                          disabled={isImmotop}
                          onChange={() => !isImmotop && toggleSource(id)}
                          className="rounded border-slate-300 disabled:opacity-30"
                        />
                        <a
                          href={meta.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-slate-700 hover:underline truncate flex-1"
                          title={meta.label}
                        >
                          {meta.label}
                        </a>
                        {isImmotop ? (
                          <span
                            className="text-[10px] text-red-500 font-medium shrink-0 cursor-help"
                            title="Blocked by DataDome — requires a real browser. Do not attempt to scrape."
                          >
                            blocked
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 shrink-0 tabular-nums">
                            {count > 0 ? count : (statusEntry ? '—' : '')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search button */}
      <button onClick={onSearch}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-medium py-2.5 hover:bg-slate-800 transition-colors">
        <Search size={15} />
        Search
      </button>

      {/* Reset */}
      <button onClick={() => onFiltersChange(DEFAULT_FILTERS)}
        className="w-full text-center text-sm text-slate-500 hover:text-slate-700 transition-colors">
        Reset filters
      </button>

      {/* Property count summary */}
      <p className="text-xs text-slate-400 text-center pb-2">
        {properties.length} {properties.length === 1 ? 'listing' : 'listings'} match current filters
      </p>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col w-80 shrink-0 border-r border-slate-200 bg-white overflow-hidden h-full">
        {panelContent}
      </div>

      {/* Mobile floating button */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
        <button onClick={() => setMobileOpen(true)}
          className="flex items-center gap-2 rounded-full bg-slate-900 text-white text-sm font-medium px-5 py-3 shadow-lg hover:bg-slate-800 transition-colors">
          <Search size={15} />
          Filter · {properties.length} results
        </button>
      </div>

      {/* Mobile sheet */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex flex-col justify-end">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setMobileOpen(false)} />
          <div className="relative bg-white rounded-t-2xl flex flex-col" style={{ height: '85vh' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 shrink-0">
              <p className="font-semibold text-slate-900">Filters</p>
              <button onClick={() => setMobileOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                <X size={18} className="text-slate-500" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">{panelContent}</div>
          </div>
        </div>
      )}
    </>
  );
}
