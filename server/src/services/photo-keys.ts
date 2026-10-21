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

const validKeys = (candidates: unknown[]) =>
  candidates.flatMap((key) => {
    const parsed = quarantineKey.safeParse(key);
    return parsed.success ? [parsed.data] : [];
  });

// Las claves de cuarentena de las fotos de las personas de un equipo, leídas
// sin dar por hecho que el contenido es correcto. Solo las ve quien decide
// sobre el equipo (un administrador).
export function storyPhotoKeysIn(payload: Record<string, unknown>): string[] {
  const stories = Array.isArray(payload.stories) ? payload.stories : [];
  return validKeys(
    stories.map((s) => (s as { photoKey?: unknown } | null)?.photoKey),
  );
}

// Las claves de cuarentena de una solicitud (fotos del local y de sus platos, y
// las de las personas del equipo), leídas sin dar por hecho que el contenido es
// correcto.
export function photoKeysIn(payload: Record<string, unknown>): string[] {
  const dishes = Array.isArray(payload.dishes) ? payload.dishes : [];
  const places = Array.isArray(payload.photoKeys) ? payload.photoKeys : [];
  return [
    ...validKeys([
      ...places,
      ...dishes.map((d) => (d as { photoKey?: unknown } | null)?.photoKey),
    ]),
    ...storyPhotoKeysIn(payload),
  ];
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
