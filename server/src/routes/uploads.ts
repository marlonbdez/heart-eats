import { randomUUID } from 'node:crypto';
import express, { Router } from 'express';
import { ApiError } from '../errors.js';
import type { RateLimiter } from '../middleware/rate-limit.js';
import { Upload } from '../models/upload.js';
import type { PhotoStore } from '../services/photo-store.js';
import { sniffPhoto, type PhotoType } from '../services/photo-type.js';

// La web ya reduce las fotos a 1200 px y las pasa a WebP (docs/02_API_SPEC.md).
export const MAX_PHOTO_BYTES = 1024 * 1024;

const EXTENSION: Record<PhotoType, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

const unsupported = () =>
  new ApiError(
    415,
    'unsupported_media_type',
    'Envía la foto tal cual, como image/webp o image/jpeg',
  );

// Sube una foto a la cuarentena (prefijo `q/`). Solo se hace pública cuando
// Moderación aprueba la solicitud que la usa.
export function uploadsRouter({
  limiter,
  store,
}: {
  limiter: RateLimiter;
  store?: PhotoStore;
}) {
  const router = Router();

  router.post(
    '/uploads',
    limiter.check,
    (_req, _res, next) => {
      // Antes de leer el cuerpo: sin almacén no hay por qué recibirlo.
      next(
        store
          ? undefined
          : new ApiError(
              503,
              'uploads_unavailable',
              'Por ahora no se pueden subir fotos',
            ),
      );
    },
    express.raw({ type: Object.keys(EXTENSION), limit: MAX_PHOTO_BYTES }),
    async (req, res) => {
      const body: unknown = req.body;
      if (!Buffer.isBuffer(body) || body.length === 0) throw unsupported();

      // El navegador dice qué es; los bytes dicen qué es de verdad.
      const declared = req.header('content-type')?.split(';')[0]?.trim();
      const type = sniffPhoto(body);
      if (!type || type !== declared) {
        throw new ApiError(
          422,
          'invalid_image',
          'El archivo no es una foto WebP o JPEG válida',
        );
      }

      // Cuenta toda foto válida, antes de cualquier espera.
      limiter.hit(req);
      const key = `q/${randomUUID()}.${EXTENSION[type]}`;
      // Primero el apunte: si el almacén falla, la limpieza lo recoge.
      await Upload.create({ key, contentType: type, size: body.length });
      await store!.put(key, body, type);
      res.status(201).json({ key });
    },
  );

  return router;
}
