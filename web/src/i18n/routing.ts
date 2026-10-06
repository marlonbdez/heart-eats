import { defineRouting } from 'next-intl/routing';

// Idiomas de la interfaz. Añadir uno = nuevo messages/<código>.json y
// añadir su código aquí. El idioma por defecto es el de lanzamiento (Madrid).
export const routing = defineRouting({
  locales: ['es', 'en'],
  defaultLocale: 'es',
});

export type Locale = (typeof routing.locales)[number];
