import { Types } from 'mongoose';
import { ApiError, requestChanged } from '../errors.js';
import type { authOf } from '../middleware/session.js';
import { AuditLog } from '../models/audit-log.js';
import { Restaurant, type RestaurantRecord } from '../models/restaurant.js';
import { Suggestion, type SuggestionRecord } from '../models/suggestion.js';
import { Team, type TeamRecord } from '../models/team.js';
import {
  correctionApprovalSchema,
  removalApprovalSchema,
  teamApprovalSchema,
  type CorrectionApproval,
} from '../services/decision-input.js';
import { cityNamesFor } from '../services/city-names.js';
import type { Geocoder } from '../services/geocoder.js';
import type { TeamInput } from '../services/team-input.js';
import { parseOrThrow } from '../validation.js';

type User = ReturnType<typeof authOf>;

// Lo que queda en el registro de auditoría sobre la ficha o el equipo.
interface AuditEntry {
  entity: 'restaurant' | 'team';
  entityId: Types.ObjectId;
  action: string;
  diff: Record<string, unknown>;
}

const unavailable = () =>
  new ApiError(
    409,
    'target_unavailable',
    'La ficha ya no existe o ya no está publicada',
  );

const storyNotFound = () =>
  new ApiError(
    422,
    'story_not_found',
    'Esa historia no existe o ya está retirada',
  );

// Copia sin referencias a documentos de Mongoose, para guardar el valor de antes.
const plain = (value: unknown) =>
  value === undefined
    ? undefined
    : (JSON.parse(JSON.stringify(value)) as unknown);

// Aprueba la solicitud y aplica el cambio. Primero se reclama la solicitud
// (solo una de las decisiones simultáneas lo consigue) y después se cambia la
// ficha; si el cambio falla, la solicitud vuelve a como estaba. Como al aprobar
// un local nuevo, el correo se borra y el enlace de respuesta, si lo había,
// deja de valer.
async function approveAndApply(
  record: SuggestionRecord,
  user: User,
  now: Date,
  restaurantId: Types.ObjectId,
  apply: () => Promise<AuditEntry>,
) {
  const updated = await Suggestion.findOneAndUpdate(
    { _id: record._id, status: { $in: ['pending', 'info_requested'] } },
    {
      $set: {
        status: 'approved',
        resolution: { restaurantId, decidedBy: user.id, decidedAt: now },
      },
      $unset: { contactEmail: 1, 'infoRequest.nonce': 1 },
    },
    { returnDocument: 'after' },
  ).lean<SuggestionRecord>();
  if (!updated) throw requestChanged();

  let audit: AuditEntry;
  try {
    audit = await apply();
  } catch (err) {
    await Suggestion.updateOne(
      { _id: record._id, status: 'approved' },
      {
        $set: {
          status: record.status,
          ...(record.contactEmail ? { contactEmail: record.contactEmail } : {}),
          ...(record.infoRequest?.nonce
            ? { 'infoRequest.nonce': record.infoRequest.nonce }
            : {}),
        },
        $unset: { resolution: 1 },
      },
    );
    throw err;
  }

  const actorId = new Types.ObjectId(user.id);
  await AuditLog.create([
    {
      entity: 'suggestion',
      entityId: record._id,
      action: 'approve',
      actorId,
      diff: {
        status: { from: record.status, to: 'approved' },
        restaurantId: String(restaurantId),
      },
    },
    {
      ...audit,
      actorId,
      diff: { ...audit.diff, suggestionId: String(record._id) },
    },
  ]);
  return updated;
}

function targetOf(record: SuggestionRecord) {
  if (!record.targetRestaurantId) throw unavailable();
  return record.targetRestaurantId;
}

