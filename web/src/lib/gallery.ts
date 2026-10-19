import { routing } from '@/i18n/routing';
import type { Restaurant } from './types';

export interface GalleryPhoto {
  url: string;
  thumbUrl: string;
  // Sin texto alternativo escrito, la pantalla pone uno genérico.
  alt?: string;
}

// Las fotos que se enseñan de un local: las suyas y, si no tiene, las de sus
// platos (con el nombre del plato como texto alternativo).
export function galleryOf(r: Restaurant, locale: string): GalleryPhoto[] {
  if (r.photos?.length) {
    return r.photos.map(({ url, thumbUrl, alt }) => ({
      url,
      thumbUrl,
      alt: alt?.[locale] ?? alt?.[routing.defaultLocale],
    }));
  }
  return r.signatureDishes.flatMap((d) =>
    d.photoUrl
      ? [{ url: d.photoUrl, thumbUrl: d.thumbUrl ?? d.photoUrl, alt: d.name }]
      : [],
  );
}

// La foto pequeña de una tarjeta: la portada del local o, si no hay, la de su
// primer plato con foto.
export function coverThumb(r: Restaurant): { src: string; alt: string } | null {
  const cover = r.photos?.[0];
  if (cover) return { src: cover.thumbUrl, alt: '' };
  const dish = r.signatureDishes.find((d) => d.photoUrl);
  return dish ? { src: dish.thumbUrl ?? dish.photoUrl!, alt: dish.name } : null;
}
