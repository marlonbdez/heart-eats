'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';
import { isInCoverage, type Position } from '@/lib/geo';

export type LocationStatus =
  'idle' | 'asking' | 'granted' | 'denied' | 'unavailable' | 'outside';

interface LocationState {
  status: LocationStatus;
  position: Position | null;
  request: () => void;
  clear: () => void;
}

const LocationContext = createContext<LocationState | null>(null);

// Ubicación de la persona, solo tras pulsar "Cerca de mí". Vive en memoria
// mientras dura la visita (sobrevive al cambio mapa/lista): no se guarda ni se envía.
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [position, setPosition] = useState<Position | null>(null);

  const request = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('unavailable');
      return;
    }
    setStatus('asking');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (isInCoverage(p)) {
          setPosition(p);
          setStatus('granted');
        } else {
          setPosition(null);
          setStatus('outside');
        }
      },
      (err) => {
        setPosition(null);
        setStatus(
          err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable',
        );
      },
      { timeout: 10000, maximumAge: 60000 },
    );
  }, []);

  const clear = useCallback(() => {
    setPosition(null);
    setStatus('idle');
  }, []);

  const value = useMemo(
    () => ({ status, position, request, clear }),
    [status, position, request, clear],
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