// Los campos de la ficha que cambia una corrección, con su valor nuevo.
function correctionEntries(
  changes: CorrectionApproval,
  pin: { lat: number; lng: number } | undefined,
) {
  const entries: [string, unknown][] = [];
  if (changes.name) entries.push(['name', changes.name]);
  for (const [field, value] of Object.entries(changes.address ?? {})) {
    if (value !== undefined) entries.push([`address.${field}`, value]);
  }
  if (pin) {
    entries.push([
      'location',
      { type: 'Point', coordinates: [pin.lng, pin.lat] },
    ]);
  }
  if (changes.openingHours)
    entries.push(['openingHours', changes.openingHours]);
  if (changes.closed) entries.push(['status', 'archived']);
  return entries;
}

// Un cambio de dirección sin pin nuevo deja el pin donde no toca: se
// geocodifica la dirección ya corregida o, si no se puede, se pide a mano.
async function pinFor(
  changes: CorrectionApproval,
  current: RestaurantRecord,
  geocoder: Geocoder | undefined,
) {
  if (changes.location) return changes.location;
  if (!changes.address) return undefined;

  const address = { ...current.address, ...changes.address };
  let result = null;
  try {
    result = await geocoder?.geocode({
      street: address.street,
      postalCode: address.postalCode,
      city: address.city,
    });
  } catch (err) {
    console.error(
      'No se pudo geocodificar:',
      err instanceof Error ? err.message : err,
    );
  }
  if (!result) {
    throw new ApiError(
      422,
      'geocoding_required',
      'No se pudo geocodificar la nueva dirección; coloca el pin a mano (location)',
    );
  }
  return result;
}

// Pone valores en una ficha publicada con `save()`, que recalcula la ciudad y el
// texto de búsqueda. Devuelve los valores de antes.
async function setOnPublished(
  id: Types.ObjectId,
  entries: readonly (readonly [path: string, value: unknown])[],
) {
  const doc = await Restaurant.findOne({ _id: id, status: 'published' });
  if (!doc) throw unavailable();
  const before = entries.map(([path]) => plain(doc.get(path)));
  for (const [path, value] of entries) doc.set(path, value);
  await doc.save();
  return before;
}

// Aprobar una corrección: aplica a la ficha lo que Moderación ha comprobado.
export async function approveCorrection(
  record: SuggestionRecord,
  user: User,
  body: unknown,
  now: Date,
  geocoder: Geocoder | undefined,
) {
  const changes = parseOrThrow(correctionApprovalSchema, body);
  const id = targetOf(record);
  const current = await Restaurant.findOne({
    _id: id,
    status: 'published',
  }).lean<RestaurantRecord>();
  if (!current) throw unavailable();

  const entries = correctionEntries(
    changes,
    await pinFor(changes, current, geocoder),
  );
  // Si cambia la ciudad, sus nombres en cada idioma dejan de valer.
  if (changes.address?.city) {
    const names = await cityNamesFor(
      geocoder,
      changes.address.city,
      current.address.country,
    );
    entries.push(['address.cityNames', names ?? null]);
  }
  return approveAndApply(record, user, now, id, async () => {
    const before = await setOnPublished(id, entries);
    return {
      entity: 'restaurant',
      entityId: id,
      action: 'update',
      diff: Object.fromEntries(
        entries.map(([path, to], i) => [path, { from: before[i], to }]),
      ),
    };
  });
}

// Aprobar una retirada: lo pedido deja de verse al momento. El borrado
// definitivo llega con el plazo de la política (docs/08_PRIVACIDAD_LEGAL.md).
export async function approveRemoval(
  record: SuggestionRecord,
  user: User,
  body: unknown,
  now: Date,
) {
  const { storyIndex } = parseOrThrow(removalApprovalSchema, body);
  const id = targetOf(record);
  const what = record.payload.what;

  if (what === 'listing') {
    return approveAndApply(record, user, now, id, async () => {
      await setOnPublished(id, [['status', 'archived']]);
      return {
        entity: 'restaurant',
        entityId: id,
        action: 'archive',
        diff: { status: { from: 'published', to: 'archived' } },
      };
    });
  }

  if (what === 'story') {
    if (storyIndex === undefined) {
      throw new ApiError(
        422,
        'story_required',
        'Indica qué historia se retira (storyIndex)',
      );
    }
    const team = await Team.findOne({ restaurantId: id }).lean<TeamRecord>();
    if (!team?.stories?.[storyIndex] || team.stories[storyIndex].revokedAt) {
      throw storyNotFound();
    }
    const revoked = `stories.${storyIndex}.revokedAt`;
    return approveAndApply(record, user, now, id, async () => {
      const done = await Team.updateOne(
        { _id: team._id, [revoked]: { $exists: false } },
        { $set: { [revoked]: now } },
      );
      if (!done.modifiedCount) throw storyNotFound();
      // Sin el texto ni el nombre: solo cuál se retira.
      return {
        entity: 'team',
        entityId: team._id,
        action: 'revoke_story',
        diff: { story: { index: storyIndex, revoked: true } },
      };
    });
  }

  throw new ApiError(
    501,
    'not_implemented',
    'Por ahora solo se pueden retirar una ficha o una historia',
  );
}

