import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Circle, Marker, Polygon, useMap } from 'react-leaflet';
import { useRef, useEffect } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyCardPopup } from './PropertyCard';
import type { Property } from '../types';
import type { IsochroneFeature } from '../lib/isochrone';

// Fix Leaflet default icon URLs broken by bundlers
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

function getMarkerColor(property: Property): string {
  if (property.transaction === 'sale') return '#ef4444';
  const total = property.totalMonthly ?? property.price + property.charges;
  if (total < 2500) return '#22c55e';
  if (total < 3500) return '#eab308';
  if (total < 5000) return '#f97316';
  return '#ef4444';
}

function formatTooltipPrice(property: Property): string {
  if (property.transaction === 'sale') {
    const k = Math.round(property.price / 1000);
    return `${k}k EUR`;
  }
  const total = property.totalMonthly ?? property.price + property.charges;
  return `${(total / 1000).toFixed(1)}k EUR/mo`;
}

function costBadgeStyle(cost: 'free' | 'subsidised' | 'paid'): { background: string; color: string } {
  if (cost === 'free') return { background: '#dcfce7', color: '#15803d' };
  if (cost === 'subsidised') return { background: '#dbeafe', color: '#1d4ed8' };
  return { background: '#f3e8ff', color: '#7e22ce' };
}
function costLabel(cost: 'free' | 'subsidised' | 'paid'): string {
  if (cost === 'free') return 'Free';
  if (cost === 'subsidised') return 'Sub.';
  return 'Paid';
}

function makeSchoolIcon(shortName: string, color: string): L.DivIcon {
  return L.divIcon({
    html: `<div class="lux-school-badge" style="background:white;border:2px solid ${color};border-radius:8px;padding:4px 10px;font-size:11px;font-weight:600;white-space:nowrap;box-shadow:0 2px 6px rgba(0,0,0,0.2);color:#1e293b;font-family:Inter,sans-serif;">🎓 ${shortName}</div>`,
    className: '',
    iconSize: undefined,
    iconAnchor: [0, 0],
  });
}

function MapFlyController({
  selectedPropertyId,
  properties,
  markerRefs,
}: {
  selectedPropertyId: string | null;
  properties: Property[];
  markerRefs: { current: Record<string, L.CircleMarker> };
}) {
  const map = useMap();
  useEffect(() => {
    if (!selectedPropertyId) return;
    const prop = properties.find(p => p.id === selectedPropertyId);
    if (!prop || (prop.lat === 0 && prop.lng === 0)) return;
    map.flyTo([prop.lat, prop.lng], 15, { duration: 0.8 });
    setTimeout(() => { markerRefs.current[selectedPropertyId]?.openPopup(); }, 850);
  }, [selectedPropertyId, map, properties, markerRefs]);
  return null;
}

export type SchoolCircle = {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  shortName: string;
  color: string;
  commune: string;
  cost: 'free' | 'subsidised' | 'paid';
  curriculum: string;
  feeRange: string | undefined;
  ageRange: string;
  website: string;
};

type MapViewProps = {
  properties: Property[];
  schoolCircles?: SchoolCircle[];
  isochroneMap?: Record<string, IsochroneFeature>;
  selectedPropertyId?: string | null;
};

