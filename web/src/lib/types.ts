// Tipos de lectura pública. Reflejan docs/01_ESPECIFICACION_DATOS.md.
// Cuando haya backend, estos tipos pasarán a shared/types.

// Texto con una versión por idioma: { es: '...', en: '...' }. Si falta el
// idioma pedido, se usa el del lanzamiento (es).
export type LocalizedText = Record<string, string>;

export type BusinessType =
  'restaurant' | 'cafe' | 'bar' | 'bakery' | 'catering' | 'social_project';

export type TeamLevel = 'minimal' | 'medium' | 'full';
export type VerificationLevel = 'community' | 'admin';
export type VerificationMethod =
  'visit' | 'call' | 'documentation' | 'owner_confirmed';

export interface SignatureDish {
  name: string;
  description?: string;
  photoUrl?: string;
}

// Áreas de trabajo y tipos de discapacidad se cuentan por separado, sin
// cruzarlos: así nadie puede reconocerse ("una persona sorda en cocina").
export type TeamArea = 'kitchen' | 'dining' | 'bar' | 'workshop' | 'delivery';
export type DisabilityType =
  | 'intellectual_disability'
  | 'physical_disability'
  | 'hearing_impairment'
  | 'visual_impairment'
  | 'mental_health'
  | 'autism_spectrum'
  | 'other';

export interface TeamStory {
  displayName: string;
  role: string;
  storyText: string;
  photoUrl?: string;
}

export interface Team {
  level: TeamLevel;
  summary: { totalStaff: number; staffWithDisability: number };
  areas?: TeamArea[];
  disabilityTypes?: DisabilityType[];
  stories?: TeamStory[];
}

export interface OpeningHours {
  day: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo
  open: string; // HH:mm
  close: string; // HH:mm
}

export interface Restaurant {
  slug: string;
  name: string;
  description?: LocalizedText;
  businessType: BusinessType;
  cuisineTypes: string[];
  foodTags: string[];
  address: {
    street: string;
    postalCode?: string;
    neighborhood?: string;
    city: string;
    region?: string;
    country: string;
  };
  location: { lat: number; lng: number };
  contact: {
    phone?: string;
    email?: string;
    website?: string;
    instagram?: string;
  };
  openingHours: OpeningHours[];
  signatureDishes: SignatureDish[]; // 1-3
  team?: Team;
  // El negocio sabe que aparece y ha dado el visto bueno. Sin esto, el equipo
  // no se muestra con detalle (ver lib/team.ts).
  ownerConfirmedAt?: string; // ISO
  verification: {
    level: VerificationLevel;
    method: VerificationMethod;
    lastVerifiedAt: string; // ISO
    needsReview: boolean;
  };
  isDemo: true;
}

// La etiqueta de cada categoría vive en messages/<idioma>.json (foodTags.<key>).
export interface FoodTag {
  key: string;
  icon: string;
}

export interface RestaurantQuery {
  q?: string; // buscador de sitios: nombre, barrio, ciudad, código postal
  food?: string[]; // foodTags (OR)
}

// Propuesta de un nuevo local (F2). Entra siempre en moderación; nunca se
// publica sin verificación y sin el sí del negocio.
export interface ProposalInput {
  name: string;
  street?: string;
  city: string;
  postalCode?: string;
  foodTags: string[]; // claves de FoodTag; 'other' para "Otra"
  dishes: SignatureDish[]; // 0-3, solo con nombre
  howKnown?: string;
  evidenceUrl?: string;
  independent: boolean;
  contactEmail?: string; // privado, nunca se muestra
  website?: string; // honeypot: debe llegar vacío
}

// Qué dato de la ficha se quiere corregir (F4).
export type CorrectionKind = 'address' | 'hours' | 'closed' | 'team' | 'other';

// Corrección sugerida sobre un local publicado (F4). Entra en moderación;
// nada cambia en la ficha hasta que alguien lo revisa.
export interface CorrectionInput {
  restaurantSlug: string;
  kind: CorrectionKind;
  details: string;
  evidenceUrl?: string;
  contactEmail?: string; // privado, nunca se muestra
  website?: string; // honeypot: debe llegar vacío
}

// Quién da el permiso de una historia (F3): la propia persona o su
// representante legal.
export type ConsentBy = 'self' | 'legal_representative';

export interface BusinessStoryInput extends TeamStory {
  consentBy: ConsentBy; // una historia sin permiso no se envía
}

// El negocio cuenta su equipo (F3). Entra en moderación, que se pone en
// contacto con el negocio para confirmar que es quien dice ser.
export interface BusinessTeamInput {
  restaurantSlug: string;
  level: TeamLevel;
  summary: Team['summary'];
  areas?: TeamArea[];
  disabilityTypes?: DisabilityType[];
  stories?: BusinessStoryInput[]; // 0-3
  contactEmail: string; // privado, nunca se muestra
  website?: string; // honeypot: debe llegar vacío
}

// Moderación (F5). Una solicitud en cola es una propuesta de local nuevo (F2)
// o una corrección (F4).
export type ModerationKind = 'new' | 'correction';

// Avisos que el filtro automático deja a la persona que modera.
export type ModerationWarning =
  | { kind: 'duplicate'; other: string; meters: number }
  | { kind: 'chain' }
  | { kind: 'noEvidence' };

export interface ModerationItem {
  id: string;
  kind: ModerationKind;
  name: string;
  neighborhood: string;
  address: string;
  daysAgo: number;
  contactMasked?: string; // el correo de quien propone nunca se ve entero
  warnings: ModerationWarning[];
  // Solo en un local nuevo:
  foodTags?: string[];
  dishes?: string[];
  howKnown?: string;
  evidenceUrl?: string;
  // Solo en una corrección:
  restaurantSlug?: string;
  correction?: { kind: CorrectionKind; before: string; after: string };
}

export type RejectReason =
  'not_independent' | 'no_evidence' | 'duplicate' | 'out_of_zone' | 'other';

export type ModerationDecision =
  | {
      action: 'approve';
      level?: VerificationLevel; // solo en un local nuevo
      method?: VerificationMethod;
    }
  | { action: 'reject'; reason: RejectReason; note?: string }
  | { action: 'ask_info'; note: string };
