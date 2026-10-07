// Configuración del mapa. Ver docs/adr/0002-mapa-maplibre-openfreemap.md.
// Si OpenFreeMap dejara de estar disponible, solo hay que cambiar estas URLs.
const STYLES_BASE = 'https://tiles.openfreemap.org/styles';

export const mapStyles = {
  light: `${STYLES_BASE}/positron`,
  dark: `${STYLES_BASE}/dark`,
} as const;

// Madrid, hasta que la persona pulse "Cerca de mí".
export const defaultView = {
  center: [-3.7038, 40.4168] as [number, number],
  zoom: 12,
};

// Zona con locales. Fuera de ella, "Cerca de mí" avisa y se queda en Madrid.
// Al abrir otra ciudad se añade su zona aquí.
export const coverage = {
  center: defaultView.center,
  radiusKm: 60,
};
