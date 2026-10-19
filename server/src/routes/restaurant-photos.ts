import { Router } from 'express';
import { Types } from 'mongoose';
import { z } from 'zod';
import { ApiError } from '../errors.js';
import { authOf, requireSession, scopeOf } from '../middleware/session.js';
import { AuditLog } from '../models/audit-log.js';
import {
  MAX_PHOTOS,
  Restaurant,
  type RestaurantRecord,
} from '../models/restaurant.js';
import type { ModerationScope } from '../models/user.js';
import { text } from '../services/input-fields.js';
import {
  fileOf,
  photoUrls,
  publicFilePattern,
  quarantineKey,
  thumbOf,
} from '../services/photo-keys.js';
import type { PhotoStore } from '../services/photo-store.js';
import { slugPattern } from '../services/restaurant-query.js';
import { restaurantScopeFilter } from '../services/suggestion-query.js';
import {
  claimPhotos,
  discardPhotos,
  promotePhotos,
  releasePhotos,
  unpublishPhotos,
} from '../services/uploads.js';
import { parseOrThrow } from '../validation.js';

// Texto alternativo por idioma, para quien no ve la foto.
const alt = z
  .object({ es: text(160).optional(), en: text(160).optional() })
  .refine((value) => Object.values(value).some(Boolean), {
    error: 'escribe el texto en algún idioma',
  });

const addSchema = z.object({
  photoKey: quarantineKey,
  alt: alt.optional(),
  // La foto pasa a ser la portada.
  cover: z.boolean().default(false),
});

// `alt: null` borra el texto.
const changeSchema = z
  .object({ alt: alt.nullable().optional(), cover: z.literal(true).optional() })
  .refine((value) => value.alt !== undefined || value.cover, {
    error: 'indica qué cambia (alt o cover)',
  });

const notFound = () => new ApiError(404, 'not_found', 'Local no encontrado');
const photoNotFound = () =>
  new ApiError(404, 'photo_not_found', 'Esa foto no está en la ficha');

// Un local publicado dentro del ámbito de quien modera. Fuera de él se responde
// igual que si no existiera.
async function findInScope(slug: string, scope: readonly ModerationScope[]) {
  const place =
    slugPattern.test(slug) && scope.length > 0
      ? await Restaurant.findOne({
          $and: [{ slug, status: 'published' }, restaurantScopeFilter(scope)],
        }).lean<RestaurantRecord>()
      : null;
  if (!place) throw notFound();
  return place;
}

