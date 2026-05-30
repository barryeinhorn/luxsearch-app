import { Building2 } from 'lucide-react';
import type { Property } from '../types';
import { getSourceMeta } from '../constants/sources';

function getSourceBadgeClasses(source: string): string {
  const meta = getSourceMeta(source);
  return `${meta.bg} ${meta.text}`;
}

function getSourceLabel(source: string): string {
  return getSourceMeta(source).label;
}

function getEnergyBadge(cls: string): string {
  if (cls === 'A++' || cls === 'A+' || cls === 'A') return 'bg-emerald-100 text-emerald-700';
  if (cls === 'B') return 'bg-green-100 text-green-700';
  if (cls === 'C') return 'bg-lime-100 text-lime-700';
  if (cls === 'D') return 'bg-yellow-100 text-yellow-700';
  if (cls === 'E') return 'bg-orange-100 text-orange-700';
  return 'bg-red-100 text-red-700';
}

/** Compact card for the horizontal strip below the map */
export function PropertyCard({ property }: { property: Property }) {
  const isSale = property.transaction === 'sale';
  const totalMonthly = property.totalMonthly ?? property.price + property.charges;

  return (
    <div className="w-[200px] flex-shrink-0 rounded-xl border border-slate-100 shadow-sm bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
      <div className="h-[100px] bg-slate-100 flex items-center justify-center overflow-hidden">
        {property.images && property.images.length > 0 ? (
          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <Building2 size={32} className="text-slate-300" />
        )}
      </div>
      <div className="p-[10px]">
        <div className="flex gap-1 flex-wrap">
          <span className={`text-xs rounded-full px-2 py-0.5 ${getSourceBadgeClasses(property.source)}`}>
            {getSourceLabel(property.source)}
          </span>
          <span className="text-xs rounded-full px-2 py-0.5 bg-slate-100 text-slate-600 truncate max-w-[80px]">
            {property.commune}
          </span>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          {property.bedrooms}br · {property.area}m²
        </p>
        <p className="font-bold text-slate-900 text-sm mt-1">
          {isSale ? `€${property.price.toLocaleString()}` : `${totalMonthly.toLocaleString()} EUR/mo`}
        </p>
        {!isSale && property.charges > 0 && (
          <p className="text-xs text-slate-400">
            ({property.price.toLocaleString()} + {property.charges} charges)
          </p>
        )}
      </div>
    </div>
  );
}

/** Full popup card shown inside a Leaflet Popup on marker click */
export function PropertyCardPopup({ property }: { property: Property }) {
  const isSale = property.transaction === 'sale';
  const totalMonthly = property.totalMonthly ?? property.price + property.charges;
  const agencyFee = Math.round(property.price * 1.17);
  const deposit = property.price * 2;

  return (
    <div className="w-[280px] font-sans">
      {/* Image */}
      <div className="h-[140px] bg-slate-100 flex items-center justify-center overflow-hidden">
        {property.images && property.images.length > 0 ? (
          <img src={property.images[0]} alt={property.title} className="w-full h-full object-cover" />
        ) : (
          <Building2 size={40} className="text-slate-300" />
        )}
      </div>

      <div className="p-3">
        {/* Badges */}
        <div className="flex gap-1 flex-wrap">
          <span className={`text-xs rounded-full px-2 py-0.5 ${getSourceBadgeClasses(property.source)}`}>
            {getSourceLabel(property.source)}
          </span>
          <span className="text-xs rounded-full px-2 py-0.5 bg-slate-100 text-slate-600">
            {property.commune}
          </span>
        </div>

        {/* Title */}
        <p className="font-medium text-slate-900 text-sm mt-2 leading-snug line-clamp-2">{property.title}</p>

        {/* Stats */}
        <p className="text-sm text-slate-500 mt-1">
          🛏 {property.bedrooms}
          {property.area ? ` · 📐 ${property.area}m²` : ''}
          {property.floor !== undefined && property.floor > 0 ? ` · Floor ${property.floor}` : ''}
        </p>

        {/* Price breakdown */}
        <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 mt-3 text-sm">
          {isSale ? (
            <div className="flex justify-between items-center">
              <span className="font-semibold text-slate-900">Sale price</span>
              <span className="font-semibold text-green-600 text-base">€{property.price.toLocaleString()}</span>
            </div>
          ) : (
            <>
              <div className="flex justify-between text-slate-600">
                <span>Rent</span>
                <span>€{property.price.toLocaleString()}/mo</span>
              </div>
              <div className="flex justify-between text-slate-600 mt-1">
                <span className="flex items-center gap-1">
                  + Charges
                  {!property.chargesKnown && <span className="text-amber-500 text-xs">⚠</span>}
                </span>
                <span className={!property.chargesKnown ? 'text-amber-600' : ''}>
                  {property.chargesKnown ? `€${property.charges}/mo` : '~€200 est.'}
                </span>
              </div>
              <div className="border-t border-slate-200 my-2" />
              <div className="flex justify-between items-center">
                <span className="font-semibold text-slate-900">Total</span>
                <span className="font-semibold text-green-600 text-base">€{totalMonthly.toLocaleString()}/mo</span>
              </div>
              <div className="border-t border-slate-200 my-2" />
              <div className="flex justify-between text-xs text-slate-500">
                <span>Agency fee est.</span>
                <span>€{agencyFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>Deposit est.</span>
                <span>€{deposit.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {/* Features chips */}
        {property.features && (
          <div className="flex flex-wrap gap-1 mt-2">
            {property.features.garage && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">🅿 Garage</span>
            )}
            {property.features.balcony && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">☀ Balcony</span>
            )}
            {property.features.furnished && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">🛋 Furnished</span>
            )}
            {property.features.evCharger && (
              <span className="text-xs bg-slate-100 text-slate-600 rounded px-2 py-0.5">⚡ EV</span>
            )}
          </div>
        )}

        {/* Energy class */}
        {property.energyClass && (
          <div className="mt-2 flex items-center gap-2">
            <span className={`rounded px-2 py-0.5 text-xs font-semibold ${getEnergyBadge(property.energyClass)}`}>
              {property.energyClass}
            </span>
            {property.available && (
              <span className="text-xs text-slate-400">Available: {property.available}</span>
            )}
          </div>
        )}

        {/* View listing */}
        {property.sourceUrl && (
          <a
            href={property.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-3 flex items-center justify-center w-full rounded-lg bg-slate-900 text-white text-sm font-medium py-2 hover:bg-slate-800 transition-colors"
          >
            View listing →
          </a>
        )}
      </div>
    </div>
  );
}