export function MapView({ properties, schoolCircles = [], isochroneMap = {}, selectedPropertyId = null }: MapViewProps) {
  const markerRefs = useRef<Record<string, L.CircleMarker>>({});
  const primarySchool = schoolCircles[0];
  const center: [number, number] = primarySchool
    ? [primarySchool.lat, primarySchool.lng]
    : [49.611, 6.13];

  return (
    <div className="relative h-full w-full">
      <MapContainer center={center} zoom={12} className="h-full w-full">
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapFlyController selectedPropertyId={selectedPropertyId} properties={properties} markerRefs={markerRefs} />

        {/* School isochrone/circle overlays + markers */}
        {schoolCircles.flatMap((circle) => {
          const icon = makeSchoolIcon(circle.shortName, circle.color);
          const radiusKm = circle.radius / 1000;
          const iso = isochroneMap[`${circle.id}:${radiusKm}`];
          let positions: [number, number][] | null = null;
          if (iso) {
            // ORS returns [lng, lat]; Leaflet Polygon needs [lat, lng]
            const coords = iso.geometry.coordinates[0] as [number, number][];
            positions = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
            console.log(`[mapview] ${circle.shortName} polygon: ${positions.length} pts, first=${JSON.stringify(positions[0])}`);
          }
          const shapeOptions = {
            color: circle.color,
            fillColor: circle.color,
            fillOpacity: 0.06,
            dashArray: '8 4' as string,
            weight: 2,
            interactive: false,
          };
          return [
            positions ? (
              <Polygon
                key={`iso-${circle.id}-${radiusKm}`}
                positions={positions}
                pathOptions={shapeOptions}
              />
            ) : (
              <Circle
                key={`circle-${circle.id}`}
                center={[circle.lat, circle.lng]}
                radius={circle.radius}
                pathOptions={shapeOptions}
              />
            ),
            <Marker key={`marker-${circle.id}`} position={[circle.lat, circle.lng]} icon={icon}>
              <Popup>
                <div style={{ padding: '12px 14px', minWidth: 220, fontSize: 12, lineHeight: 1.6, color: '#0f172a' }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>{circle.name}</div>
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ color: '#64748b' }}>Curriculum: </span>{circle.curriculum}
                  </div>
                  <div style={{ marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ color: '#64748b' }}>Cost: </span>
                    <span style={{ padding: '1px 7px', borderRadius: 9999, fontSize: 11, fontWeight: 500, ...costBadgeStyle(circle.cost) }}>
                      {costLabel(circle.cost)}
                    </span>
                  </div>
                  {circle.feeRange && (
                    <div style={{ marginBottom: 3 }}>
                      <span style={{ color: '#64748b' }}>Fees: </span>{circle.feeRange}
                    </div>
                  )}
                  <div style={{ marginBottom: 3 }}>
                    <span style={{ color: '#64748b' }}>Ages: </span>{circle.ageRange}
                  </div>
                  <div style={{ marginBottom: 6 }}>
                    <span style={{ color: '#64748b' }}>Commune: </span>{circle.commune}
                  </div>
                  <a
                    href={circle.website}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: '#3b82f6', textDecoration: 'underline' }}
                  >
                    Visit website ↗
                  </a>
                </div>
              </Popup>
            </Marker>,
          ];
        })}

        {/* Property markers */}
        {properties.map((property) => {
          const color = getMarkerColor(property);
          return (
            <CircleMarker
              key={property.id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ref={(m: any) => { if (m) markerRefs.current[property.id] = m; else delete markerRefs.current[property.id]; }}
              center={[property.lat, property.lng]}
              radius={10}
              pathOptions={{
                fillColor: color,
                fillOpacity: 0.85,
                color: 'white',
                weight: 2,
              }}
            >
              <Tooltip>{formatTooltipPrice(property)}</Tooltip>
              <Popup maxWidth={300} minWidth={280}>
                <PropertyCardPopup property={property} />
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {/* School legend */}
      {schoolCircles.length > 0 && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-white border border-slate-200 rounded-xl shadow-sm px-3 py-2 space-y-1.5 pointer-events-none">
          {schoolCircles.map((circle) => {
            const radiusKm = circle.radius / 1000;
            const loaded = !!isochroneMap[`${circle.id}:${radiusKm}`];
            return (
              <div key={circle.id} className="flex items-center gap-2 text-xs text-slate-700">
                <div style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: circle.color, flexShrink: 0 }} />
                <span className="font-medium">{circle.shortName}</span>
                <span className="text-slate-400">
                  {radiusKm.toFixed(1)} km road {loaded ? '✓' : '…'}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
