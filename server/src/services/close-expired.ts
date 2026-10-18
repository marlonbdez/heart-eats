import { Types } from 'mongoose';
import { AuditLog } from '../models/audit-log.js';
import { Suggestion } from '../models/suggestion.js';
import { photoKeysIn } from './photo-keys.js';
import type { PhotoStore } from './photo-store.js';
import { REPLY_GRACE_DAYS } from './reply-token.js';
import { discardPhotos } from './uploads.js';

const BATCH = 100;

// Cierra como rechazadas las solicitudes cuya petición de información sigue
// sin respuesta una vez pasados el plazo y el margen de cortesía. Borra el
// correo y deja una línea en la auditoría sin actor: lo hizo el sistema.
// Sus fotos en cuarentena se borran. Devuelve cuántas cerró. Es seguro
// lanzarlo a la vez desde varias instancias: la actualización es condicional.
export async function closeExpiredRequests(
  now = new Date(),
  store?: PhotoStore,
): Promise<number> {
  const limit = new Date(now.getTime() - REPLY_GRACE_DAYS * 24 * 60 * 60_000);
  const due = await Suggestion.find({
    status: 'info_requested',
    'infoRequest.deadline': { $lt: limit },
  })
    .sort({ 'infoRequest.deadline': 1 })
    .limit(BATCH)
    .select('_id payload')
    .lean<{ _id: Types.ObjectId; payload: Record<string, unknown> }[]>();

  let closed = 0;
  for (const { _id, payload } of due) {
    const done = await Suggestion.updateOne(
      {
        _id,
        status: 'info_requested',
        'infoRequest.deadline': { $lt: limit },
      },
      {
        $set: {
          status: 'rejected',
          resolution: { reason: 'no_reply', decidedAt: now },
        },
        // Las historias de un equipo solo estaban de paso hasta la decisión.
        $unset: {
          contactEmail: 1,
          'infoRequest.nonce': 1,
          'payload.stories': 1,
        },
      },
    );
    if (done.modifiedCount === 0) continue; // respondió o la resolvieron a la vez
    await discardPhotos(store, photoKeysIn(payload));
    await AuditLog.create({
      entity: 'suggestion',
      entityId: _id,
      action: 'auto_close',
      diff: {
        status: { from: 'info_requested', to: 'rejected' },
        reason: 'no_reply',
      },
    });
    closed++;
  }
  return closed;
}
