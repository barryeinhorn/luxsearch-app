import { useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, Circle, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { PropertyCardPopup } from './PropertyCard';
import type { Property } from '../types';

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

export type SchoolCircle = {
  id: string;
  lat: number;
  lng: number;
  radius: number;
  name: string;
  color: string;
};

type MapViewProps = {
  properties: Property[];
  schoolCircles?: SchoolCircle[];
};

export function MapView({ properties, schoolCircles = [] }: MapViewProps) {
  const primarySchool = schoolCircles[0];
  const center: [number, number] = primarySchool
    ? [primarySchool.lat, primarySchool.lng]
    : [49.611, 6.13];

  const schoolIcon = useMemo(
    () =>
      L.divIcon({
        html: `<div style="background:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(15,23,42,0.18);font-size:16px;line-height:1;">🎓</div>`,
        className: '',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      }),
    [],
  );

  return (
    <MapContainer center={center} zoom={12} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* School radius circles + markers (one per selected school, each with its own color) */}
      {schoolCircles.flatMap((circle) => [
        <Circle
          key={`circle-${circle.id}`}
          center={[circle.lat, circle.lng]}
          radius={circle.radius}
          pathOptions={{
            color: circle.color,
            fillColor: circle.color,
            fillOpacity: 0.06,
            dashArray: '8 4',
            weight: 2,
          }}
        />,
        <Marker key={`marker-${circle.id}`} position={[circle.lat, circle.lng]} icon={schoolIcon}>
          <Tooltip>{circle.name}</Tooltip>
        </Marker>,
      ])}

      {/* Property markers */}
      {properties.map((property) => {
        const color = getMarkerColor(property);
        return (
          <CircleMarker
            key={property.id}
            center={[property.lat, property.lng]}
            radius={18}
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
  );
}
