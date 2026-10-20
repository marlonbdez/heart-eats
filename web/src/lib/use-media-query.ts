import { useSyncExternalStore } from 'react';

// Si la pantalla cumple una media query. En el servidor (y al hidratar) es
// `false`: las pantallas anchas se completan ya en el navegador.
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
