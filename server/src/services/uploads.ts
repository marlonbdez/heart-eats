import { ApiError } from '../errors.js';
import { Upload, type UploadRecord } from '../models/upload.js';
import { fileOf, thumbOf } from './photo-keys.js';
import type { PhotoStore } from './photo-store.js';

const HOUR = 60 * 60_000;
const BATCH = 100;

// Una foto que ninguna solicitud reclama en este plazo se borra. Quien la reclame
// tiene que comprobar su edad con este mismo plazo, para no pelear con esta tarea.
export const UPLOAD_TTL_HOURS = 24;

// Una foto de cuarentena y su miniatura.
const both = (keys: readonly string[]) =>
  keys.flatMap((key) => [key, thumbOf(key)]);

const logFailure = (what: string, err: unknown) =>
  console.error(`${what}:`, err instanceof Error ? err.message : err);

// Borra del almacén las fotos en cuarentena que nadie ha usado a tiempo.
// Devuelve cuántas borró. Es seguro lanzarlo desde varias instancias.
export async function purgeUnusedUploads(
  store: PhotoStore,
  now = new Date(),
): Promise<number> {
  const limit = new Date(now.getTime() - UPLOAD_TTL_HOURS * HOUR);
  const unused = await Upload.find({
    usedAt: { $exists: false },
    createdAt: { $lt: limit },
  })
    .limit(BATCH)
    .lean<UploadRecord[]>();

  for (const upload of unused) {
    await store.remove(upload.key);
    await Upload.deleteOne({ _id: upload._id, usedAt: { $exists: false } });
  }
  return unused.length;
}

// Una solicitud reclama las fotos que lleva (y sus miniaturas): desde ese
// momento la limpieza no las toca. Cada foto la usa una sola solicitud y tiene
// que ser reciente. Si alguna no vale, no se queda ninguna reclamada.
export async function claimPhotos(keys: readonly string[], now = new Date()) {
  if (new Set(keys).size !== keys.length) {
    throw new ApiError(422, 'photo_repeated', 'Una foto está repetida');
  }
  const limit = new Date(now.getTime() - UPLOAD_TTL_HOURS * HOUR);
  const taken: string[] = [];
  for (const key of both(keys)) {
    const done = await Upload.updateOne(
      { key, usedAt: { $exists: false }, createdAt: { $gte: limit } },
      { $set: { usedAt: now } },
    );
    if (done.modifiedCount === 0) {
      await releasePhotos(taken);
      throw new ApiError(
        422,
        'photo_unavailable',
        'Una de las fotos no existe, ya se usó, no tiene miniatura o caducó: súbela de nuevo',
      );
    }
    taken.push(key);
  }
}

// Devuelve las fotos a «sin usar» (el envío que las reclamaba no llegó a existir).
export async function releasePhotos(keys: readonly string[]) {
  if (keys.length === 0) return;
  await Upload.updateMany(
    { key: { $in: [...keys] } },
    { $unset: { usedAt: 1 } },
  );
}

const photoStoreFailed = (err: unknown) => {
  logFailure('Fallo del almacén de fotos', err);
  return new ApiError(
    502,
    'photo_store_failed',
    'No se pudieron mover las fotos; la solicitud sigue como estaba',
  );
};

// Hace públicas las fotos aprobadas: las copia de `q/` a `p/` (foto y
// miniatura). La copia es idempotente, así que repetirla es seguro.
export async function promotePhotos(
  store: PhotoStore,
  keys: readonly string[],
) {
  try {
    for (const key of both(keys)) await store.copy(key, `p/${fileOf(key)}`);
  } catch (err) {
    await unpublishPhotos(store, keys);
    throw photoStoreFailed(err);
  }
}

// Quita del espacio público las fotos de estas claves (foto y miniatura). No da
// error si falla: se anota y la ficha ya no las enseña.
export async function unpublishPhotos(
  store: PhotoStore,
  keys: readonly string[],
) {
  for (const key of both(keys)) {
    try {
      await store.remove(`p/${fileOf(key)}`);
    } catch (err) {
      logFailure('No se pudo borrar una foto publicada', err);
    }
  }
}

// Borra de la cuarentena las fotos de una solicitud ya resuelta (aprobada,
// rechazada o cerrada). Si el almacén falla, la foto vuelve a «sin usar» y la
// limpieza de cada hora la borra al pasar el plazo.
export async function discardPhotos(
  store: PhotoStore | undefined,
  keys: readonly string[],
) {
  if (!store) return;
  for (const key of both(keys)) {
    try {
      await store.remove(key);
      await Upload.deleteOne({ key });
    } catch (err) {
      logFailure('No se pudo borrar una foto de la cuarentena', err);
      await Upload.updateOne({ key }, { $unset: { usedAt: 1 } }).catch(
        () => undefined,
      );
    }
  }
}
