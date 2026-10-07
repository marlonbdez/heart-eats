# ADR 0003 · Idiomas y rutas

- **Estado:** aceptada
- **Fecha:** 2026-10-06
- **Resuelve:** P7 (idiomas iniciales: ES + EN).

## Contexto

HeartEats debe ser multipaís y multidioma desde el primer día (handoff §1). La web es estática (`output: 'export'`), así que no hay servidor que decida el idioma en cada petición. Cambiar la estructura de rutas cuando ya existan muchas pantallas es caro.

## Decisión

- **Librería:** `next-intl` (compatible con exportación estática).
- **Idioma en la URL:** `/es/...` y `/en/...`. Las rutas van en inglés en todos los idiomas (`/es/list`, `/en/list`, `/es/propose`; ver la revisión del final). Añadir un idioma es crear `web/messages/<código>.json` y añadir el código a `web/src/i18n/routing.ts`.
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

## Revisión 2026-10-07 · URLs en inglés

La decisión original dejaba las rutas "iguales en todos los idiomas" pero en español (`/en/proponer`), lo que resultaba raro para quien usa la web en inglés. Se barajó traducirlas (`/es/proponer` ↔ `/en/suggest`) y se descartó:

- La forma soportada de `next-intl` para rutas traducidas (`pathnames`) las reescribe con un middleware, y la exportación estática (`output: 'export'`) no admite middleware; la propia documentación lo indica como limitación.
- Se puede lograrlo sin middleware, pero con código propio (una tabla de rutas y una página que despacha), que sale del estándar de Next y hay que mantener. Preferimos código simple y convencional.

**Decisión:** las URLs van en inglés en todos los idiomas, con el prefijo de idioma delante (`/es/propose`, `/en/propose`, `/es/place/<slug>`). El idioma se aplica a los textos, no a las rutas. Las carpetas de `web/src/app/[locale]/` son esas rutas tal cual: `list`, `propose`, `place/[slug]`, `correct`, `business`, `about`, `verification`, `privacy`, `contact`.

Si en el futuro la web deja de ser estática (servidor Next), se podrán traducir con `pathnames` sin cambiar los textos ni la estructura de carpetas.