// Fotos de un local ya publicado, por Moderación. Lo que sube Moderación se
// publica directo, sin segunda revisión; queda en la auditoría (con la persona,
// nunca con el contenido).
export function restaurantPhotosRouter({
  allowedOrigins,
  store,
  apiUrl,
}: {
  allowedOrigins: readonly string[];
  store?: PhotoStore;
  apiUrl?: string;
}) {
  const router = Router();
  const auth = requireSession(allowedOrigins);
  const urls = photoUrls(apiUrl);

  const audit = (
    place: RestaurantRecord,
    userId: string,
    action: string,
    diff: Record<string, unknown>,
  ) =>
    AuditLog.create({
      entity: 'restaurant',
      entityId: place._id,
      action,
      actorId: new Types.ObjectId(userId),
      diff,
    });

  // Añadir una foto ya subida con `POST /uploads` (y su miniatura).
  router.post('/restaurants/:slug/photos', ...auth, async (req, res) => {
    const user = authOf(res);
    const place = await findInScope(String(req.params.slug), scopeOf(user));
    const input = parseOrThrow(addSchema, req.body);
    if (!store) {
      throw new ApiError(
        503,
        'uploads_unavailable',
        'Por ahora no se pueden publicar fotos',
      );
    }

    const key = input.photoKey;
    const file = fileOf(key);
    await claimPhotos([key]);
    await promotePhotos(store, [key]).catch(async (err: unknown) => {
      await releasePhotos([key, thumbOf(key)]);
      throw err;
    });

    // Con sitio: la condición cuenta las fotos a la vez que las añade.
    const entry = { file, ...(input.alt ? { alt: input.alt } : {}) };
    const added = await Restaurant.updateOne(
      {
        _id: place._id,
        status: 'published',
        [`photos.${MAX_PHOTOS - 1}`]: { $exists: false },
      },
      {
        $push: {
          photos: { $each: [entry], ...(input.cover ? { $position: 0 } : {}) },
        },
      },
    ).catch(async (err: unknown) => {
      await unpublishPhotos(store, [key]);
      await releasePhotos([key, thumbOf(key)]);
      throw err;
    });
    if (added.modifiedCount === 0) {
      await unpublishPhotos(store, [key]);
      await releasePhotos([key, thumbOf(key)]);
      throw new ApiError(
        422,
        'too_many_photos',
        `La ficha ya tiene ${MAX_PHOTOS} fotos: retira alguna antes`,
      );
    }

    await discardPhotos(store, [key]);
    await audit(place, user.id, 'add_photo', {
      photos: { added: 1 },
      cover: input.cover,
    });
    res.status(201).json({
      url: urls.photo(file),
      thumbUrl: urls.thumb(file),
      ...(input.alt ? { alt: input.alt } : {}),
    });
  });

  // Cambiar el texto alternativo de una foto o ponerla de portada.
  router.put('/restaurants/:slug/photos/:file', ...auth, async (req, res) => {
    const user = authOf(res);
    const place = await findInScope(String(req.params.slug), scopeOf(user));
    const file = String(req.params.file);
    const change = parseOrThrow(changeSchema, req.body);
    const current = place.photos ?? [];
    const index = current.findIndex((p) => p.file === file);
    if (index === -1) throw photoNotFound();

    const next = current.map((p) => ({ ...p }));
    const target = next[index]!;
    if (change.alt === null) delete target.alt;
    else if (change.alt) target.alt = change.alt;
    if (change.cover) next.unshift(next.splice(index, 1)[0]!);

    const done = await Restaurant.updateOne(
      { _id: place._id, status: 'published', 'photos.file': file },
      { $set: { photos: next } },
    );
    if (done.modifiedCount === 0) throw photoNotFound();
    await audit(place, user.id, 'update_photo', {
      ...(change.alt !== undefined ? { alt: { changed: true } } : {}),
      ...(change.cover ? { cover: true } : {}),
    });
    res.status(204).end();
  });

  // Retirar una foto: deja de verse al momento y se borra del almacén. Vale
  // para una foto de la galería o para la de un plato.
  router.delete(
    '/restaurants/:slug/photos/:file',
    ...auth,
    async (req, res) => {
      const user = authOf(res);
      const place = await findInScope(String(req.params.slug), scopeOf(user));
      const file = String(req.params.file);
      if (!publicFilePattern.test(file) || file.includes('-thumb')) {
        throw photoNotFound();
      }

      const gallery = place.photos?.some((p) => p.file === file);
      const dish = place.signatureDishes.findIndex((d) => d.photo === file);
      if (!gallery && dish === -1) throw photoNotFound();

      // Primero el almacén: si falla, nada cambia y se puede reintentar. Borrar
      // lo que ya no está no da error.
      if (store) {
        await store.remove(`p/${file}`);
        await store.remove(`p/${thumbOf(file)}`);
      }
      const done = gallery
        ? await Restaurant.updateOne(
            { _id: place._id, 'photos.file': file },
            { $pull: { photos: { file } } },
          )
        : await Restaurant.updateOne(
            { _id: place._id, [`signatureDishes.${dish}.photo`]: file },
            { $unset: { [`signatureDishes.${dish}.photo`]: 1 } },
          );
      if (done.modifiedCount === 0) throw photoNotFound();
      await audit(place, user.id, 'remove_photo', {
        photos: { removed: 1 },
        from: gallery ? 'gallery' : 'dish',
      });
      res.status(204).end();
    },
  );

  return router;
}
