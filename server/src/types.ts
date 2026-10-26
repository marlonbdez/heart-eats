// Forma pública de lo que devuelve la API de lectura. Refleja web/src/lib/types.ts
// (el contrato con la web) y docs/02_API_SPEC.md.
import type {
  BusinessType,
  DisabilityType,
  TeamArea,
  TeamLevel,
} from './catalog.js';

export interface PublicTeamStory {
  displayName: string;
  role: string;
  storyText: string;
  photoUrl?: string;
}

export interface PublicTeam {
  level: TeamLevel;
  summary: { totalStaff: number; staffWithDisability: number };
  areas?: TeamArea[];
  disabilityTypes?: DisabilityType[];
  stories?: PublicTeamStory[];
}

export interface PublicPhoto {
  url: string;
  thumbUrl: string;
  alt?: Record<string, string>;
}

export interface PublicRestaurant {
  slug: string;
  name: string;
  description?: Record<string, string>;
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
  openingHours: { day: number; open: string; close: string }[];
  // Zona horaria del local (IANA), en la que se leen `openingHours`.
  timezone?: string;
  priceRange?: 1 | 2 | 3;
  menuUrl?: string;
  accessibility?: string[];
  signatureDishes: {
    name: string;
    description?: string;
    price?: string;
    photoUrl?: string;
    thumbUrl?: string;
  }[];
  // La primera es la portada. En las listas solo viene esa.
  photos?: PublicPhoto[];
  team?: PublicTeam;
  ownerConfirmedAt?: string;
  verification: {
    level: 'community' | 'admin';
    method: string;
    lastVerifiedAt: string;
    needsReview: boolean;
  };
  isDemo?: true;
}
