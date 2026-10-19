import { apiGet, sessionDelete, sessionPost, sessionPut } from '../api';
import type { PhotoBlobs, Restaurant } from '../types';
import { uploadPhoto } from './uploads';

// Fotos de un local ya publicado (solo moderación; docs/02_API_SPEC.md,
// `/restaurants/:slug/photos`). Lo que sube Moderación se publica directo.

// Texto alternativo por idioma: al menos uno, o nada.
export type PhotoAlt = { es?: string; en?: string };

const SEARCH_LIMIT = 20;
export const MAX_GALLERY_PHOTOS = 12;

// Buscar un local publicado por su nombre dentro de un país.
export async function searchPlaces(
  country: string,
  q: string,
): Promise<Restaurant[]> {
  const res = await apiGet<{ items: Restaurant[] }>('/restaurants', {
    country,
    q,
    limit: SEARCH_LIMIT,
  });
  return res.items;
}

// El archivo de una foto publicada, que es lo que nombra la API
// (`<id>.webp`), sale al final de su dirección.
export const photoFile = (url: string) => url.slice(url.lastIndexOf('/') + 1);

export async function addPlacePhoto(
  slug: string,
  photo: PhotoBlobs,
  { alt, cover }: { alt?: PhotoAlt; cover: boolean },
) {
  const photoKey = await uploadPhoto(photo);
  await sessionPost(`/restaurants/${encodeURIComponent(slug)}/photos`, {
    photoKey,
    ...(alt && { alt }),
    cover,
  });
}

const photoPath = (slug: string, url: string) =>
  `/restaurants/${encodeURIComponent(slug)}/photos/${photoFile(url)}`;

// `alt: null` borra el texto.
export const setPhotoAlt = (slug: string, url: string, alt: PhotoAlt | null) =>
  sessionPut(photoPath(slug, url), { alt });

export const setPhotoCover = (slug: string, url: string) =>
  sessionPut(photoPath(slug, url), { cover: true });

export const removePlacePhoto = (slug: string, url: string) =>
  sessionDelete(photoPath(slug, url));
