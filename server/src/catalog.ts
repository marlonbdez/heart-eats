// Catálogos controlados (docs/01_ESPECIFICACION_DATOS.md §4). La clave es
// estable y en inglés; la etiqueta por idioma vive en la web (messages/).
// Cuando haga falta compartirlos con la web pasarán a shared/constants.

export const businessTypes = [
  'restaurant',
  'cafe',
  'bar',
  'bakery',
  'catering',
  'social_project',
] as const;

export const restaurantStatuses = [
  'draft',
  'pending',
  'published',
  'rejected',
  'archived',
] as const;

export const verificationLevels = ['unverified', 'community', 'admin'] as const;

// Solo estos dos niveles son públicos: «sin verificar» es interno (ver
// docs/07_VERIFICACION.md).
export const publicVerificationLevels = ['community', 'admin'] as const;

export const verificationMethods = [
  'visit',
  'call',
  'documentation',
  'owner_confirmed',
] as const;

export const teamLevels = ['minimal', 'medium', 'full'] as const;

export const teamAreas = [
  'kitchen',
  'dining',
  'bar',
  'workshop',
  'delivery',
] as const;

export const disabilityTypes = [
  'intellectual_disability',
  'physical_disability',
  'hearing_impairment',
  'visual_impairment',
  'mental_health',
  'autism_spectrum',
  'other',
] as const;

// Accesibilidad del local (no de su equipo): lo que se puede dar por hecho al
// llegar. Lista corta y cerrada, para poder comparar y filtrar; el orden es el
// de la ficha.
export const accessibilityFeatures = [
  'step_free_entrance',
  'accessible_restroom',
  'room_to_move',
  'easy_read_menu',
  'large_print_menu',
  'quiet_space',
  'sign_language',
] as const;

export const consentBy = ['self', 'legal_representative'] as const;

export const cuisineTypes = [
  'american',
  'italian',
  'spanish',
  'vegetarian',
] as const;

// Orden en que se ofrecen por defecto: lo más buscado primero.
export const foodTags = [
  { key: 'spanish', icon: '🥘' },
  { key: 'tapas', icon: '🫒' },
  { key: 'set_menu', icon: '🍽️' },
  { key: 'coffee', icon: '☕' },
  { key: 'brunch', icon: '🥞' },
  { key: 'bakery', icon: '🥖' },
  { key: 'desserts', icon: '🍰' },
  { key: 'italian', icon: '🍝' },
  { key: 'pizza', icon: '🍕' },
  { key: 'burgers', icon: '🍔' },
  { key: 'asian', icon: '🥢' },
  { key: 'sushi', icon: '🍣' },
  { key: 'mexican', icon: '🌮' },
  { key: 'latin', icon: '🥑' },
  { key: 'arab', icon: '🧆' },
  { key: 'seafood', icon: '🦐' },
  { key: 'rice', icon: '🍚' },
  { key: 'grill', icon: '🥩' },
  { key: 'vegetarian', icon: '🥗' },
  { key: 'vegan', icon: '🌱' },
] as const;

export type BusinessType = (typeof businessTypes)[number];
export type TeamLevel = (typeof teamLevels)[number];
export type TeamArea = (typeof teamAreas)[number];
export type DisabilityType = (typeof disabilityTypes)[number];
