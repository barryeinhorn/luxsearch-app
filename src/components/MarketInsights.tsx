import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { X, ExternalLink } from 'lucide-react';
import { API_URL } from '../lib/api';
import { DIRECTORY_AGENCIES, type DirectoryAgencyCategory } from '../constants/sources';
import type { MarketSnapshot } from '../types';

type MarketInsightsProps = {
  onClose: () => void;
};

function getCategoryTagClass(cat: DirectoryAgencyCategory): string {
  switch (cat) {
    case 'Portal':  return 'bg-indigo-100 text-indigo-700';
    case 'Luxury':  return 'bg-amber-100 text-amber-700';
    case 'Network': return 'bg-blue-100 text-blue-700';
    case 'City':    return 'bg-green-100 text-green-700';
    case 'Local':   return 'bg-slate-100 text-slate-600';
  }
}

const FB_GROUPS = [
  { name: 'Expats in Luxembourg — Housing', url: 'https://www.facebook.com/groups/expatsinluxembourghousing' },
  { name: 'Luxembourg Expats — Apartments & Houses', url: 'https://www.facebook.com/groups/luxembourgexpathousing' },
  { name: 'Logement Luxembourg', url: 'https://www.facebook.com/groups/logementluxembourg' },
  { name: 'Flatmates Luxembourg', url: 'https://www.facebook.com/groups/flatmatesluxembourg' },
];

export function MarketInsights({ onClose }: MarketInsightsProps) {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API_URL}/api/market`);
        if (!response.ok) throw new Error('Failed');
        setData(await response.json());
      } catch {
        setError('Market data is unavailable.');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const sortedCommunes = data
    ? [...data.communes].sort((a, b) => b.avgRent3BR - a.avgRent3BR)
    : [];

  const avgDaysOnMarket = data
    ? Math.round(data.communes.reduce((s, c) => s + c.medianDaysOnMarket, 0) / data.communes.length)
    : 0;

  const avgYoyChange = data
    ? (data.communes.reduce((s, c) => s + c.yoyChange, 0) / data.communes.length).toFixed(1)
    : '0';

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div>
          <p className="font-semibold text-slate-900">Market insights</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Last updated: May 2026 · athome.lu + immotop.lu
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-5 w-2/3 rounded-lg bg-slate-100 animate-pulse" />
            <div className="h-32 rounded-xl bg-slate-100 animate-pulse" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 rounded-lg bg-slate-100 animate-pulse" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="rounded-lg bg-rose-50 border border-rose-200 p-4 text-sm text-rose-600">{error}</div>
        ) : data ? (
          <>
            {/* 4 metric cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">City avg 3BR rent</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {data.cityAvgRent3BR.toLocaleString()} EUR/mo
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">City avg price/m²</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {data.cityAvgSalePriceM2.toLocaleString()} EUR
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Median days on market</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{avgDaysOnMarket} days</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Year-over-year</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">+{avgYoyChange}%</p>
              </div>
            </div>

            {/* Horizontal bar chart */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Average 3BR rent by commune
              </p>
              <div style={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart layout="vertical" data={sortedCommunes} margin={{ left: 0, right: 60, top: 0, bottom: 0 }}>
                    <CartesianGrid horizontal={false} stroke="#f1f5f9" />
                    <XAxis type="number" hide />
                    <YAxis
                      type="category"
                      dataKey="commune"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      width={85}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Bar dataKey="avgRent3BR" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey="avgRent3BR"
                        position="right"
                        formatter={(v: number) => `€${v.toLocaleString()}`}
                        style={{ fontSize: 11, fill: '#475569' }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Footer */}
            <div className="text-xs text-slate-400 pb-2">
              Sources:{' '}
              <a href="https://www.athome.lu/blog/en/real-estate-market/" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">athome.lu</a>
              {' · '}
              <a href="https://www.immotop.lu/en/" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">immotop.lu</a>
              {' · '}
              <a href="https://www.investropa.com/blogs/news/luxembourg-real-estate-market" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">investropa.com</a>
            </div>
          </>
        ) : null}

        {/* Agency Directory */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Agency directory
          </p>
          <p className="text-xs text-slate-500 mb-3">
            These agencies are not available for direct search but worth visiting directly
          </p>
          <div className="grid grid-cols-2 gap-2">
            {DIRECTORY_AGENCIES.map(agency => (
              <a
                key={agency.id}
                href={agency.url}
                target="_blank"
                rel="noreferrer"
                className="flex flex-col gap-1.5 rounded-lg border border-slate-200 p-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-1">
                  <span className="text-xs font-semibold text-slate-900 group-hover:text-blue-700 leading-tight">{agency.name}</span>
                  <ExternalLink size={10} className="shrink-0 mt-0.5 opacity-30 group-hover:opacity-80 transition-opacity" />
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">{agency.description}</p>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full w-fit ${getCategoryTagClass(agency.category)}`}>
                  {agency.category}
                </span>
              </a>
            ))}
          </div>
        </div>

        {/* Facebook groups */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Community listings (Facebook)
          </p>
          <p className="text-xs text-slate-500 mb-3">
            These groups have listings not found on agency sites. Check manually for best results.
          </p>
          <div className="space-y-2">
            {FB_GROUPS.map(group => (
              <a
                key={group.url}
                href={group.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-[#1877F2] hover:text-[#1877F2] transition-colors group"
              >
                <span>{group.name}</span>
                <ExternalLink size={12} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
