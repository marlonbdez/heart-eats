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
