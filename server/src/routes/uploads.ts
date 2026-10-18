import { randomUUID } from 'node:crypto';
import express, { Router, type RequestHandler } from 'express';
import { ApiError } from '../errors.js';
import type { RateLimiter } from '../middleware/rate-limit.js';
import { Upload } from '../models/upload.js';
import { thumbOf } from '../services/photo-keys.js';
import type { PhotoStore } from '../services/photo-store.js';
import { sniffPhoto, type PhotoType } from '../services/photo-type.js';
import { UPLOAD_TTL_HOURS } from '../services/uploads.js';

// La web reduce cada foto a 1600 px y su miniatura a 400 px, y las pasa a WebP
// (docs/02_API_SPEC.md). Con eso nunca se llega a estos topes.
export const MAX_PHOTO_BYTES = 1024 * 1024;
export const MAX_THUMB_BYTES = 100 * 1024;

const EXTENSION: Record<PhotoType, string> = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
};

const uuidPattern = /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;

const unsupported = () =>
  new ApiError(
    415,
    'unsupported_media_type',
    'Envía la foto tal cual, como image/webp o image/jpeg',
  );

// La miniatura se sube después de su foto, con `?thumbOf=<id>`.
const thumbOfParam = (query: unknown) => {
  const { thumbOf: id } = query as { thumbOf?: unknown };
  if (id === undefined) return undefined;
  if (typeof id !== 'string' || !uuidPattern.test(id)) {
    throw new ApiError(422, 'invalid_thumb_of', 'thumbOf no es una foto');
  }
  return id;
};

// Sube una foto a la cuarentena (prefijo `q/`) y, después, su miniatura. Solo
// se hacen públicas cuando Moderación aprueba la solicitud que las usa.
export function uploadsRouter({
  limiter,
  store,
}: {
  limiter: RateLimiter;
  store?: PhotoStore;
}) {
  const router = Router();
  const raw = (limit: number) =>
    express.raw({ type: Object.keys(EXTENSION), limit });
  const photoBody = raw(MAX_PHOTO_BYTES);
  const thumbBody = raw(MAX_THUMB_BYTES);

  // El tope de peso depende de si es una foto o una miniatura.
  const readBody: RequestHandler = (req, res, next) => {
    try {
      (thumbOfParam(req.query) ? thumbBody : photoBody)(req, res, next);
    } catch (err) {
      next(err);
    }
  };

  // Las miniaturas no pasan por el límite: ya contó su foto.
  const quota: RequestHandler = (req, res, next) =>
    thumbOfParam(req.query) === undefined
      ? limiter.check(req, res, next)
      : next();

  router.post(
    '/uploads',
    quota,
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
    readBody,
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

      const photoId = thumbOfParam(req.query);
      let key = `q/${randomUUID()}.${EXTENSION[type]}`;
      if (photoId) {
        // La miniatura cuelga de una foto reciente y sin usar, del mismo
        // formato, y hay una sola por foto. No gasta cupo: la foto ya lo gastó.
        const photoKey = `q/${photoId}.${EXTENSION[type]}`;
        const limit = new Date(Date.now() - UPLOAD_TTL_HOURS * 60 * 60_000);
        const photo = await Upload.exists({
          key: photoKey,
          usedAt: { $exists: false },
          createdAt: { $gte: limit },
        });
        if (!photo) {
          throw new ApiError(
            422,
            'photo_not_found',
            'La foto de esta miniatura no existe, ya se usó o caducó',
          );
        }
        key = thumbOf(photoKey);
      } else {
        // Cuenta toda foto válida, antes de cualquier espera.
        limiter.hit(req);
      }

      // Primero el apunte: si el almacén falla, la limpieza lo recoge.
      try {
        await Upload.create({ key, contentType: type, size: body.length });
      } catch (err) {
        if ((err as { code?: unknown }).code !== 11000) throw err;
        throw new ApiError(
          409,
          'thumb_exists',
          'Esta foto ya tiene su miniatura',
        );
      }
      await store!.put(key, body, type);
      res.status(201).json({ key });
    },
  );

  return router;
}
