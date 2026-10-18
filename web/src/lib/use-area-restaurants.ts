'use client';

import { useCallback, useEffect, useState } from 'react';
import { getRestaurantsIn } from './data';
import type { Bbox, Restaurant } from './types';

// Los locales de lo que se ve en el mapa. Mientras llegan los de una zona nueva
// se siguen enseñando los anteriores; al dejar de mirar el mapa (`bbox` nulo)
// se olvidan. Si la persona mueve el mapa antes de que termine, la petición
// vieja se cancela.
export function useAreaRestaurants(bbox: Bbox | null) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    items: Restaurant[];
    truncated: boolean;
  } | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const west = bbox?.west;
  const south = bbox?.south;
  const east = bbox?.east;
  const north = bbox?.north;
  const key = bbox ? `${west},${south},${east},${north}#${attempt}` : null;

  if (key === null && result !== null) setResult(null);

  useEffect(() => {
    if (
      west === undefined ||
      south === undefined ||
      east === undefined ||
      north === undefined ||
      !key
    ) {
      return;
    }
    const controller = new AbortController();
    getRestaurantsIn({ west, south, east, north }, controller.signal).then(
      (data) => {
        setResult({ key, ...data });
        setFailedKey(null);
      },
      () => {
        if (!controller.signal.aborted) setFailedKey(key);
      },
    );
    return () => controller.abort();
  }, [west, south, east, north, key]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return {
    restaurants: result?.items ?? null,
    truncated: result?.truncated ?? false,
    loading: key !== null && result?.key !== key && failedKey !== key,
    failed: key !== null && failedKey === key,
    retry,
  };
}
