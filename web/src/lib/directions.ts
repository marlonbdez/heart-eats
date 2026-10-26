export type MapPlatform = 'android' | 'ios' | 'web';

type Place = { lat: number; lng: number; name: string };

// Cada sistema abre «Cómo llegar» a su manera: Android muestra su selector de
// apps de mapas con `geo:`, iPhone abre Apple Maps y el resto usa el mapa
// abierto en una pestaña nueva.
export function platformFrom(userAgent: string, touchPoints = 0): MapPlatform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  // Los iPad recientes se presentan como un Mac, pero con pantalla táctil.
  if (/macintosh/i.test(userAgent) && touchPoints > 1) return 'ios';
  return 'web';
}

export function directionsUrl(
  { lat, lng, name }: Place,
  platform: MapPlatform,
): string {
  if (platform === 'android') {
    const label = encodeURIComponent(name.replace(/[()]/g, ''));
    return `geo:0,0?q=${lat},${lng}(${label})`;
  }
  if (platform === 'ios') return `https://maps.apple.com/?daddr=${lat},${lng}`;
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
}
