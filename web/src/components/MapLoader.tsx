'use client';

import dynamic from 'next/dynamic';

// MapLibre necesita el navegador (WebGL): se carga solo en el cliente.
export const MapLoader = dynamic(
  () => import('./MapView').then((m) => m.MapView),
  { ssr: false },
);
