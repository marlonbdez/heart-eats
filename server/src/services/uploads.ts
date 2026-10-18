import { Upload, type UploadRecord } from '../models/upload.js';
import type { PhotoStore } from './photo-store.js';

const HOUR = 60 * 60_000;
const BATCH = 100;

// Una foto que ninguna solicitud reclama en este plazo se borra. Quien la reclame
// tiene que comprobar su edad con este mismo plazo, para no pelear con esta tarea.
export const UPLOAD_TTL_HOURS = 24;

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
