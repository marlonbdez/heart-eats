# 02 · API — Especificación

> **Estado:** borrador v0.2 · Base: las funciones de `web/src/lib/data/index.ts` (la frontera con el backend), los tipos de `web/src/lib/types.ts` y `01_ESPECIFICACION_DATOS.md`. Decisiones: ADR 0005 (hosting), 0006 (geocodificación), 0007 (autenticación) y 0008 (moderación). Los puntos con ❓ están abiertos.

## Convenciones

- **Base:** `https://api.hearteats.org/api/v1`. JSON en UTF-8.
- **Errores:** `{ "error": { "code": "validation_failed", "message": "…", "details": [] } }`. `code` estable y en inglés; `message` no está pensado para mostrarse.
- **Estados:** `200` lectura, `201`/`202` creación, `204` sin contenido, `400` petición mal formada, `401` sin sesión, `403` sin permiso, `404`, `409` conflicto de estado, `422` validación, `429` demasiadas peticiones, `5xx` servidor.
- **Validación:** Zod en cada ruta; el servidor no confía en lo que valida la web. Cuerpo máximo de 32 KB.
- **Idioma de los datos:** `LocalizedText` (`{ es, en }`); si falta el idioma pedido, `es` (ADR 0003).
- **Paginación:** los listados admiten `limit` y `cursor`. Los locales **nunca se sirven «todos»**: se piden por zona visible (`bbox`), por cercanía (`near`) o por país y ciudad, para que la API aguante tantos locales como haya en el mundo.
- **Caché:** lecturas públicas con `Cache-Control: public, max-age=60` y `ETag`. La web redondea el `bbox` a una cuadrícula para que muchas visitas compartan la misma respuesta en caché.
- **Privacidad:** la lectura pública nunca lleva correos, `contactEmail`, notas de moderación ni datos de quien propone.
- **Idioma de las respuestas:** `Accept-Language` no se usa; la web decide el idioma y manda `locale` cuando hace falta escribir a alguien.

## Lectura pública (sin autenticación)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/restaurants` | Locales con `status = published`, paginados. Filtros: `bbox` (`oeste,sur,este,norte`), `near` (`lat,lng`, ordena por distancia), `country` (ISO 3166-1 alpha-2), `city`, `q` (nombre, barrio, ciudad, código postal), `food` (claves de `foodTag`, separadas por comas, OR), `limit` (máx. 100) y `cursor`. Sin ningún filtro de zona, `400 zone_required`; `bbox` y `near` a la vez, `400 invalid_zone`. Devuelve `{ items: Restaurant[], nextCursor? }`, **sin `team`** (el equipo va solo en la ficha). Con `near` el orden es por distancia; si no, por `slug`. `cursor` es opaco |
| GET | `/restaurants/geojson` | Lo mínimo para pintar el mapa: un punto por local (`slug`, `name`, `foodTags`, coordenadas), con los mismos filtros. Devuelve un `FeatureCollection` de GeoJSON y `truncated`. Máx. 1.000 puntos por respuesta; si hay más, `truncated: true` y la web acerca el mapa |
| GET | `/restaurants/:slug` | Una ficha, con su equipo según el nivel de visibilidad. `404` si no existe o no está publicada |
| GET | `/meta/filters` | Catálogos: `foodTags` (clave e icono), `cuisineTypes`, `businessTypes`, `inclusionTypes` |
| GET | `/health` | `{ "status": "ok" }`; no toca la base de datos |

**Reglas de lectura**
- Solo se sirven los locales publicados y con verificación `community` o `admin` (`07_VERIFICACION.md`).
- El detalle del equipo (áreas, tipos, historias) solo sale si `ownerConfirmedAt` existe y se supera el umbral de plantilla (`01_ESPECIFICACION_DATOS.md` §2.2). El servidor lo aplica; la web no tiene que adivinarlo.
- `needsReview` se calcula (verificación de más de 12 meses).
- Una historia con `revokedAt` no se sirve nunca.

## Envíos de la comunidad (sin cuenta)

Cada envío crea una solicitud (`Suggestion`) en estado `pending`. Ninguno publica nada.

