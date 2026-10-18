'use client';

import { createContext, useContext } from 'react';

// Desde dónde se abre una ficha: el mapa o la lista, con su búsqueda. Las
// fichas se cargan con una página nueva, así que esto viaja en la dirección
// (/place/<slug>?from=list&q=…) y no se guarda nada en el dispositivo.
export type Discovery = { view: 'map' | 'list'; query: Record<string, string> };

const DiscoveryContext = createContext<Discovery>({ view: 'map', query: {} });

export const DiscoveryProvider = DiscoveryContext.Provider;
export const useDiscovery = () => useContext(DiscoveryContext);

// Los parámetros que lleva la dirección de la ficha.
export function placeQuery({ view, query }: Discovery) {
  return { ...query, ...(view === 'list' ? { from: 'list' } : {}) };
}

// De los parámetros de la ficha de vuelta al mapa o la lista de origen.
export function discoveryFromSearch(search: string): Discovery {
  const params = new URLSearchParams(search);
  const query: Record<string, string> = {};
  for (const key of ['q', 'food', 'country', 'city']) {
    const value = params.get(key);
    if (value) query[key] = value;
  }
  return { view: params.get('from') === 'list' ? 'list' : 'map', query };
}
