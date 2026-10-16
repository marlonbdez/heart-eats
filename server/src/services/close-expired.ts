import { Types } from 'mongoose';
import { AuditLog } from '../models/audit-log.js';
import { Suggestion } from '../models/suggestion.js';
import { REPLY_GRACE_DAYS } from './reply-token.js';

const BATCH = 100;

// Cierra como rechazadas las solicitudes cuya petición de información sigue
// sin respuesta una vez pasados el plazo y el margen de cortesía. Borra el
// correo y deja una línea en la auditoría sin actor: lo hizo el sistema.
// Devuelve cuántas cerró. Es seguro lanzarlo a la vez desde varias instancias:
// la actualización es condicional.
export async function closeExpiredRequests(now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - REPLY_GRACE_DAYS * 24 * 60 * 60_000);
  const due = await Suggestion.find({
    status: 'info_requested',
    'infoRequest.deadline': { $lt: limit },
  })
    .sort({ 'infoRequest.deadline': 1 })
    .limit(BATCH)
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  let closed = 0;
  for (const { _id } of due) {
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
        $unset: { contactEmail: 1, 'infoRequest.nonce': 1 },
      },
    );
    if (done.modifiedCount === 0) continue; // respondió o la resolvieron a la vez
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