| Método | Ruta | Cuerpo | `type` de la solicitud | Sustituye a |
|---|---|---|---|---|
| POST | `/proposals` | `ProposalInput` | `new` | `submitProposal` |
| POST | `/corrections` | `CorrectionInput` | `edit` | `submitCorrection` |
| POST | `/teams` | `BusinessTeamInput` | `team` | `submitBusinessTeam` |
| POST | `/removals` | `RemovalInput` | `removal` | `submitRemoval` |

**Cuerpos.** Son los tipos `*Input` de `lib/types.ts` con dos diferencias: las fotos (`Blob`) se sustituyen por `photoKey` (por plato) o `photoKeys` (hasta 3, en el equipo), que son las claves que devuelve `/uploads`; y se admite `locale` (`es`/`en`) para escribir a quien propone en su idioma.

**Respuesta.** `202` con `{ "id": "…", "status": "pending" }`.

**Correcciones y retiradas** (`/corrections`, `/removals`) apuntan a un local por `restaurantSlug`. Si no existe o aún no está publicado, `404 not_found` (no se distingue lo uno de lo otro). La corrección admite `kind` (`address`, `hours`, `closed`, `team`, `other`), `details` (obligatorio, ≤1000), `evidenceUrl` y `contactEmail` opcionales. La retirada admite `what` (`story`, `photo`, `listing`, `data`) y `details` opcional (sin datos de salud ni nombres de terceros), y **exige `contactEmail`**: Moderación escribe a esa dirección para confirmar quién la pide antes de ocultar nada. Ninguna de las dos cambia la ficha por sí sola.

**Trampa y límites**
- `website` relleno (honeypot): el servidor responde `202` igual y **no guarda nada**.
- Tope por IP (contador temporal en memoria, sin guardar la IP en la solicitud): ❓ propuesta, 30 envíos guardados por hora y 200 al día (`SUBMISSIONS_PER_HOUR` / `SUBMISSIONS_PER_DAY`; `0` lo desactiva). Es un tope contra inundaciones, no un freno para personas: las defensas reales son el honeypot y que nada se publica sin revisión humana. Solo cuenta los envíos válidos (uno con errores o el del honeypot no gasta cupo) y es un único contador para todas las rutas de envío. `429` con `Retry-After`.
- Una historia sin `consentBy` se rechaza (`422`): nunca se guarda sin consentimiento registrado.
- Se descartan en servidor nombres de personas del equipo en `proposals` (`07_VERIFICACION.md`): la propuesta de un tercero no admite datos de personas.

**Filtro automático** (al crear, deja `warnings` en la solicitud): `noEvidence` (sin `evidenceUrl`), `chain` (nombre en una lista de cadenas conocidas, que es configuración del servidor — `KNOWN_CHAINS` — y no vive en el repo) y `duplicate` (mismo nombre o dirección normalizados, en la misma ciudad y frente a locales y propuestas pendientes; la distancia en metros se calcula tras geocodificar, ADR 0006).

### Subida de fotos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/uploads` | `{ "contentType": "image/webp", "size": 183204 }` → `{ "key": "q/…", "uploadUrl": "…", "expiresAt": "…" }`. El navegador hace `PUT` de la foto a `uploadUrl` y manda `key` en el envío |

- Tipos permitidos: `image/webp`, `image/jpeg`. Tamaño máximo 1 MB (la web ya reduce a 1200 px por lado y quita metadatos).
- Las fotos quedan en **cuarentena** (prefijo `q/`). Una foto no referenciada por ninguna solicitud en 24 h se borra. Solo pasan a público cuando Moderación aprueba la solicitud que las usa.
- Límite de URLs firmadas por IP, aparte del de envíos.

### Responder a «Info pedida»

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/replies/:token` | Comprueba el enlace del correo. Devuelve la nota de Moderación y el plazo. `404` si el enlace caducó o ya se usó |
| POST | `/replies/:token` | `{ "message": "…" }`. Añade la respuesta a la **misma** solicitud, que vuelve a `pending`. El token se invalida |

El token es un HMAC firmado que identifica la solicitud y caduca con el plazo de 14 días (ADR 0007). Si no hay respuesta en 14 días, un proceso programado cierra la solicitud como `rejected` con motivo «sin respuesta» y deja una línea en la auditoría.

**Internacional desde el primer día.** Nada de España está fijo en el servidor: ni la zona inicial, ni el formato de dirección, ni los barrios. Los locales llevan país (ISO), región y ciudad; la zona inicial del mapa es configuración por región (ADR 0003) y el catálogo de comidas es global. Madrid es solo la primera ciudad con datos. Los índices son `2dsphere` sobre `location` y `{status, address.country, address.city}` (`01_ESPECIFICACION_DATOS.md`).

## Autenticación (moderación)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/magic-link` | `{ "email": "…", "locale": "es" }`. Siempre `202`, exista o no el usuario |
| POST | `/auth/session` | `{ "token": "…" }` (el del fragmento del enlace). Crea la sesión y fija la cookie `he_session`. `401` si el token es inválido, caducó o ya se usó |
| GET | `/auth/me` | `{ "email", "role", "moderationScope" }` o `401` |
| POST | `/auth/logout` | Cierra la sesión (`204`) |

