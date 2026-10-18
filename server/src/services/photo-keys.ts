import { z } from 'zod';

// Cada foto son dos objetos con el mismo nombre: la foto y su miniatura
// (`<id>.webp` y `<id>-thumb.webp`). En cuarentena cuelgan de `q/`; al aprobarse
// pasan a `p/`, que es lo único que sirve `GET /photos`.
const ID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const EXT = '(?:webp|jpg)';

// La clave que devuelve `POST /uploads`: `q/<id>.webp`.
export const quarantineKey = z.string().regex(new RegExp(`^q/${ID}\\.${EXT}$`));

// El nombre de un archivo publicado, foto o miniatura.
export const publicFilePattern = new RegExp(`^${ID}(?:-thumb)?\\.${EXT}$`);

// `x.webp` → `x-thumb.webp` (vale igual con el prefijo `q/`).
export const thumbOf = (name: string) =>
  name.replace(/\.(webp|jpg)$/, '-thumb.$1');

// `q/x.webp` → `x.webp`: lo que se guarda en la ficha una vez publicada.
export const fileOf = (key: string) => key.replace(/^q\//, '');

export const contentTypeOf = (file: string) =>
  file.endsWith('.webp') ? 'image/webp' : 'image/jpeg';

// Las claves de cuarentena de una propuesta (fotos del local y de sus platos),
// leídas sin dar por hecho que el contenido es correcto.
export function photoKeysIn(payload: Record<string, unknown>): string[] {
  const dishes = Array.isArray(payload.dishes) ? payload.dishes : [];
  const places = Array.isArray(payload.photoKeys) ? payload.photoKeys : [];
  const candidates: unknown[] = [
    ...places,
    ...dishes.map((d) => (d as { photoKey?: unknown } | null)?.photoKey),
  ];
  return candidates.flatMap((key) => {
    const parsed = quarantineKey.safeParse(key);
    return parsed.success ? [parsed.data] : [];
  });
}

// Direcciones públicas de una foto y de su miniatura. `base` es el origen de la
// API (`API_URL`); sin él salen como ruta, útil en las pruebas.
export function photoUrls(base = '') {
  const at = (file: string) => `${base}/api/v1/photos/${file}`;
  return {
    photo: at,
    thumb: (file: string) => at(thumbOf(file)),
  };
}
