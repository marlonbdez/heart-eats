import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { foodTags } from '../src/catalog.js';
import { Restaurant } from '../src/models/restaurant.js';
import { publicFilePattern, thumbOf } from '../src/services/photo-keys.js';
import {
  demoPhotos,
  publishDemoPhotos,
  removeDemoPhotos,
  withDemoPhotos,
} from '../seed/demo-photos.js';
import { generateStress } from '../seed/stress-data.js';
import { memoryPhotoStore } from './helpers/photo-store.js';

const seedEntries = JSON.parse(
  readFileSync(new URL('../seed/restaurants.json', import.meta.url), 'utf-8'),
) as Record<string, unknown>[];
const fileExists = (name: string) =>
  existsSync(new URL(`../seed/photos/${name}`, import.meta.url));

describe('fotos de los locales de ejemplo', () => {
  it('cada foto tiene su archivo y su miniatura, con un nombre que la API sirve', () => {
    for (const { id } of demoPhotos) {
      const file = `${id}.webp`;
      expect(file).toMatch(publicFilePattern);
      expect(fileExists(file)).toBe(true);
      expect(fileExists(thumbOf(file))).toBe(true);
    }
  });

  it('tienen texto alternativo en los dos idiomas y tipos de comida del catálogo', () => {
    const catalog = foodTags.map((t) => t.key) as string[];
    for (const { alt, tags } of demoPhotos) {
      expect(alt.es.length).toBeGreaterThan(10);
      expect(alt.en.length).toBeGreaterThan(10);
      for (const tag of tags) expect(catalog).toContain(tag);
    }
    // Todos los tipos de comida tienen alguna foto que les pega.
    for (const key of catalog) {
      expect(
        demoPhotos.some((p) => (p.tags as readonly string[]).includes(key)),
      ).toBe(true);
    }
  });

  it('publicar sube foto y miniatura a la parte pública y se puede repetir', async () => {
    const { store, objects } = memoryPhotoStore();
    await publishDemoPhotos(store);
    await publishDemoPhotos(store);
    expect(objects.size).toBe(demoPhotos.length * 2);
    const first = `p/${demoPhotos[0].id}.webp`;
    expect(objects.get(first)?.contentType).toBe('image/webp');
    expect(objects.has(thumbOf(first))).toBe(true);
    expect([...objects.keys()].every((key) => key.startsWith('p/'))).toBe(true);
  });

  it('borrar las quita del almacén, estén o no', async () => {
    const { store, objects } = memoryPhotoStore();
    await removeDemoPhotos(store);
    await publishDemoPhotos(store);
    await removeDemoPhotos(store);
    expect(objects.size).toBe(0);
  });
});

describe('locales de ejemplo con foto', () => {
  it('los 6 locales llevan al menos una foto, y la de cada plato existe', async () => {
    expect(seedEntries).toHaveLength(6);
    for (const entry of seedEntries) {
      const place = withDemoPhotos(entry, true) as Record<string, unknown>;
      const photos = place.photos as { file: string }[];
      expect(photos.length).toBeGreaterThanOrEqual(1);
      for (const { file } of photos) expect(fileExists(file)).toBe(true);
      for (const dish of place.signatureDishes as { photo?: string }[]) {
        if (dish.photo) expect(fileExists(dish.photo)).toBe(true);
      }
      expect(place).not.toHaveProperty('demoPhotos');
      await new Restaurant(place).validate();
    }
  });

  it('sin almacén de fotos se cargan sin ellas', () => {
    for (const entry of seedEntries) {
      const place = withDemoPhotos(entry, false) as Record<string, unknown>;
      expect(place).not.toHaveProperty('photos');
      for (const dish of place.signatureDishes as Record<string, unknown>[]) {
        expect(dish).not.toHaveProperty('photo');
        expect(dish).not.toHaveProperty('demoPhoto');
      }
    }
  });

  it('todos los locales de estrés llevan una foto que pega con su comida', () => {
    const known = new Set(demoPhotos.map((p) => `${p.id}.webp`));
    for (const { restaurant } of generateStress(5)) {
      const photos = restaurant.photos as { file: string; alt: unknown }[];
      expect(photos).toHaveLength(1);
      expect(known.has(photos[0]!.file)).toBe(true);
    }
  });
});
