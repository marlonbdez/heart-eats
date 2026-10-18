// Configuración del mapa. Ver docs/adr/0002-mapa-maplibre-openfreemap.md.
// Si OpenFreeMap dejara de estar disponible, solo hay que cambiar estas URLs.
const STYLES_BASE = 'https://tiles.openfreemap.org/styles';

export const mapStyles = {
  light: `${STYLES_BASE}/positron`,
  dark: `${STYLES_BASE}/dark`,
} as const;

// Sin zona (todavía no hay locales publicados en ningún sitio): el mundo.
export const worldView = {
  center: [0, 20] as [number, number],
  zoom: 1,
};
