'use client';

import { useSyncExternalStore } from 'react';

const noop = () => () => {};

// El último tramo de la dirección (/es/place/<slug>). La web es estática y
// las fichas no se generan al compilar: el servidor reescribe cualquier
// /place/<slug> a la misma página y el local se lee de la dirección del
// navegador. Mientras se compila o se hidrata devuelve null.
export function useSlug(): string | null {
  return useSyncExternalStore(
    noop,
    () => {
      const last = window.location.pathname.split('/').filter(Boolean).pop();
      return last ? decodeURIComponent(last) : null;
    },
    () => null,
  );
}
