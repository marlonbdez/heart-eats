'use client';

import dynamic from 'next/dynamic';

// MapLibre necesita el navegador (WebGL): se carga solo al abrir el mapa.
export const PinPickerLoader = dynamic(
  () => import('./PinPicker').then((m) => m.PinPicker),
  { ssr: false },
);
