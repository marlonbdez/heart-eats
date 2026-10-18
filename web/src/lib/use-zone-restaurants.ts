'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRestaurants } from './data';
import type { Restaurant, Zone } from './types';

// Los locales de la zona que se mira. Al cambiar de zona se siguen mostrando
// los de la anterior hasta que llegan los nuevos, para que el mapa no parpadee.
export function useZoneRestaurants(zone: Zone | null) {
  const [attempt, setAttempt] = useState(0);
  const [last, setLast] = useState<Restaurant[] | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);

  const country = zone?.country;
  const city = zone?.city;
  const key = country && city ? `${country}/${city}#${attempt}` : null;

  useEffect(() => {
    if (!country || !city || !key) return;
    let live = true;
    getRestaurants({ country, city }).then(
      (data) => {
        if (!live) return;
        setLast(data);
        setLoadedKey(key);
        setFailedKey(null);
      },
      () => live && setFailedKey(key),
    );
    return () => {
      live = false;
    };
  }, [country, city, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return {
    // Sin zona (no hay locales en ningún sitio) no hay nada que cargar.
    restaurants: key === null ? [] : last,
    loading: key !== null && loadedKey !== key && failedKey !== key,
    failed: key !== null && failedKey === key,
    retry,
  };
}
