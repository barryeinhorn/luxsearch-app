import { useState, useEffect, useMemo } from 'react';
import { Building2, ExternalLink, Phone, Globe } from 'lucide-react';
import { API_URL } from '../lib/api';
import type { Agency } from '../types';

const EDITUS_ALL_URL =
  'https://www.editus.lu/en/results/real-estate-council/real-estate-agency-667r?f=17%3ALuxembourg';
const EDITUS_TOTAL = 1680;

const COMMUNES = [
  'All', 'Belair', 'Bonnevoie', 'Bertrange', 'Cessange', 'Cents', 'Clausen',
  'Gasperich', 'Gare', 'Grund', 'Hamm', 'Hesperange', 'Hollerich', 'Kirchberg',
  'Limpertsberg', 'Luxembourg', 'Merl', 'Pfaffenthal', 'Rollingergrund',
  'Strassen', 'Weimerskirch',
];

export function AgencyDirectory() {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [commune, setCommune] = useState('All');

  useEffect(() => {
    fetch(`${API_URL}/api/agencies`)
      .then(r => r.json())
      .then(({ agencies: data }) => {
        setAgencies(data ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return agencies.filter(a => {
      if (q && !a.name.toLowerCase().includes(q) && !a.commune.toLowerCase().includes(q) && !a.address.toLowerCase().includes(q)) return false;
      if (commune !== 'All' && a.commune !== commune) return false;
      return true;
    });
  }, [agencies, search, commune]);

  return (
    <div className="flex flex-col h-full overflow-auto bg-slate-50">

      {/* Filter bar */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h1 className="font-semibold text-slate-900">Agency Directory</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                {loading ? 'Loading…' : agencies.length > 0 ? `${agencies.length} agencies · ` : ''}
                <a
                  href={EDITUS_ALL_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                >
                  {EDITUS_TOTAL.toLocaleString()} total on Editus
                  <ExternalLink size={10} className="ml-0.5" />
                </a>
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Search by name or address…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
            />
            <select
              value={commune}
              onChange={e => setCommune(e.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:border-blue-400 bg-white"
            >
              {COMMUNES.map(c => (
                <option key={c} value={c}>{c === 'All' ? 'All communes' : c}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 px-6 py-4 overflow-auto">
        <div className="max-w-5xl mx-auto">

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-32 bg-white rounded-xl border border-slate-100 animate-pulse" />
              ))}
            </div>
          ) : agencies.length === 0 ? (
            <div className="text-center py-20">
              <Building2 size={48} className="text-slate-200 mx-auto mb-4" />
              <p className="text-slate-500 font-medium">No agency data available</p>
              <p className="text-slate-400 text-sm mt-1 mb-6">
                Could not load the agency directory. Browse all agencies directly on Editus.
              </p>
              <a
                href={EDITUS_ALL_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-slate-800 transition-colors"
              >
                Browse all {EDITUS_TOTAL.toLocaleString()} agencies on Editus
                <ExternalLink size={14} />
              </a>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-400 mb-3">
                Showing {filtered.length} of {agencies.length} agencies
              </p>
              {filtered.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-sm">
                  No agencies match your search.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filtered.map((agency, i) => (
                    <AgencyCard key={i} agency={agency} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Footer CTA */}
          <div className="mt-8 rounded-xl bg-white border border-slate-200 px-6 py-5 text-center">
            <p className="text-sm text-slate-600 mb-3">
              Can't find the agency you're looking for?
            </p>
            <a
              href={EDITUS_ALL_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 text-white text-sm font-medium px-5 py-2.5 hover:bg-slate-800 transition-colors"
            >
              Search all {EDITUS_TOTAL.toLocaleString()} agencies on Editus
              <ExternalLink size={14} />
            </a>
          </div>

        </div>
      </div>
    </div>
  );
}

function AgencyCard({ agency }: { agency: Agency }) {
  return (
    <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4 flex flex-col gap-2 hover:shadow-md transition-shadow">
      <div className="font-semibold text-slate-900 text-sm leading-snug">{agency.name}</div>
      {agency.address && (
        <p className="text-xs text-slate-500 leading-snug line-clamp-2">{agency.address}</p>
      )}
      {agency.phone && (
        <a
          href={`tel:${agency.phone}`}
          className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-blue-600 transition-colors w-fit"
        >
          <Phone size={11} className="shrink-0" />
          {agency.phone}
        </a>
      )}
      <div className="flex gap-2 mt-auto pt-1">
        {agency.website && (
          <a
            href={agency.website}
            target="_blank"
            rel="noreferrer"
            className="flex-1 flex items-center justify-center gap-1 text-xs border border-slate-200 rounded-lg py-1.5 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            <Globe size={11} />
            Website
          </a>
        )}
        {agency.editusUrl && (
          <a
            href={agency.editusUrl}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center justify-center gap-1 text-xs border border-slate-200 rounded-lg py-1.5 px-3 text-slate-600 hover:bg-slate-50 hover:border-slate-400 transition-colors ${!agency.website ? 'flex-1' : ''}`}
          >
            <ExternalLink size={11} />
            Editus
          </a>
        )}
      </div>
    </div>
  );
}
