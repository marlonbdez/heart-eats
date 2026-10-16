import { Types } from 'mongoose';
import { AuditLog } from '../models/audit-log.js';
import { Suggestion } from '../models/suggestion.js';
import { Team, type TeamRecord } from '../models/team.js';

const DAY = 24 * 60 * 60_000;

// ❓ Plazos provisionales hasta la revisión legal (docs/08_PRIVACIDAD_LEGAL.md).
// Lo retirado se oculta al instante; el contenido se borra pasado este plazo.
// La política dice 7 días: aquí hay más margen, sin pasar del mes que da el RGPD.
export const REVOKED_STORY_DAYS = 21;
// Tope del correo de una solicitud que sigue sin resolverse (≈ 9 meses).
export const CONTACT_EMAIL_DAYS = 270;

const BATCH = 100;

// Borra el contenido (nombre, puesto, texto y foto) de las historias retiradas
// hace más del plazo. Conserva el hueco, el consentimiento y las fechas, y deja
// una línea de auditoría sin actor y sin contenido: solo qué posiciones.
// Devuelve cuántas historias vació. Es seguro lanzarlo desde varias instancias:
// la actualización es condicional.
export async function purgeRevokedStories(now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - REVOKED_STORY_DAYS * DAY);
  const pending = {
    revokedAt: { $lt: limit },
    purgedAt: { $exists: false },
  };
  const teams = await Team.find({ stories: { $elemMatch: pending } })
    .limit(BATCH)
    .select('_id stories')
    .lean<Pick<TeamRecord, '_id' | 'stories'>[]>();

  let purged = 0;
  for (const team of teams) {
    const indexes = (team.stories ?? []).flatMap((s, i) =>
      s.revokedAt && s.revokedAt < limit && !s.purgedAt ? [i] : [],
    );
    const done = await Team.updateOne(
      { _id: team._id, stories: { $elemMatch: pending } },
      {
        $set: { 'stories.$[s].purgedAt': now },
        $unset: {
          'stories.$[s].displayName': 1,
          'stories.$[s].role': 1,
          'stories.$[s].storyText': 1,
          'stories.$[s].photoUrl': 1,
        },
      },
      {
        arrayFilters: [
          { 's.revokedAt': { $lt: limit }, 's.purgedAt': { $exists: false } },
        ],
      },
    );
    if (done.modifiedCount === 0) continue; // otra instancia se adelantó
    await AuditLog.create({
      entity: 'team',
      entityId: team._id,
      action: 'purge_stories',
      diff: { stories: indexes },
    });
    purged += indexes.length;
  }
  return purged;
}

// Borra el correo de las solicitudes que lo conservan pasado el tope, sea cual
// sea su estado. Devuelve cuántas. Deja una línea de auditoría sin actor y sin
// el correo.
export async function purgeOldContactEmails(now = new Date()): Promise<number> {
  const limit = new Date(now.getTime() - CONTACT_EMAIL_DAYS * DAY);
  const old = await Suggestion.find({
    contactEmail: { $exists: true },
    createdAt: { $lt: limit },
  })
    .sort({ createdAt: 1 })
    .limit(BATCH)
    .select('_id')
    .lean<{ _id: Types.ObjectId }[]>();

  let purged = 0;
  for (const { _id } of old) {
    const done = await Suggestion.updateOne(
      { _id, contactEmail: { $exists: true }, createdAt: { $lt: limit } },
      { $unset: { contactEmail: 1 } },
    );
    if (done.modifiedCount === 0) continue;
    await AuditLog.create({
      entity: 'suggestion',
      entityId: _id,
      action: 'purge_email',
      diff: { contactEmail: { removed: true } },
    });
    purged++;
  }
  return purged;
}
