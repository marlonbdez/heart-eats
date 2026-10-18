import type { PhotoStore } from '../../src/services/photo-store.js';

// Un almacén de fotos en memoria, para las pruebas.
export function memoryPhotoStore() {
  const objects = new Map<string, { body: Buffer; contentType: string }>();
  const store: PhotoStore = {
    put: (key, body, contentType) => {
      objects.set(key, { body: Buffer.from(body), contentType });
      return Promise.resolve();
    },
    remove: (key) => {
      objects.delete(key);
      return Promise.resolve();
    },
  };
  return { store, objects };
}

// Cabeceras mínimas de cada formato: bastan para saber de qué tipo es.
export const WEBP = Buffer.concat([
  Buffer.from('RIFF'),
  Buffer.from([0x1a, 0, 0, 0]),
  Buffer.from('WEBPVP8 '),
  Buffer.alloc(32),
]);
export const JPEG = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
  Buffer.alloc(32),
]);
export const PNG = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  Buffer.alloc(32),
]);
