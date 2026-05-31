import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { X, ExternalLink } from 'lucide-react';
import { API_URL } from '../lib/api';
import type { CommuneData, MarketSnapshot } from '../types';

const FB_GROUPS = [
  { name: 'Luxembourg Expats', url: 'https://www.facebook.com/groups/luxembourgexpats' },
  { name: 'Luxembourg Expats — Apartments & Houses', url: 'https://www.facebook.com/groups/luxembourgexpathousing' },
  { name: 'Apartments Luxembourg', url: 'https://www.facebook.com/groups/apartments.luxembourg' },
];

const ALT_LINKS = [
  { name: 'Wort Immo', url: 'https://www.wortimmo.lu/en' },
];

const TOOLTIPS = {
  rent: 'Median asking rent from active listings in this bedroom category across all communes.',
  saleM2: 'Estimated from active sale listings. Actual transaction prices may be 5–15% lower.',
  daysOnMarket: 'Estimated figure — actual days on market are not directly available from listing data.',
  yoy: 'Price trend estimate based on available data. Not a verified statistical figure.',
};

function InfoTooltip({ text }: { text: string }) {
  return (
    <span className="relative inline-block group ml-1 align-middle">
      <span className="text-slate-300 cursor-help text-[11px] leading-none select-none">ⓘ</span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-50 w-48 bg-slate-800 text-white text-xs rounded-lg px-2.5 py-2 shadow-lg whitespace-normal text-center">
        {text}
      </span>
    </span>
  );
}

function StatusBadge({ data }: { data: MarketSnapshot | null }) {
  if (!data) return null;

  if (data.isLive && data.calculatedAt) {
    const ageHours = (Date.now() - new Date(data.calculatedAt).getTime()) / 3_600_000;
    if (ageHours < 24) {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
          ● Live · Updated today
        </span>
      );
    }
    const days = Math.round(ageHours / 24);
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
        ● Updated {days} day{days !== 1 ? 's' : ''} ago
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-700 bg-rose-50 border border-rose-200 rounded-full px-2 py-0.5">
      ● Estimated · May 2026
    </span>
  );
}

type MarketInsightsProps = {
  onClose: () => void;
};

export function MarketInsights({ onClose }: MarketInsightsProps) {
  const [data, setData] = useState<MarketSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bedrooms, setBedrooms] = useState<1 | 2 | 3>(3);

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

  const rentKey = `avgRent${bedrooms}BR` as keyof CommuneData;

  const sortedCommunes = data
    ? [...data.communes].sort((a, b) => (b[rentKey] as number) - (a[rentKey] as number))
    : [];

  const avgDaysOnMarket = data
    ? Math.round(data.communes.reduce((s, c) => s + c.medianDaysOnMarket, 0) / data.communes.length)
    : 0;

  const avgYoyChange = data
    ? (data.communes.reduce((s, c) => s + c.yoyChange, 0) / data.communes.length).toFixed(1)
    : '0';

  const cityAvgRent = useMemo(() => {
    if (!data) return 0;
    const cityKey = `cityAvgRent${bedrooms}BR` as 'cityAvgRent1BR' | 'cityAvgRent2BR' | 'cityAvgRent3BR';
    if (data[cityKey]) return data[cityKey]!;
    const vals = data.communes.map(c => c[rentKey] as number);
    return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
  }, [data, bedrooms, rentKey]);

  const subtitle = data?.isLive
    ? `Calculated from ${data.sampleSize?.toLocaleString()} active listings`
    : 'Live data unavailable — showing estimates';

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-slate-100 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-slate-900">Market insights</p>
            {!loading && <StatusBadge data={data} />}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors shrink-0"
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
            {/* Bedroom selector — controls metric card 1 and chart */}
            <div className="flex gap-2">
              {([1, 2, 3] as const).map(br => (
                <button
                  key={br}
                  onClick={() => setBedrooms(br)}
                  className={`px-4 py-1 rounded-full text-xs font-medium border transition-colors ${
                    bedrooms === br
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
                >
                  {br}BR
                </button>
              ))}
            </div>

            {/* 4 metric cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 flex items-center">
                  City avg {bedrooms}BR rent
                  <InfoTooltip text={TOOLTIPS.rent} />
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {cityAvgRent.toLocaleString()} EUR/mo
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 flex items-center">
                  City avg price/m²
                  <InfoTooltip text={TOOLTIPS.saleM2} />
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {data.cityAvgSalePriceM2.toLocaleString()} EUR
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 flex items-center">
                  Median days on market
                  <InfoTooltip text={TOOLTIPS.daysOnMarket} />
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{avgDaysOnMarket} days</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 flex items-center">
                  Year-over-year
                  <InfoTooltip text={TOOLTIPS.yoy} />
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">+{avgYoyChange}%</p>
              </div>
            </div>

            {/* Data explanation note */}
            <div className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3 border border-slate-200">
              <span className="font-medium">ℹ️ About this data: </span>
              Figures are calculated from active listings on athome.lu and vivi.lu.
              These are <strong>asking prices</strong>, not final transaction prices.
              Sample size and accuracy vary by commune.
              {data.isLive && data.sampleSize ? ` Based on ${data.sampleSize.toLocaleString()} listings.` : ''}
            </div>

            {/* Horizontal bar chart */}
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
                Average {bedrooms}BR rent by commune
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
                    <Bar dataKey={rentKey as string} fill="#3b82f6" radius={[0, 4, 4, 0]}>
                      <LabelList
                        dataKey={rentKey as string}
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
              <a href="https://www.vivi.lu/en/" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">vivi.lu</a>
              {' · '}
              <a href="https://www.investropa.com/blogs/news/luxembourg-real-estate-market" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">investropa.com</a>
            </div>
          </>
        ) : null}

        {/* Community listings */}
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">
            Community listings
          </p>
          <p className="text-xs text-slate-500 mb-3">
            These groups and sites have listings not found on agency portals.
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
            {ALT_LINKS.map(link => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between gap-2 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:border-slate-400 hover:text-slate-900 transition-colors group"
              >
                <span>{link.name}</span>
                <ExternalLink size={12} className="shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
              </a>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Facebook groups require membership to view listings.
          </p>
        </div>
      </div>
    </div>
  );
}