Detalle de caducidades, cookie y protecciones: ADR 0007.

## Moderación (requiere sesión)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/suggestions` | moderator, admin | Cola. Filtros: `status` (`pending`, `info_requested`, `resolved`), `type`, `limit`, `cursor`. Devuelve `ModerationItem[]` (correo siempre enmascarado) |
| GET | `/suggestions/:id` | moderator, admin | Detalle. Para `new`, la primera apertura geocodifica y guarda el pin (ADR 0006) |
| POST | `/suggestions/:id/decision` | ver abajo | Cuerpo: `ModerationDecision`. Registra la decisión y deja una línea en `AuditLog` |
| GET | `/audit` | admin | Registro de auditoría, con `entity`, `entityId`, `limit`, `cursor` |
| GET | `/users` · POST `/users` · DELETE `/users/:id` | admin | Alta por invitación y baja de moderadores (ADR 0008) |

**Decisión**

- `approve`: en un local nuevo exige `level` y `method`, y acepta un `location` opcional (`{lat,lng}`) para colocar el pin a mano. Si no hay pin ni geocodificación válida, `422 geocoding_required`. Publica la ficha, mueve las fotos aprobadas a público y envía correo a quien propuso, si dejó uno.
- `reject`: exige `reason` (`not_independent`, `no_evidence`, `duplicate`, `out_of_zone`, `other`) y admite `note`.
- `ask_info`: exige `note` y que la solicitud tenga correo; si no, `409 no_contact`. La solicitud pasa a `info_requested`, con plazo de 14 días, y se envía el enlace de respuesta.
- Una solicitud ya resuelta no admite otra decisión (`409 already_resolved`).
- `team` y `removal` solo los decide un `admin` (ADR 0008); un `moderator` recibe `403`.
- Una **retirada** aprobada oculta lo pedido al momento (la historia deja de servirse) y programa el borrado definitivo en el plazo de la política (❓ 7 días).
- Fuera del ámbito del usuario (`moderationScope`), `403`.

## Modelo de la solicitud (resumen)

Ampliación de `Suggestion` (`01_ESPECIFICACION_DATOS.md` §2.3) con lo que necesita la API: `warnings[]`, `geocode?` (`{lat,lng,provider,at}`), `photoKeys[]`, `infoRequest?`, `infoDeadline?`, `replies[]` (respuestas de quien propuso), `locale`, `contactEmail?` (privado; se borra al resolver o en el plazo de la política, ❓ máx. 6 meses).

## Seguridad

- Helmet, CORS solo con `https://hearteats.org` y credenciales; `Origin` comprobado en escrituras.
- Cookie `HttpOnly; Secure; SameSite=Strict`; sin tokens en `localStorage`.
- Límite de envíos y de solicitudes de enlace; token de un solo uso con hash en base de datos.
- Registro (logs) sin cuerpos de petición, sin correos completos y sin IP más allá de lo que conserva el proveedor.
- Dependencias fijadas y revisión de vulnerabilidades en CI.

## Preguntas abiertas

1. ❓ Cómo revisa Moderación el **contenido** de las historias antes de publicarlas (CU-22): hoy solo ve cuántas hay. Con servidor, el administrador necesita verlas; hay que decidir dónde, con qué registro de acceso y si se cifran en reposo.
2. ❓ Límites exactos de envíos por IP.
3. ❓ Plazo de borrado del correo y de las historias retiradas (`08_PRIVACIDAD_LEGAL.md`).
4. ❓ Si la API pública de datos abiertos (ODbL) se expone aparte, con su propio formato.
