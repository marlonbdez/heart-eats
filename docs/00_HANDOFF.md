# HeartEats — Documento de traspaso e inicio de proyecto

> **Versión:** 1.0 · **Fecha:** 6 de octubre de 2026
> **Propietario del proyecto:** Marlon (GitHub: `marlonbdez`)
> **Estado:** Fase 0 (definición) — sin código escrito todavía
> **Propósito de este documento:** que cualquier sesión de trabajo (humana o con Claude Code) pueda arrancar el proyecto con todo el contexto, las decisiones ya tomadas y las pendientes.

---

## Índice

1. [Visión y propósito](#1-visión-y-propósito)
2. [Decisiones cerradas](#2-decisiones-cerradas)
3. [Decisiones pendientes](#3-decisiones-pendientes)
4. [Alcance del MVP](#4-alcance-del-mvp)
5. [Arquitectura técnica](#5-arquitectura-técnica)
6. [Estructura del monorepo](#6-estructura-del-monorepo)
7. [Despliegue y costes](#7-despliegue-y-costes)
8. [Modelo de datos (borrador)](#8-modelo-de-datos-borrador)
9. [Especificación preliminar de la API](#9-especificación-preliminar-de-la-api)
10. [Verificación y confianza](#10-verificación-y-confianza)
11. [Privacidad, legal y ética](#11-privacidad-legal-y-ética)
12. [Mapas: proveedores y límites](#12-mapas-proveedores-y-límites)
13. [Diseño UI/UX](#13-diseño-uiux)
14. [Metodología de trabajo](#14-metodología-de-trabajo)
15. [Hoja de ruta](#15-hoja-de-ruta)
16. [Riesgos y mitigaciones](#16-riesgos-y-mitigaciones)
17. [Correcciones a información previa](#17-correcciones-a-información-previa)
18. [Primeros pasos en la sesión de código](#18-primeros-pasos-en-la-sesión-de-código)
19. [Glosario](#19-glosario)

---

## 1. Visión y propósito

**HeartEats** es una aplicación web de mapas interactivos y colaborativos para descubrir, visibilizar y apoyar restaurantes y negocios gastronómicos locales que apuestan por la **inclusión laboral de personas con discapacidad**.

### Qué la hace distinta

- **El factor humano primero.** El filtro principal es la inclusión laboral real (quién trabaja en el negocio), no la accesibilidad arquitectónica (rampas, baños adaptados), que ya cubren otras herramientas. Tampoco es una bolsa de empleo B2B.
- **Colaborativa y transparente.** Usuarios y dueños proponen locales, actualizan datos y ven el estado de verificación de cada ficha.
- **Narrativa.** Cada ficha puede contar la historia del equipo, convirtiendo la decisión cotidiana de salir a comer en un acto de apoyo consciente.
- **Hiperespecífica y local.** Prioriza negocios independientes y proyectos de hostelería con impacto social. Excluye grandes cadenas corporativas.

### Naturaleza del proyecto

- **Código abierto y sin ánimo de lucro.**
- **Lanzamiento en Madrid**, con arquitectura pensada para ser **internacional desde el primer día** (campos de país/región/ciudad, moderación por zona, i18n).
- Principios de partida: datos verificados por la comunidad, foco en pequeños negocios locales y propósito social claro.

---

## 2. Decisiones cerradas

| Tema | Decisión |
|---|---|
| **Nombre** | **HeartEats** |
| **Dominio** | `hearteats.org` — **ya comprado** |
| **GitHub** | Usuario `marlonbdez`; repo previsto `marlonbdez/heart-eats` |
| **Frontend** | Next.js (React) en **modo SPA con exportación estática** (sin SSR) |
| **Backend** | Node.js + Express |
| **Base de datos** | MongoDB (Atlas, plan gratuito M0 al inicio) con índices geoespaciales |
| **Mapas** | Leaflet para el MVP (posible migración futura a MapLibre GL) |
| **Hosting frontend** | Netlify (estático, gratis) |
| **Hosting backend** | Pendiente de elegir entre Railway / Render / Fly.io (ver §3 y §7) |
| **Móvil** | **PWA** en el MVP. No se hace app nativa de entrada |
| **Estructura de repo** | **Monorepo** (`web/`, `server/`, `shared/`, `docs/`) |
| **Niveles de info del equipo** | Tres niveles; cada negocio decide cuánto comparte (§8.3) |
| **Licencia** | Código bajo AGPL-3.0 (recomendado; confirmar, ver §3) |
| **Diseño** | Se valida **antes** de escribir código. Prototipos con la herramienta de artifacts de Claude, no Figma |
| **Idioma de lanzamiento** | Español, con i18n desde el principio para añadir más idiomas |
| **Regla de exclusión** | Solo negocios independientes / proyectos con impacto social; sin grandes cadenas |

### Razonamiento de las decisiones técnicas clave

- **Next.js sin SSR:** la app es un mapa interactivo (SPA). SSR añadiría complejidad (hidratación, Leaflet no funciona en servidor) sin beneficio claro. Se mantiene Next.js por rutas, estructura y ecosistema React. Si más adelante se quiere SEO por ficha de restaurante, se puede añadir generación estática de páginas (SSG) sin cambiar de framework.
- **Export estático:** permite hospedar el frontend gratis en cualquier CDN y que el único coste recurrente sea el backend.
- **PWA antes que app nativa:** cubre ~90 % del valor móvil (icono en pantalla de inicio, pantalla completa, caché) con una fracción del mantenimiento. Si en el futuro hace falta app nativa, se reevalúa (React Native o Flutter) con datos reales de uso.
- **Monorepo:** una sola fuente de verdad, más fácil para contribuyentes; cada plataforma despliega solo su carpeta.

---

## 3. Decisiones pendientes

| # | Decisión | Opciones | Cuándo decidir |
|---|---|---|---|
| P1 | **Hosting del backend** | Railway (~5 $/mes tras crédito de prueba), Render (gratis con "sleep" tras inactividad), Fly.io, VPS pequeño | Antes de la Fase 1 |
| P2 ✅ | **Licencia definitiva** (resuelta: ver `adr/0001-licencias.md`) | Código: AGPL-3.0. Datos: ODbL o CC BY-SA 4.0. Confirmar combinación | Antes del primer commit público |
| P3 ✅ | **Proveedor de teselas de mapa** (resuelta: ver `adr/0002-mapa-maplibre-openfreemap.md`) | MapLibre GL + OpenFreeMap | Resuelta |
| P4 | **Geocodificación** | Nominatim (con límites), Photon, MapTiler Geocoding | Antes de implementar el formulario |
| P5 | **Autenticación** | MVP: sin cuentas para lectura; JWT/magic link para quien envía o modera. Valorar login social | Fase 0 (spec API) |
| P6 | **Estructura legal** | Asociación sin ánimo de lucro en España (cuándo constituirla) | Antes de recibir donaciones o subvenciones |
| P7 | **Idiomas iniciales** | ES + EN como mínimo | Fase 0 |
| P8 | **Revisión de marca** | Consulta en bases de datos de marcas (OEPM, EUIPO) | Antes del lanzamiento público |
| P9 | **Moderación** | Quién modera Madrid al inicio (Marlon) y criterios de ascenso a moderador | Fase 0 |

---

## 4. Alcance del MVP

### Incluido (must-have)

1. **Mapa interactivo** con marcadores personalizados, agrupación (clustering) y tarjeta de vista previa al hacer clic.
2. **Filtros:** tipo de inclusión, tipo de cocina, zona/barrio.
3. **Ficha de restaurante:**
   - Datos básicos: nombre, dirección, horarios, tipo de cocina, contacto.
   - Sección **"El Equipo"** con los tres niveles de detalle (§8.3).
   - **Insignia de verificación** y fecha de última actualización.
4. **Formulario de sugerencia/colaboración** para proponer nuevos locales o corregir datos, con evidencias de verificación.
5. **Regla de exclusión** aplicada en revisión (no cadenas corporativas).
6. **PWA** (manifest, service worker, instalable).
7. **Panel mínimo de moderación** (aprobar/rechazar sugerencias).

### Fuera del MVP (backlog)

- App nativa.
- Reseñas y valoraciones de usuarios.
- Sistema de puntos/gamificación para verificadores.
- Multi-moderador por región con roles avanzados.
- Panel propio para que el dueño edite su ficha (inicialmente se hace vía formulario + moderación).
- Notificaciones, favoritos, listas.
- Exportación/API pública de datos abiertos documentada.

---

## 5. Arquitectura técnica

```
┌──────────────────────┐        HTTPS / JSON        ┌────────────────────────┐
│  Navegador / PWA     │ ─────────────────────────► │  API Express (Node)    │
│  Next.js (export     │                            │  Railway / Render / …  │
│  estático) + Leaflet │ ◄───────────────────────── │                        │
│  Hosting: Netlify    │                            └───────────┬────────────┘
└──────────┬───────────┘                                        │ Mongoose
           │ teselas                                            ▼
           ▼                                        ┌────────────────────────┐
┌──────────────────────┐                            │  MongoDB Atlas (M0)    │
│  Proveedor de mapa   │                            │  Índice 2dsphere       │
│  (MapTiler/Stadia/…) │                            └────────────────────────┘
└──────────────────────┘
```

### Stack detallado

**Frontend (`web/`)**
- Next.js (versión estable actual), TypeScript recomendado.
- `output: 'export'` en `next.config.js` (en versiones recientes de Next.js el comando `next export` ya no existe; basta `next build` con esa opción).
- Leaflet + `react-leaflet`, **cargados con importación dinámica y `ssr: false`** (Leaflet requiere `window`).
- Plugin de clustering (`leaflet.markercluster` o equivalente).
- Gestión de datos: TanStack Query (caché de peticiones) o SWR.
- Estilos: CSS Modules o Tailwind (decidir en diseño).
- i18n: `next-intl` o `react-i18next` (compatible con export estático).
- PWA: manifest + service worker (p. ej. Workbox).
- Accesibilidad como requisito, no como extra: la app trata de inclusión, así que **debe cumplir WCAG 2.2 AA** (contraste, navegación por teclado, lectores de pantalla, texto alternativo, mapa con alternativa en lista).

**Backend (`server/`)**
- Node.js LTS + Express.
- Mongoose para modelos y validación.
- Validación de entrada: Zod o Joi.
- Seguridad: Helmet, CORS restringido al dominio del frontend, rate limiting, sanitización.
- Autenticación: JWT / magic link (a definir en P5).
- Tests: Vitest o Jest + Supertest.

**Base de datos**
- MongoDB con índice `2dsphere` sobre `location` (GeoJSON Point) para consultas "cerca de" y por bounding box.
- Alternativa evaluada: PostgreSQL + PostGIS. Se mantiene MongoDB por decisión de partida y simplicidad en el MVP.

**Calidad y CI**
- GitHub Actions: lint, tests y build en cada PR.
- Prettier + ESLint compartidos en el monorepo.
- Commits convencionales (opcional, recomendado).

---

## 6. Estructura del monorepo

```
heart-eats/
├─ docs/
│  ├─ README.md                      # Índice de documentación
│  ├─ 01_ESPECIFICACION_DATOS.md     # Esquemas, validaciones, índices
│  ├─ 02_API_SPEC.md                 # Endpoints, ejemplos, errores
│  ├─ 03_ARQUITECTURA.md             # Diagramas y decisiones (ADR)
│  ├─ 04_DISENO_UI.md                # Principios, pantallas, componentes
│  ├─ 05_ROADMAP.md                  # Fases y hitos
│  ├─ 06_COSTES.md                   # Presupuesto y límites de planes gratuitos
│  ├─ 07_VERIFICACION.md             # Proceso de verificación y moderación
│  ├─ 08_PRIVACIDAD_LEGAL.md         # RGPD, consentimientos, licencias
│  ├─ GUIA_RESTAURANTES.md           # Qué datos pedir y cómo presentar el proyecto
│  └─ adr/                           # Architecture Decision Records
│
├─ web/                              # Frontend (→ Netlify)
│  ├─ src/ (o app/ | pages/)
│  ├─ public/                        # Iconos PWA, manifest
│  ├─ next.config.js
│  └─ package.json
│
├─ server/                           # Backend (→ hosting elegido)
│  ├─ src/
│  │  ├─ models/
│  │  ├─ routes/
│  │  ├─ controllers/
│  │  ├─ middleware/
│  │  └─ config/
│  ├─ seed/                          # Datos de prueba
│  ├─ tests/
│  └─ package.json
│
├─ shared/                           # Tipos y constantes (opcional en MVP)
│  ├─ types/
│  └─ constants/
│
├─ .github/
│  ├─ workflows/                     # CI
│  ├─ ISSUE_TEMPLATE/
│  └─ PULL_REQUEST_TEMPLATE.md
│
├─ netlify.toml                      # En la raíz, con base = "web"
├─ README.md
├─ CONTRIBUTING.md
├─ CODE_OF_CONDUCT.md
├─ SECURITY.md
├─ LICENSE
└─ .gitignore
```

> **Nota sobre workspaces:** se puede usar `npm workspaces` o `pnpm` para compartir dependencias y scripts. Si se usan, conviene confirmar que Netlify y el hosting del backend resuelven bien el workspace al construir solo una carpeta.

---

## 7. Despliegue y costes

### Cómo funciona un monorepo con varias plataformas

Cada plataforma clona el repo completo pero **construye y publica solo su carpeta**:

- **Netlify** → `base = "web"`, comando `npm run build`, publica `out/`.
- **Backend** → directorio raíz configurado como `server/` (en Railway/Render se define en el panel o con un archivo de configuración), comando de arranque `npm start`.
- Se comunican únicamente por HTTP (API REST). Pueden fallar o desplegarse de forma independiente.

### Ejemplo de `netlify.toml` (en la raíz del repo)

```toml
[build]
  base    = "web"
  command = "npm run build"
  publish = "out"

[build.environment]
  NODE_VERSION = "20"

[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
```

(La regla de redirección permite que las rutas del lado cliente funcionen al recargar; ajustar según el modo de exportación final.)

### Ejemplo de `next.config.js`

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true }, // necesario en export estático
};
module.exports = nextConfig;
```

### Costes estimados (MVP)

| Componente | Servicio | Coste estimado | Notas |
|---|---|---|---|
| Dominio | `hearteats.org` | ~12–15 €/año | Ya comprado; renovar |
| Frontend | Netlify (plan gratuito) | 0 € | Límites de build y ancho de banda; suficientes para el MVP |
| Backend | Por decidir (P1) | 0–7 €/mes | Railway ya no es 100 % gratis (ver §17) |
| Base de datos | MongoDB Atlas M0 | 0 € | 512 MB; sobra para cientos de restaurantes |
| Mapas | Teselas con plan gratuito | 0 € | Revisar límites (§12) |
| Email transaccional (si hace falta) | Resend / Brevo (plan gratis) | 0 € | Para magic links y avisos |
| **Total orientativo** | | **~1–8 €/mes + dominio** | |

### Vías de financiación a futuro (sin ánimo de lucro)

- Donaciones (Open Collective, GitHub Sponsors, Liberapay).
- Programas de hosting/créditos para código abierto.
- Subvenciones y convocatorias de fundaciones (impacto social, discapacidad, economía social).
- Colaboración con entidades del sector (asociaciones de discapacidad, centros especiales de empleo, empresas de inserción).
- La constitución de una **asociación** (P6) facilita acceder a subvenciones y recibir donaciones con claridad fiscal.

---

## 8. Modelo de datos (borrador)

> Es un punto de partida para `docs/01_ESPECIFICACION_DATOS.md`. Se afinará en la Fase 0.

### 8.1 `Restaurant`

```jsonc
{
  "_id": "ObjectId",
  "slug": "string (único, url-friendly)",
  "name": "string",
  "description": "string (i18n: { es, en, ... })",
  "cuisineTypes": ["string"],            // catálogo controlado
  "businessType": "restaurant | cafe | bar | bakery | catering | social_project",
  "address": {
    "street": "string",
    "postalCode": "string",
    "neighborhood": "string",
    "city": "string",
    "region": "string",
    "country": "string (ISO 3166-1 alpha-2)"
  },
  "location": {                          // GeoJSON, índice 2dsphere
    "type": "Point",
    "coordinates": [lng, lat]
  },
  "contact": { "phone": "", "email": "", "website": "", "instagram": "" },
  "openingHours": [ { "day": 0-6, "open": "HH:mm", "close": "HH:mm" } ],
  "inclusionTypes": ["intellectual_disability", "physical_disability",
                     "hearing_impairment", "visual_impairment",
                     "mental_health", "autism_spectrum", "other"],
  "teamVisibilityLevel": "minimal | medium | full",
  "isIndependent": true,                 // regla de exclusión de cadenas
  "status": "draft | pending | published | rejected | archived",
  "verification": {
    "level": "unverified | community | admin",
    "lastVerifiedAt": "Date",
    "verifiedBy": "ObjectId (User)",
    "method": "visit | call | documentation | owner_confirmed",
    "evidence": [ { "type": "", "url": "", "note": "" } ]
  },
  "createdAt": "Date",
  "updatedAt": "Date"
}
```

### 8.2 `Team` (sección "El Equipo")

```jsonc
{
  "_id": "ObjectId",
  "restaurantId": "ObjectId",
  "visibilityLevel": "minimal | medium | full",

  // Nivel mínimo
  "summary": { "totalStaff": 11, "staffWithDisability": 3 },

  // Nivel medio (opcional)
  "roles": [ { "role": "cocinero", "disabilityCategory": "hearing_impairment", "count": 1 } ],

  // Nivel máximo (opcional, con consentimiento individual)
  "stories": [ {
    "displayName": "string (puede ser seudónimo)",
    "role": "string",
    "storyText": "string",
    "photoUrl": "string?",
    "consentRecordedAt": "Date",
    "consentBy": "string",              // la persona o su representante legal
    "revocable": true
  } ],

  "updatedAt": "Date"
}
```

### 8.3 Los tres niveles de información del equipo

| Nivel | Qué se muestra | Privacidad | Requisitos |
|---|---|---|---|
| **Mínimo** | Cifras agregadas ("3 de 11 personas del equipo tienen discapacidad") | Alta | Confirmación del negocio |
| **Medio** | Roles y categorías generales, sin identificar a nadie | Media | Confirmación del negocio; evitar datos que identifiquen a una persona en equipos muy pequeños |
| **Máximo** | Historias con nombre/foto | Baja | **Consentimiento explícito, informado y revocable de cada persona**; ver §11 |

Cada negocio elige su nivel y puede cambiarlo o retirarse cuando quiera.

### 8.4 `Suggestion`

Propuestas de alta o edición enviadas por la comunidad: `type` (new | edit), `payload`, `submittedBy` (opcional/anónimo), `evidence`, `status` (pending | approved | rejected), `moderatorNotes`, `createdAt`, `reviewedAt`.

### 8.5 `User`

`email`, `role` (`community` | `moderator` | `admin`), `moderationScope` (país/ciudad), `verificationScore`, `createdAt`. Mínimos datos personales posibles.

### 8.6 `AuditLog`

Registro de cambios en fichas y de acciones de moderación (quién, qué, cuándo). Importante para transparencia y para revertir vandalismo.

### Índices recomendados

- `location` → `2dsphere`.
- `slug` → único.
- `address.city`, `address.country`, `cuisineTypes`, `inclusionTypes`, `status` → compuestos según filtros habituales.
- Texto sobre `name` / `description` para búsqueda básica.

---

## 9. Especificación preliminar de la API

Base: `/api/v1`. Formato: JSON. Paginación con `limit` y `cursor`/`page`. Errores con estructura uniforme `{ error: { code, message, details } }`.

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| GET | `/restaurants` | Lista con filtros: `bbox`, `near`, `cuisine`, `inclusion`, `city`, `q`, `verification` | No |
| GET | `/restaurants/:slug` | Detalle con equipo | No |
| GET | `/restaurants/geojson` | FeatureCollection para pintar el mapa (ligero) | No |
| POST | `/suggestions` | Proponer nuevo local o edición | Opcional (rate limit) |
| GET | `/suggestions` | Cola de moderación | Moderador |
| PATCH | `/suggestions/:id` | Aprobar / rechazar | Moderador |
| POST | `/restaurants/:id/verifications` | Registrar una verificación | Moderador / verificador |
| GET | `/meta/filters` | Catálogos (cocinas, tipos de inclusión, zonas) | No |
| POST | `/auth/magic-link` | Solicitar acceso | No |
| GET | `/health` | Estado del servicio | No |

**Principios:** versionado desde el inicio, sin datos personales en la lectura pública, caché HTTP en listados, límites de tasa en endpoints de escritura, honeypot/captcha ligero en el formulario de sugerencia.

---

## 10. Verificación y confianza

El valor del proyecto depende de que lo que dice el mapa sea verdad. Modelo de **confianza distribuida con curación comunitaria**:

| Nivel | Insignia | Significado |
|---|---|---|
| **Verificado por admin/moderador** | 🟢 | Visita presencial, llamada o documentación contrastada |
| **Confirmado por la comunidad** | 🟡 | Varias personas independientes han confirmado, o el propio negocio lo ha confirmado con evidencia |
| **Sin verificar** | ⚪ | Propuesto, pendiente de revisión |

**Métodos de verificación (por orden de solidez):** visita presencial → confirmación directa del negocio (llamada/email al dominio oficial) → documentación (convenios con centros especiales de empleo, certificaciones, noticias o comunicados oficiales) → referencias de entidades del sector.

**Cada ficha muestra siempre:** nivel, método y fecha de la última verificación. Las fichas con verificación antigua se marcan para revisión (p. ej. >12 meses).

**Estrategia de escala:** Marlon verifica manualmente los primeros 15–20 locales de Madrid → se incorporan moderadores locales por ciudad/país → los verificadores de confianza pueden pre-aprobar. Para expansión internacional, la alianza con asociaciones locales es clave: ellas conocen a los negocios de su zona.

**Regla de exclusión de cadenas:** criterio objetivo en la guía de moderación (p. ej. negocio independiente o proyecto social; no franquicias ni grandes grupos de restauración). Documentar los casos límite (cooperativas, franquicias sociales, etc.).

---

## 11. Privacidad, legal y ética

Este apartado es **crítico**: el proyecto maneja información sobre personas con discapacidad.

1. **RGPD (UE).** Los datos de salud/discapacidad son **categoría especial de datos personales (art. 9 RGPD)**. Aunque la ficha hable de "el equipo" de forma agregada, cualquier dato que identifique a una persona (nombre, foto, historia) exige **consentimiento explícito, informado, libre y revocable**. En el nivel máximo, el consentimiento lo da cada persona (o su representante legal si procede), no solo el dueño del negocio.
2. **Minimización.** Preferir siempre datos agregados. En equipos muy pequeños, los datos "agregados" pueden identificar a alguien: valorar umbrales mínimos o redacción más general.
3. **Derecho de retirada.** Procedimiento claro y rápido para eliminar una historia, foto o ficha completa.
4. **Lenguaje respetuoso.** Evitar enfoques paternalistas, de "pena" o de "inspiración". El mensaje es: buen servicio y empleo de calidad. Usar terminología aceptada y consultar a personas y entidades del sector. Co-diseñar la narrativa con ellas.
5. **Consentimiento del negocio.** Un negocio no debería aparecer con detalle de su plantilla sin su conocimiento. Para fichas propuestas por terceros, mostrar solo información pública verificable hasta que el negocio confirme.
6. **Política de privacidad, aviso legal y cookies** antes del lanzamiento. Analítica respetuosa (p. ej. Plausible/Umami autoalojado) o ninguna.
7. **Licencias.** Código: AGPL-3.0 (propuesto). Datos: ODbL o CC BY-SA 4.0, compatible con la filosofía de datos abiertos. Si se usan datos de OpenStreetMap, respetar ODbL y la atribución.
8. **Marca.** `hearteats.com` está registrado pero **estacionado y en venta** (nameservers de Afternic), sin sitio activo. Eso reduce el riesgo, pero no lo elimina: antes del lanzamiento conviene buscar "HeartEats" en las bases de datos de marcas (OEPM, EUIPO, WIPO) y valorar registrar la marca cuando exista la asociación.
9. **Asesoría.** Antes de abrir al público, revisar con un profesional (o con apoyo de una entidad del sector) los textos legales y el procedimiento de consentimientos.

---

## 12. Mapas: proveedores y límites

- **Leaflet** es la librería (gratuita, ligera). Las **teselas** (la imagen del mapa) son un servicio aparte.
- **No usar los servidores de teselas de OpenStreetMap (`tile.openstreetmap.org`) para producción**: su política de uso lo restringe y no está pensado para aplicaciones con tráfico real.
- Opciones a evaluar (P3): **MapTiler** y **Stadia Maps** (planes gratuitos con límites, requieren atribución y, según el caso, clave API), **OpenFreeMap** (gratuito), **Protomaps** (PMTiles autoalojadas, coste casi nulo a escala pequeña).
- **Geocodificación** (dirección → coordenadas) en el formulario: el servidor público de Nominatim tiene límites estrictos (≈1 petición/segundo, sin uso intensivo). Evaluar Photon o el geocoder del proveedor de teselas (P4).
- **Clustering** imprescindible cuando haya muchos puntos; cargar solo lo visible (por `bbox`) cuando el volumen crezca.
- **Accesibilidad del mapa:** los mapas son poco accesibles por defecto. Ofrecer siempre **vista de lista** equivalente, foco por teclado en marcadores y descripciones legibles por lector de pantalla.
- **Migración futura:** MapLibre GL (vectorial, más fluido, mejores animaciones) si el MVP lo justifica.

---

## 13. Diseño UI/UX

**Regla de oro: el diseño se valida antes de escribir código de producto.**

### Herramienta

Prototipos con la herramienta de **artifacts de Claude** (HTML/CSS interactivo, iterable en tiempo real). Si más adelante se suma una persona diseñadora, se puede portar a Figma.

### Pantallas del MVP a diseñar

1. **Mapa principal:** marcadores, clustering, buscador, panel de filtros, tarjeta de vista previa.
2. **Ficha de restaurante:** cabecera, "El Equipo" (3 niveles), horarios, contacto, insignia y fecha de verificación, botón "Sugerir corrección".
3. **Formulario de sugerencia:** datos básicos, nivel de información del equipo, evidencias, consentimientos.
4. **Filtros y búsqueda** (móvil y escritorio).
5. **Vista de lista** (alternativa accesible al mapa).
6. **Páginas de contenido:** Sobre el proyecto, Cómo verificamos, Para restaurantes, Privacidad.
7. **Panel de moderación** (versión mínima).

### Principios

- **Mobile-first**: la mayoría usará el móvil, en la calle.
- **Accesibilidad AA** desde el primer prototipo (contraste, tamaños táctiles, teclado, lectores).
- **Dignidad y calidez**: fotos de platos y del local al mismo nivel que el mensaje social; el restaurante se elige por ser bueno, y además es inclusivo.
- **Transparencia visible**: la insignia y la fecha de verificación siempre a la vista.
- **Identidad**: corazón + tenedor/cuchillo como motivo; paleta cálida; tipografía legible (valorar fuentes pensadas para dislexia o alta legibilidad).

### Criterios de aprobación del diseño (gate)

- [ ] Flujos principales recorridos de principio a fin (descubrir → ver ficha → sugerir)
- [ ] Revisión de accesibilidad básica
- [ ] Revisión del lenguaje y la narrativa (idealmente con alguien del sector)
- [ ] Aprobación de Marlon
- [ ] Especificación de datos y API alineadas con las pantallas

---

## 14. Metodología de trabajo

### Reparto de herramientas

| Qué | Dónde |
|---|---|
| Especificaciones y decisiones | `docs/` en el repo (versionado) |
| Prototipos de diseño | Artifacts de Claude → luego exportados a `docs/` o a un directorio de prototipos |
| Tareas | GitHub Issues + tablero de Proyectos |
| Cambios de código | Ramas + Pull Requests con revisión |
| Decisiones rápidas | Chat con Claude |
| Decisiones relevantes | ADR (`docs/adr/`) breve: contexto, decisión, consecuencias |

### Flujo

```
Especificación (docs) → Diseño (prototipo) → Validación (gate)
      → Issues → Rama → PR → Revisión → Merge a main → Despliegue automático
```

### Convenciones

- Rama principal `main` protegida; trabajo en ramas `feat/…`, `fix/…`, `docs/…`.
- Commits claros (convencionales recomendado).
- Cada PR enlaza su issue y actualiza la documentación si cambia algo relevante.
- Idioma: documentación en español (con versión en inglés cuando se abra a la comunidad internacional); código y nombres de variables en inglés.

---

## 15. Hoja de ruta

### Fase 0 — Definición y diseño *(sin código de producto)*
- [ ] Crear el repo `heart-eats` con estructura y plantillas
- [ ] Redactar `01_ESPECIFICACION_DATOS.md`
- [ ] Redactar `02_API_SPEC.md`
- [ ] Prototipar las pantallas en artifacts e iterar
- [ ] Decidir P1–P9 (§3)
- [ ] Redactar guía de verificación y borrador de consentimientos
- [ ] **Gate:** especificación + API + diseño aprobados

### Fase 1 — Backend
- [ ] Express + Mongoose + conexión a Atlas
- [ ] Modelos, validación y endpoints de lectura
- [ ] Endpoint de sugerencias y moderación
- [ ] Autenticación mínima
- [ ] Datos semilla (ficticios, claramente marcados como tales)
- [ ] Tests y CI

### Fase 2 — Frontend
- [ ] Next.js en modo export + estilos + i18n
- [ ] Mapa con Leaflet, clustering y filtros
- [ ] Ficha de restaurante y vista de lista
- [ ] Formulario de sugerencia
- [ ] Accesibilidad y responsive

### Fase 3 — Integración y despliegue
- [ ] Conectar frontend ↔ API
- [ ] PWA
- [ ] Despliegue en Netlify + backend
- [ ] Pruebas con usuarios reales (incluyendo personas con discapacidad)

### Fase 4 — Datos reales y lanzamiento
- [ ] Identificar y verificar 15–20 negocios en Madrid (contacto, visita, consentimientos)
- [ ] Beta privada con esos negocios
- [ ] Lanzamiento público
- [ ] Abrir contribuciones (verificadores, desarrolladores, donaciones)
- [ ] Constituir la asociación (P6) y explorar financiación

> Las duraciones dependen del tiempo disponible; las estimaciones iniciales (2–3 semanas de MVP técnico) son optimistas y deben recalcularse al cerrar el diseño.

---

## 16. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Datos falsos o "inclusion-washing" | Pérdida de credibilidad | Niveles de verificación visibles, evidencias obligatorias, auditoría, marcado de fichas antiguas |
| Tratamiento indebido de datos de discapacidad | Legal y reputacional | Datos agregados por defecto, consentimiento explícito y revocable, asesoría legal |
| Enfoque paternalista en la comunicación | Rechazo de la comunidad | Co-diseñar con personas y entidades del sector; revisión de lenguaje |
| Cuello de botella en la verificación | Crecimiento lento | Moderadores locales, alianzas con asociaciones, métodos a distancia |
| Costes de mapas/hosting al crecer | Sostenibilidad | Proveedores con plan gratuito, PMTiles autoalojadas, caché, donaciones |
| Límite del plan gratuito del backend ("sleep") | Mala experiencia | Elegir hosting adecuado (P1), caché en el frontend, health-check |
| Vandalismo/spam en sugerencias | Carga de moderación | Rate limiting, captcha ligero, cola de moderación, registro de auditoría |
| Dependencia de una sola persona | Continuidad | Documentación, ADRs, abrir contribuciones pronto, asociación |
| Conflicto de marca | Cambio de nombre costoso | Búsqueda en OEPM/EUIPO antes de lanzar |
| Accesibilidad deficiente en una app sobre inclusión | Contradicción con el propósito | WCAG 2.2 AA como criterio de aceptación; pruebas con usuarios |

---

## 17. Correcciones a información previa

Durante la conversación de planificación se dieron algunas afirmaciones que conviene rectificar:

1. **Railway no tiene un plan gratuito permanente.** Ofrece crédito de prueba y después un plan de pago (orientativamente desde ~5 $/mes). Por eso el hosting del backend queda como decisión pendiente (P1). Render y Fly.io tienen opciones gratuitas con limitaciones (p. ej. el servicio se "duerme" tras un periodo de inactividad). Verificar los precios actuales antes de decidir.
2. **`next export` ya no es un comando** en versiones recientes de Next.js; la exportación estática se configura con `output: 'export'` y se genera con `next build`.
3. **Las teselas de OpenStreetMap no deben usarse en producción** directamente (ver §12).
4. **React Native no está "discontinuado"** ni en riesgo inmediato; se afirmó con más rotundidad de la justificada. El motivo real para posponer la app nativa es el coste de mantenimiento, no el estado de la tecnología. Se reevaluará más adelante (React Native o Flutter) con datos de uso.
5. **El riesgo de marca de `hearteats.com` no es "cero".** Está estacionado y en venta, lo que es buena señal, pero no sustituye una búsqueda en registros de marcas.
6. **Figma:** no hay acceso a Figma desde las herramientas de Claude; el diseño se hace con artifacts.
7. **El repo en GitHub** no se crea automáticamente: se crea con la cuenta de Marlon (o desde la sesión de código con la carpeta conectada).

---

## 18. Primeros pasos en la sesión de código

Orden recomendado para arrancar:

1. **Conectar la carpeta de trabajo** del ordenador de Marlon (p. ej. `~/Projects/heart-eats`) a la sesión de código.
2. **Crear el repo en GitHub** (`marlonbdez/heart-eats`, público) y clonarlo; añadir `LICENSE` (AGPL-3.0), `README.md`, `.gitignore`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`.
3. **Crear la estructura `docs/`** con las plantillas listadas en §6 y copiar este documento como `docs/00_HANDOFF.md`.
4. **Redactar `01_ESPECIFICACION_DATOS.md`** a partir de §8 y revisarlo con Marlon.
5. **Redactar `02_API_SPEC.md`** a partir de §9.
6. **Prototipar el diseño** (mapa, ficha, formulario) en artifacts; iterar con feedback.
7. **Resolver P1–P5** y registrar cada decisión como ADR.
8. **Pasar el gate de la Fase 0**, y solo entonces crear los Issues de la Fase 1 e iniciar el código.
9. En paralelo, y sin esperar al código: **empezar a listar candidatos** de restaurantes en Madrid y a contactar con entidades del sector (centros especiales de empleo, asociaciones de discapacidad, empresas de inserción).

### Prompt sugerido para iniciar la sesión de código

> Lee `HEARTEATS_HANDOFF.md`. Estamos en la Fase 0 del proyecto HeartEats. Empieza creando la estructura del repositorio y la carpeta `docs/` con las plantillas descritas, y después redacta `01_ESPECIFICACION_DATOS.md` a partir del modelo de datos del borrador. No escribas código de producto hasta que el diseño y las especificaciones estén aprobados. Pregúntame antes de tomar cualquier decisión de las marcadas como pendientes (P1–P9).

---

## 19. Glosario

- **ADR:** Architecture Decision Record. Nota breve que documenta una decisión técnica y su motivo.
- **Atlas M0:** plan gratuito de MongoDB Atlas (512 MB).
- **Bounding box (bbox):** rectángulo geográfico visible en el mapa; sirve para pedir solo los puntos de esa zona.
- **Clustering:** agrupar marcadores cercanos en uno solo al alejar el zoom.
- **GeoJSON:** formato estándar para datos geográficos en JSON.
- **Monorepo:** un único repositorio con varios proyectos independientes.
- **PMTiles:** formato de teselas en un solo archivo, autoalojable.
- **PWA:** Progressive Web App; web instalable con experiencia casi nativa.
- **RGPD:** Reglamento General de Protección de Datos de la UE.
- **SPA:** Single Page Application.
- **SSR / SSG:** renderizado en servidor / generación estática de páginas.
- **Teselas (tiles):** imágenes o datos vectoriales que componen el mapa de fondo.
- **WCAG 2.2 AA:** nivel de conformidad de accesibilidad web que se fija como objetivo.

---

*Fin del documento. Mantener este archivo actualizado como `docs/00_HANDOFF.md` y registrar los cambios de decisión en `docs/adr/`.*
