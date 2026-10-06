# ADR 0003 · Idiomas y rutas

- **Estado:** aceptada
- **Fecha:** 2026-10-06
- **Resuelve:** P7 (idiomas iniciales: ES + EN).

## Contexto

HeartEats debe ser multipaís y multidioma desde el primer día (handoff §1). La web es estática (`output: 'export'`), así que no hay servidor que decida el idioma en cada petición. Cambiar la estructura de rutas cuando ya existan muchas pantallas es caro.

## Decisión

- **Librería:** `next-intl` (compatible con exportación estática).
- **Idioma en la URL:** `/es/...` y `/en/...`. Las rutas son iguales en todos los idiomas (`/es/lista`, `/en/lista`). Añadir un idioma es crear `web/messages/<código>.json` y añadir el código a `web/src/i18n/routing.ts`.
- **Idioma por defecto:** `es` (lanzamiento en Madrid).
- **La raíz `/`:** en Netlify, una regla de redirección envía a `/en` si el navegador está en inglés (`netlify.toml`); en cualquier otro caso la propia página raíz redirige a `/es`.
- **Textos de la interfaz:** solo en `messages/<idioma>.json`, nunca escritos en los componentes. Fechas y números con los formateadores de `next-intl` (según el idioma).
- **Textos de los datos** (descripciones de los locales): `LocalizedText = { es: '…', en: '…' }`, como indica `01_ESPECIFICACION_DATOS`. Si falta un idioma, se usa el de lanzamiento. Nombres de locales y de platos no se traducen.
- **Categorías de comida:** clave estable en inglés (`pizza`, `set_menu`…) y etiqueta traducida en `messages/<idioma>.json` (`foodTags.<clave>`).
- **Multipaís:** el país va en cada dirección (ISO 3166-1 alpha-2) y no hay lógica específica de España en el código. Lo que dependa de la región (vista inicial del mapa, formato de código postal, barrios) se tratará como configuración por región, no como constante.

## Consecuencias

- Toda pantalla nueva usa `useTranslations`/`getTranslations` y los `Link` de `@/i18n/navigation`.
- Cada texto nuevo se añade a **todos** los `messages/*.json`.
- Las traducciones al inglés de la interfaz deben revisarlas personas hablantes antes del lanzamiento, igual que el lenguaje en español (diseño, principio 2).
- Idiomas con escritura de derecha a izquierda necesitarán revisar estilos (no se contemplan por ahora).
- El 404 fuera de un idioma (p. ej. `/fr`) es bilingüe.
