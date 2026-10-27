'use client';

import { useSyncExternalStore } from 'react';
import {
  directionsUrl,
  platformFrom,
  type MapPlatform,
} from '@/lib/directions';

const subscribe = () => () => {};
const current = (): MapPlatform =>
  platformFrom(navigator.userAgent, navigator.maxTouchPoints);

// En el servidor (y al hidratar) es el mapa abierto: sin JavaScript sigue
// funcionando. Ya en el navegador se cambia por la app de mapas del móvil.
export function DirectionsLink({
  lat,
  lng,
  name,
  label,
  className,
}: {
  lat: number;
  lng: number;
  name: string;
  label: string;
  className?: string;
}) {
  const platform = useSyncExternalStore<MapPlatform>(
    subscribe,
    current,
    () => 'web',
  );
  return (
    <a
      href={directionsUrl({ lat, lng, name }, platform)}
      className={className}
      {...(platform === 'web'
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
    >
      {label}
    </a>
  );
}
