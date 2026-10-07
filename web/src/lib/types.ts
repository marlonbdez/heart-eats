// Tipos de lectura pública. Reflejan docs/01_ESPECIFICACION_DATOS.md.
// Cuando haya backend, estos tipos pasarán a shared/types.

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

export interface TeamRole {
  role: string;
  disabilityCategory: string;
  count: number;
}

export interface TeamStory {
  displayName: string;
  role: string;
  storyText: string;
  photoUrl?: string;
}

export interface Team {
  level: TeamLevel;
  summary: { totalStaff: number; staffWithDisability: number };
  roles?: TeamRole[];
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
  description?: string;
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
  verification: {
    level: VerificationLevel;
    method: VerificationMethod;
    lastVerifiedAt: string; // ISO
    needsReview: boolean;
  };
  isDemo: true;
}

export interface FoodTag {
  key: string;
  label: string;
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
