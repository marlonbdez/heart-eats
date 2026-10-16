import type { RestaurantRecord } from '../models/restaurant.js';
import type {
  SuggestionRecord,
  SuggestionWarning,
} from '../models/suggestion.js';
import { maskEmail } from './mask-email.js';

// Lo que necesita saber de un local al que apunta una solicitud.
export type TargetRestaurant = Pick<
  RestaurantRecord,
  '_id' | 'slug' | 'name' | 'address'
>;

// Forma de una solicitud para quien modera (docs/02_API_SPEC.md). Sigue a
// `ModerationItem` de la web, con `type` en lugar de `kind` y la fecha en vez
// de «hace N días»: eso lo calcula la pantalla.
export interface ModerationItem {
  id: string;
  type: SuggestionRecord['type'];
  status: SuggestionRecord['status'];
  createdAt: string;
  locale: SuggestionRecord['locale'];
  name: string;
  neighborhood: string;
  address: string;
  contactMasked?: string;
  warnings: SuggestionWarning[];
  evidenceUrl?: string;
  // Solo en un local nuevo:
  foodTags?: string[];
  dishes?: string[];
  howKnown?: string;
  // Solo en correcciones y retiradas:
  restaurantSlug?: string;
  correction?: { kind: string; before?: string; after: string };
  removal?: { what: string; details?: string };
}

// Lo que guardan las rutas de envío en `payload` (routes/proposals.ts y
// routes/reports.ts).
interface ProposalPayload {
  name: string;
  street?: string;
  city: string;
  postalCode?: string;
  foodTags: string[];
  dishes: { name: string }[];
  howKnown?: string;
}
interface CorrectionPayload {
  kind: string;
  details: string;
}
interface RemovalPayload {
  what: string;
  details?: string;
}

const join = (...parts: (string | undefined)[]) =>
  parts.filter(Boolean).join(', ');

export function toModerationItem(
  s: SuggestionRecord,
  target?: TargetRestaurant,
): ModerationItem {
  const base = {
    id: String(s._id),
    type: s.type,
    status: s.status,
    createdAt: s.createdAt.toISOString(),
    locale: s.locale,
    contactMasked: maskEmail(s.contactEmail),
    warnings: s.warnings,
    evidenceUrl: s.evidence[0],
  };

  if (s.type === 'new') {
    const p = s.payload as unknown as ProposalPayload;
    return {
      ...base,
      name: p.name,
      neighborhood: p.city,
      address: join(p.street, p.postalCode, p.city),
      foodTags: p.foodTags,
      dishes: p.dishes.map((d) => d.name),
      howKnown: p.howKnown,
    };
  }

  // El resto apunta a un local publicado. Si ya no existe, se ve igualmente
  // la solicitud, sin los datos del local.
  const place = {
    name: target?.name ?? '',
    neighborhood: target?.address.neighborhood ?? target?.address.city ?? '',
    address: target ? join(target.address.street, target.address.city) : '',
    restaurantSlug: target?.slug,
  };

  if (s.type === 'edit') {
    const p = s.payload as unknown as CorrectionPayload;
    return {
      ...base,
      ...place,
      correction: {
        kind: p.kind,
        before: p.kind === 'address' ? target?.address.street : undefined,
        after: p.details,
      },
    };
  }
  if (s.type === 'removal') {
    const p = s.payload as unknown as RemovalPayload;
    return {
      ...base,
      ...place,
      removal: { what: p.what, details: p.details },
    };
  }
  return { ...base, ...place };
}
