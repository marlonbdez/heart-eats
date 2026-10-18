import { Router } from 'express';
import { ApiError } from '../errors.js';
import { contentTypeOf, publicFilePattern } from '../services/photo-keys.js';
import type { PhotoStore } from '../services/photo-store.js';

const notFound = () => new ApiError(404, 'not_found', 'Foto no encontrada');

// Sirve las fotos aprobadas. El bucket es privado: solo esta ruta lo lee, y
// solo el espacio público (`p/`), nunca la cuarentena. Los nombres son
// aleatorios y no cambian, así que la caché puede ser larga: retirar una foto
// la borra del almacén, y cuando la caché caduque deja de verse.
export function photosRouter({ store }: { store?: PhotoStore }) {
  const router = Router();

  router.get('/photos/:file', async (req, res) => {
    const file = String(req.params.file);
    if (!store || !publicFilePattern.test(file)) throw notFound();
    const photo = await store.get(`p/${file}`);
    if (!photo) throw notFound();
    res
      .set('Content-Type', contentTypeOf(file))
      .set('Cache-Control', 'public, max-age=31536000, immutable')
      .send(photo.body);
  });

  return router;
}
