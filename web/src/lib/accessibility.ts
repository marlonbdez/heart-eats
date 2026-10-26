// Lo que puede ofrecer un local para quien lo necesita. Las claves son las del
// servidor (server/src/catalog.ts) y van en el orden de la ficha; las etiquetas
// viven en messages/<idioma>.json (accessibility.features.<clave>).
export const ACCESSIBILITY_FEATURES = [
  'step_free_entrance',
  'accessible_restroom',
  'room_to_move',
  'easy_read_menu',
  'large_print_menu',
  'quiet_space',
  'sign_language',
] as const;

export type AccessibilityFeature = (typeof ACCESSIBILITY_FEATURES)[number];

// Deja solo claves conocidas, sin repetir y en el orden de la ficha.
export const cleanAccessibility = (value: unknown): AccessibilityFeature[] =>
  ACCESSIBILITY_FEATURES.filter(
    (key) => Array.isArray(value) && value.includes(key),
  );
