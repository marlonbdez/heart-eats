import { Types } from 'mongoose';
import { AuditLog } from '../models/audit-log.js';
import { Restaurant, type RestaurantRecord } from '../models/restaurant.js';
import { Suggestion } from '../models/suggestion.js';
import { Team, type TeamRecord } from '../models/team.js';
import { thumbOf } from './photo-keys.js';
import type { PhotoStore } from './photo-store.js';

const DAY = 24 * 60 * 60_000;

// ❓ Plazos provisionales hasta la revisión legal (docs/08_PRIVACIDAD_LEGAL.md).
// Lo retirado se oculta al instante; el contenido se borra pasado este plazo.
// 30 días: el plazo que damos a quien retira algo. Es el límite de «un mes» del
// RGPD si el mes tiene 30 días o más (❓ revisión legal: febrero tiene 28).
export const REVOKED_STORY_DAYS = 30;
// Una ficha retirada a petición del negocio se borra del todo (con su equipo y
// sus fotos) pasado este plazo, el mismo que las historias.
export const RETIRED_LISTING_DAYS = 30;
// Tope del correo de una solicitud que sigue sin resolverse (≈ 9 meses).
export const CONTACT_EMAIL_DAYS = 270;

const BATCH = 100;

// Las dos formas de una foto publicada (`p/<archivo>` y su miniatura).
const publicObjects = (file: string) => [`p/${file}`, `p/${thumbOf(file)}`];

// Borra el contenido (nombre, puesto, texto y foto) de las historias retiradas
// hace más del plazo. Conserva el hueco, el consentimiento y las fechas, y deja
// una línea de auditoría sin actor y sin contenido: solo qué posiciones.
// Devuelve cuántas historias vació. Es seguro lanzarlo desde varias instancias:
// la actualización es condicional. La foto se borra del almacén antes que el
// resto, y se puede borrar dos veces sin problema: si algo falla, la historia
// sigue ahí y se reintenta en la próxima pasada. Sin almacén no se vacía un
// equipo con fotos que borrar, para no dejarlas huérfanas.
export async function purgeRevokedStories(
  now = new Date(),
  store?: PhotoStore,
): Promise<number> {
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
    const due = (team.stories ?? []).flatMap((s, i) =>
      s.revokedAt && s.revokedAt < limit && !s.purgedAt ? [{ i, s }] : [],
    );
    const indexes = due.map(({ i }) => i);
    const objects = due.flatMap(({ s }) =>
      s.photo ? publicObjects(s.photo) : [],
    );
    if (objects.length > 0 && !store) continue;
    try {
      for (const key of objects) await store?.remove(key);
    } catch (err) {
      console.error(
        'No se pudo borrar la foto de una historia retirada:',
        err instanceof Error ? err.message : err,
      );
      continue;
    }
    const done = await Team.updateOne(
      { _id: team._id, stories: { $elemMatch: pending } },
      {
        $set: { 'stories.$[s].purgedAt': now },
        $unset: {
          'stories.$[s].displayName': 1,
          'stories.$[s].role': 1,
          'stories.$[s].storyText': 1,
          'stories.$[s].photoUrl': 1,
          'stories.$[s].photo': 1,
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

// Los archivos de fotos de una ficha: las del local, las de sus platos y las de
// las personas de su equipo, cada una con su miniatura, tal como viven en `p/`.
function photoObjects(
  place: Pick<RestaurantRecord, 'photos' | 'signatureDishes'>,
  team?: Pick<TeamRecord, 'stories'> | null,
) {
  const files = [
    ...(place.photos ?? []).map((p) => p.file),
    ...(place.signatureDishes ?? []).flatMap((d) => (d.photo ? [d.photo] : [])),
    ...(team?.stories ?? []).flatMap((s) => (s.photo ? [s.photo] : [])),
  ];
  return [...new Set(files)].flatMap(publicObjects);
}

// Borra del todo las fichas retiradas a petición del negocio hace más del plazo:
// las fotos del almacén, el equipo y la ficha. Las que solo se archivaron por
// cierre del local no se tocan. Devuelve cuántas borró. Deja una línea de
// auditoría sin actor y sin contenido (solo si había equipo y cuántas fotos).
// Primero van las fotos, que se pueden borrar dos veces sin problema: si algo
// falla, la ficha sigue ahí y se reintenta en la próxima pasada. Sin almacén no
// se borra una ficha con fotos, para no dejarlas huérfanas.
export async function purgeRetiredListings(
  now = new Date(),
  store?: PhotoStore,
): Promise<number> {
  const limit = new Date(now.getTime() - RETIRED_LISTING_DAYS * DAY);
  const due = await Restaurant.find({
    status: 'archived',
    retiredAt: { $lt: limit },
  })
    .limit(BATCH)
    .select('_id photos signatureDishes')
    .lean<Pick<RestaurantRecord, '_id' | 'photos' | 'signatureDishes'>[]>();

  let purged = 0;
  for (const place of due) {
    const team = await Team.findOne({ restaurantId: place._id })
      .select('stories.photo')
      .lean<Pick<TeamRecord, 'stories'>>();
    const objects = photoObjects(place, team);
    if (objects.length > 0 && !store) continue;
    try {
      for (const key of objects) await store?.remove(key);
      const team = await Team.deleteOne({ restaurantId: place._id });
      const done = await Restaurant.deleteOne({
        _id: place._id,
        status: 'archived',
        retiredAt: { $lt: limit },
      });
      if (done.deletedCount === 0) continue; // otra instancia se adelantó
      await AuditLog.create({
        entity: 'restaurant',
        entityId: place._id,
        action: 'purge_listing',
        diff: { team: team.deletedCount > 0, photos: objects.length / 2 },
      });
      purged++;
    } catch (err) {
      console.error(
        'No se pudo borrar una ficha retirada:',
        err instanceof Error ? err.message : err,
      );
    }
  }
  return purged;
}