const tooManyStories = (current: number, adding: number) =>
  new ApiError(
    422,
    'too_many_stories',
    `El equipo ya tiene ${current} historias y no caben ${adding} más (máximo 3): se retiran antes o se rechaza`,
  );

// Aprobar el equipo de un negocio: crea o actualiza su `Team`. Las historias
// nuevas se añaden detrás de las que ya había (también las retiradas, para que
// las posiciones no cambien: las retiradas apuntan a ellas por su índice) con el
// consentimiento de cuando se enviaron. Después salen de la solicitud, donde
// solo estaban de paso hasta esta decisión.
export async function approveTeam(
  record: SuggestionRecord,
  user: User,
  body: unknown,
  now: Date,
) {
  parseOrThrow(teamApprovalSchema, body);
  const id = targetOf(record);
  const place = await Restaurant.exists({ _id: id, status: 'published' });
  if (!place) throw unavailable();

  const payload = record.payload as unknown as Pick<
    TeamInput,
    'level' | 'summary' | 'areas' | 'disabilityTypes' | 'stories'
  >;
  const incoming = (payload.stories ?? []).map((s) => ({
    displayName: s.displayName,
    role: s.role,
    storyText: s.storyText,
    consentBy: s.consentBy,
    consentRecordedAt: record.createdAt,
  }));
  const current = await Team.findOne({ restaurantId: id }).lean<TeamRecord>();
  const kept = current?.stories?.length ?? 0;
  if (kept + incoming.length > 3) throw tooManyStories(kept, incoming.length);

  const approved = await approveAndApply(record, user, now, id, async () => {
    const level = payload.level;
    const doc =
      (await Team.findOne({ restaurantId: id })) ??
      new Team({ restaurantId: id });
    const created = doc.isNew;
    if (kept !== (doc.stories?.length ?? 0)) {
      throw tooManyStories(doc.stories?.length ?? 0, incoming.length);
    }
    doc.set({
      visibilityLevel: level,
      summary: payload.summary,
      areas: payload.areas,
      disabilityTypes: payload.disabilityTypes,
    });
    if (incoming.length) {
      if (doc.stories) doc.stories.push(...incoming);
      else doc.set('stories', incoming);
    }
    await doc.save();
    await Suggestion.updateOne(
      { _id: record._id },
      { $unset: { 'payload.stories': 1 } },
    );
    // Sin nombres ni textos: solo cuántas historias se añaden.
    return {
      entity: 'team',
      entityId: doc._id,
      action: created ? 'create' : 'update',
      diff: {
        level: { from: current?.visibilityLevel, to: level },
        totalStaff: {
          from: current?.summary.totalStaff,
          to: payload.summary.totalStaff,
        },
        staffWithDisability: {
          from: current?.summary.staffWithDisability,
          to: payload.summary.staffWithDisability,
        },
        storiesAdded: incoming.length,
      },
    };
  });
  // La respuesta ya sin las historias, igual que queda guardada.
  const payloadWithout = { ...approved.payload };
  delete payloadWithout.stories;
  return { ...approved, payload: payloadWithout };
}
