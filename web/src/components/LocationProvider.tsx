'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import type { Position } from '@/lib/geo';
import { loadRegions } from '@/lib/regions';
import type { Zone } from '@/lib/types';
import { NEAR_KM, nearestCity } from '@/lib/zone';

export type LocationStatus =
  'idle' | 'asking' | 'granted' | 'denied' | 'unavailable' | 'outside';

interface LocationState {
  status: LocationStatus;
  position: Position | null;
  // La ciudad con locales más cercana, si hay alguna a menos de NEAR_KM.
  nearest: Zone | null;
  request: () => void;
  clear: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

// Ubicación de la persona, solo tras pulsar "Cerca de mí". Vive en memoria
// mientras dura la visita (sobrevive al cambio mapa/lista): no se guarda ni se envía.
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [position, setPosition] = useState<Position | null>(null);
  const [nearest, setNearest] = useState<Zone | null>(null);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        loadRegions().then(
          (regions) => {
            const near = nearestCity(regions, p);
            if (near && near.km <= NEAR_KM) {
              setPosition(p);
              setNearest(near.zone);
              setStatus('granted');
            } else {
              setPosition(null);
              setNearest(null);
              setStatus('outside');
            }
          },
          () => {
            // Sin saber dónde hay locales, se usa la ubicación y se sigue en
            // la zona actual.
            setPosition(p);
            setNearest(null);
            setStatus('granted');
          },
        );
      },
      (err) => {
        setPosition(null);
        setNearest(null);
        setStatus(
          err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setNearest(null);
    setStatus('idle');
  }, []);

  const value = useMemo(
    () => ({ status, position, nearest, request, clear }),
    [status, position, nearest, request, clear],
  );
  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation(): LocationState {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation fuera de LocationProvider');
  return ctx;
}
