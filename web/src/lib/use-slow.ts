'use client';

import { useEffect, useState } from 'react';

export const SLOW_MS = 4000;

// Pasa a `true` cuando algo lleva demasiado esperando (`active` sin cortes
// durante `ms`) y vuelve a `false` en cuanto termina.
export function useSlow(active: boolean, ms = SLOW_MS): boolean {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setSlow(true), ms);
    return () => {
      clearTimeout(timer);
      setSlow(false);
    };
  }, [active, ms]);
  return active && slow;
}
