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
| GET | `/restaurants` | Locales con `status = published`, paginados. Filtros: `bbox` (`oeste,sur,este,norte`), `near` (`lat,lng`, ordena por distancia), `country` (ISO 3166-1 alpha-2), `city`, `q` (nombre, barrio, ciudad, código postal), `food` (claves de `foodTag`, separadas por comas, OR), `limit` (máx. 100) y `cursor`. Sin ningún filtro de zona, `400 zone_required`; `bbox` y `near` a la vez, `400 invalid_zone`. Devuelve `{ items: Restaurant[], nextCursor? }`, **sin `team`** (el equipo va solo en la ficha) y con solo la portada en `photos`. Con `near` el orden es por distancia; si no, por `slug`. `cursor` es opaco |
| GET | `/restaurants/geojson` | Lo mínimo para pintar el mapa: un punto por local (`slug`, `name`, `foodTags`, coordenadas), con los mismos filtros. Devuelve un `FeatureCollection` de GeoJSON y `truncated`. Máx. 1.000 puntos por respuesta; si hay más, `truncated: true` y la web acerca el mapa |
| GET | `/restaurants/:slug` | Una ficha, con su equipo según el nivel de visibilidad y todas sus `photos` (`[{ url, thumbUrl, alt? }]`; la primera es la portada; las direcciones salen de `API_URL`). Un plato con foto subida lleva `photoUrl` y `thumbUrl`. Toda ficha (y la lista) lleva `timezone` (IANA, p. ej. `Europe/Madrid`): sale de las coordenadas del pin, no se guarda, y es la zona en la que se leen `openingHours`. `404` si no existe o no está publicada |
| GET | `/regions` | Dónde hay locales publicados, para el selector de zona: `{ countries: [{ code, count, bbox, cities: [{ key, name, names?, count, bbox, center }] }] }`. `code` es ISO 3166-1 alpha-2; `key` es la ciudad sin acentos ni mayúsculas (sirve como `city` en `/restaurants`); `name` está como se guarda (idioma local) y `names`, si se conoce, es `{ es, en }` con el nombre en cada idioma de la web (si falta, se usa `name`); `bbox` es `{ west, south, east, north }`. Solo salen zonas con algún local publicado y verificado. Ordenado por número de locales. Un país que cruza el antimeridiano devuelve un `bbox` que lo abarca todo |
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

**Cuerpos.** Son los tipos `*Input` de `lib/types.ts` con dos diferencias: las fotos (`Blob`) se sustituyen por `photoKey` (por plato) o `photoKeys` (hasta 5 del local en una propuesta; hasta 3 en el equipo, una por historia en `stories[].photoKey`), que son las claves que devuelve `/uploads`. Al guardar el envío se **reclaman** la foto y su miniatura: tienen que existir, ser de menos de 24 h, no usarse en otro envío y no repetirse (`422 photo_unavailable` / `photo_repeated`; si el envío falla, se sueltan); y se admite `locale` (`es`/`en`) para escribir a quien propone en su idioma.

**País y pin de una propuesta.** `ProposalInput` admite `country` (código de dos letras, ISO 3166-1) y `location` (`{lat,lng}`, el pin que quien propone coloca en el mapa). Ambos son opcionales mientras la web antigua siga en circulación; con `country`, la propuesta se reparte por país y ciudad y la dirección se busca dentro de ese país. Moderación sigue pudiendo mover el pin.

**Precio y carta.** `ProposalInput` admite `priceRange` (`1`, `2` o `3`: €, €€ o €€€) y `menuUrl` (enlace `https` a la carta del propio local), ambos opcionales. Se guardan en la propuesta, los ve Moderación y se publican con la ficha. Toda ficha que los tenga los devuelve (`GET /restaurants` y `GET /restaurants/:slug`); si no, no llevan la clave.

**Accesibilidad del local.** `ProposalInput` admite `accessibility`: lista de claves del catálogo (`step_free_entrance`, `accessible_restroom`, `room_to_move`, `easy_read_menu`, `large_print_menu`, `quiet_space`, `sign_language`; una desconocida da `422`). Se devuelve sin repetidos y en ese orden; una ficha sin datos no lleva la clave.

**Respuesta.** `202` con `{ "id": "…", "status": "pending" }`.

**Correcciones, equipos y retiradas** (`/corrections`, `/teams`, `/removals`) apuntan a un local por `restaurantSlug`. Si no existe o aún no está publicado, `404 not_found` (no se distingue lo uno de lo otro). La corrección admite `kind` (`address`, `hours`, `closed`, `team`, `other`), `details` (obligatorio, ≤1000), `evidenceUrl` y `contactEmail` opcionales. La retirada admite `what` (`story`, `photo`, `listing`, `data`) y `details` opcional (sin datos de salud ni nombres de terceros), y **exige `contactEmail`**: Moderación escribe a esa dirección para confirmar quién la pide antes de ocultar nada. El equipo admite `level` (`minimal`, `medium`, `full`), `summary` (`totalStaff` ≥ 1 y `staffWithDisability` ≤ `totalStaff`), `areas`, `disabilityTypes`, hasta 3 `stories` (`displayName`, `role`, `storyText` y `consentBy`, obligatorio) y **exige `contactEmail`**: Moderación escribe al negocio para confirmar que es quien dice ser. Cada nivel guarda solo lo suyo (el medio, áreas y tipos; el completo, además las historias); la foto de cada historia (`photoKey`, opcional) se sube antes con `/uploads` y se reclama con el envío; solo se reclama si el nivel guarda historias. Ninguna de las tres cambia la ficha por sí sola.

**Trampa y límites**
- `website` relleno (honeypot): el servidor responde `202` igual y **no guarda nada**.
- Tope por IP (contador temporal en memoria, sin guardar la IP en la solicitud): ❓ propuesta holgada (una asociación o una biblioteca comparten IP), 100 envíos guardados por hora y 1000 al día (`SUBMISSIONS_PER_HOUR` / `SUBMISSIONS_PER_DAY`; `0` lo desactiva). Es un tope contra inundaciones, no un freno para personas: las defensas reales son el honeypot y que nada se publica sin revisión humana. Solo cuenta los envíos válidos (uno con errores o el del honeypot no gasta cupo) y es un único contador para todas las rutas de envío. `429` con `Retry-After`.
- Una historia sin `consentBy` se rechaza (`422`): nunca se guarda sin consentimiento registrado.
- Se descartan en servidor nombres de personas del equipo en `proposals` (`07_VERIFICACION.md`): la propuesta de un tercero no admite datos de personas.

**Filtro automático** (al crear, deja `warnings` en la solicitud): `noEvidence` (sin `evidenceUrl`), `chain` (nombre en una lista de cadenas conocidas, que es configuración del servidor — `KNOWN_CHAINS` — y no vive en el repo) y `duplicate` (mismo nombre o dirección normalizados, en la misma ciudad y frente a locales y propuestas pendientes; la distancia en metros se calcula tras geocodificar, ADR 0006).

### Subida de fotos

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/uploads` | El cuerpo es la foto tal cual, con `Content-Type: image/webp` o `image/jpeg`. `201` con `{ "key": "q/….webp" }`; esa clave se manda en el envío (`photoKey` o `photoKeys`) |
| POST | `/uploads?thumbOf=<id>` | Lo mismo, pero es la **miniatura** de la foto `q/<id>.…` ya subida. Se guarda como `q/<id>-thumb.…` |
| GET | `/photos/:file` | Una foto o miniatura **aprobada** (`<id>.webp`, `<id>-thumb.webp`). Solo lee `p/`; `Cache-Control: public, max-age=31536000, immutable` |

- El servidor recibe la foto (no hay URL firmada): así comprueba que **los bytes son de verdad WebP o JPEG** y no solo lo que dice la cabecera. Un archivo que no lo es da `422 invalid_image`; otro tipo o sin cuerpo, `415`; más de **1 MB**, `413` (la web ya reduce la foto a 1600 px por el lado largo y quita metadatos). La **miniatura** (400 px) pesa como máximo **100 KB**, tiene que ser del mismo formato que su foto, y la foto tiene que existir, estar sin usar y ser de menos de 24 h (`422 photo_not_found`); solo hay una por foto (`409 thumb_exists`). No gasta cupo: ya lo gastó su foto.
- Sin almacén configurado (`R2_*`), `503 uploads_unavailable`.
- Las fotos quedan en **cuarentena** (prefijo `q/` de un bucket privado). Una foto que ninguna solicitud reclama en **24 h** se borra (tarea de mantenimiento). Solo pasan a público cuando Moderación aprueba la solicitud que las usa: se copian a `p/` (foto y miniatura) y se borran de `q/`. Si se rechaza o se cierra sola, se borran de `q/`. Si el almacén falla al borrar, la foto vuelve a «sin usar» y la limpieza de cada hora la borra al pasar el plazo.
- `GET /suggestions/:id/photos/:file` (con sesión y dentro del ámbito) enseña a Moderación las fotos de una solicitud sin resolver; la solicitud las lista en `photos` (`key`, `url`, `thumbUrl` y, si es de un plato, `dish`).
- Tope por IP, aparte del de envíos (`UPLOADS_PER_HOUR` 60 y `UPLOADS_PER_DAY` 300; `0` lo desactiva). Solo cuenta las fotos válidas. `429` con `Retry-After`.

### Fotos de un local publicado (Moderación)

Con sesión, dentro del ámbito de quien modera (fuera de él, `404`, como si no existiera). Lo que sube Moderación se publica directo, sin segunda revisión.

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/restaurants/:slug/photos` | `{ photoKey, alt?, cover? }`: la clave y su miniatura ya subidas con `/uploads`. `alt` es `{ es?, en? }` (≤160 cada uno, al menos uno). `cover: true` la pone de portada. `201` con `{ url, thumbUrl, alt? }`. Máximo 12 fotos por ficha (`422 too_many_photos`); `503` sin almacén; `502` si falla al copiar |
| PUT | `/restaurants/:slug/photos/:file` | `{ alt?, cover? }`: cambia el texto alternativo (`alt: null` lo borra) o la pasa a portada. `204` |
| DELETE | `/restaurants/:slug/photos/:file` | Retira una foto de la galería o la de un plato (`file` = `<id>.webp`). Se borran del almacén foto y miniatura **antes** de tocar la ficha: si el almacén falla, nada cambia y se puede reintentar. `204` |

La auditoría anota `add_photo`, `update_photo` y `remove_photo` con quién lo hizo y cuántas, nunca el nombre del archivo ni el texto alternativo. Una petición de retirar una foto (`removal` con `what: photo`) se atiende con este mismo borrado, desde «Fotos»: la solicitud solo se marca como atendida.

### Responder a «Info pedida»

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/replies/:token` | Comprueba el enlace del correo. Devuelve `{ name, note, deadline, locale }` (nunca el correo). `404` si el enlace caducó, ya se usó o la solicitud se cerró: no se distingue |
| POST | `/replies/:token` | `{ "message": "…" }` (1–2000 caracteres). Añade la respuesta a la **misma** solicitud, que vuelve a `pending`, y responde `201 { "status": "received" }`. El token se invalida (`422` si el mensaje no vale, y entonces el enlace sigue valiendo) |

El token es un HMAC firmado que identifica la solicitud y se invalida al usarlo (ADR 0007). El plazo es de **30 días**, y el enlace sigue valiendo **3 días más** de margen de cortesía, que el correo no menciona. Pasado ese margen, un proceso del servidor (al arrancar y cada hora) cierra la solicitud como `rejected` con motivo `no_reply`, borra `contactEmail` y deja una línea `auto_close` en la auditoría, sin actor (`resolution.decidedBy` vacío). Si Moderación pide información otra vez, el enlace anterior deja de valer.

**Internacional desde el primer día.** Nada de España está fijo en el servidor: ni la zona inicial, ni el formato de dirección, ni los barrios. Los locales llevan país (ISO), región y ciudad; la zona inicial del mapa es configuración por región (ADR 0003) y el catálogo de comidas es global. Madrid es solo la primera ciudad con datos. Los índices son `2dsphere` sobre `location` y `{status, address.country, address.city}` (`01_ESPECIFICACION_DATOS.md`).

## Autenticación (moderación)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/auth/magic-link` | `{ "email": "…", "locale": "es" }`. Siempre `202`, exista o no el usuario |
| POST | `/auth/session` | `{ "token": "…" }` (el del fragmento del enlace). Crea la sesión y fija la cookie `he_session`. `401` si el token es inválido, caducó o ya se usó |
| GET | `/auth/me` | `{ "email", "role", "moderationScope" }` o `401` |
| POST | `/auth/logout` | Cierra la sesión (`204`) |

Detalle de caducidades, cookie y protecciones: ADR 0007. En el servidor:

- `POST /auth/magic-link` solo envía el enlace si el correo es de un `moderator` o `admin` sin baja, y como mucho 5 enlaces vivos por persona. Tope por IP: 20 solicitudes por hora (`429`).
- El enlace es `<WEB_URL>/<idioma>/moderation/login#token=…` (la página `/moderation/login` de la web cambia el token por la sesión y lo quita de la dirección).
- `POST /auth/session`: `422` si el token no tiene la forma esperada; `401 invalid_token` si no existe, caducó, ya se usó o el usuario ya no puede moderar. Devuelve lo mismo que `/auth/me`.
- Las respuestas de `/auth/*` llevan `Cache-Control: no-store`.
- Toda escritura con sesión (de momento `POST /auth/logout`, luego las decisiones) exige el `Origin` de la web y la cabecera `X-Requested-With` (cualquier valor); si no, `403 forbidden`. Sin sesión válida, `401 unauthorized`.
- `POST /auth/logout` es idempotente: `204` aunque la sesión ya no exista.
- El primer administrador se da de alta al arrancar con `ADMIN_EMAIL`. Cada inicio de sesión deja una línea `login` en `AuditLog`.

## Moderación (requiere sesión)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/suggestions` | moderator, admin | Cola. Filtros: `status` (`pending`, `info_requested`, `resolved`), `type`, `limit`, `cursor`. Devuelve `ModerationItem[]` (correo siempre enmascarado) |
| GET | `/suggestions/:id` | moderator, admin | Detalle. Para `new`, la primera apertura geocodificará y guardará el pin (ADR 0006; llega con las decisiones) |
| POST | `/suggestions/:id/decision` | ver abajo | Cuerpo: `ModerationDecision`. Registra la decisión y deja una línea en `AuditLog`. Hoy: `reject`, `ask_info` y `approve` de un local nuevo, una corrección, una retirada (ficha, historia, foto o datos) o un equipo |
| GET | `/audit` | admin | Registro de auditoría, con `entity`, `entityId`, `limit`, `cursor` (ver abajo) |
| GET | `/retired` · POST `/retired/listings/:id/restore` | admin | Lo retirado que espera su borrado y devolver una ficha retirada por error |
| GET | `/users` · POST `/users` · DELETE `/users/:id` | admin | Alta por invitación y baja de moderadores (ADR 0008) |

**Cola y detalle (ya en el servidor)**

- `GET /suggestions` → `{ items, nextCursor? }`. `status` por defecto `pending`; `resolved` agrupa `approved` y `rejected`. `type` ∈ `new`, `edit`, `team`, `removal`. `limit` 1–50 (20 por defecto). Lo pendiente va de la más antigua a la más reciente (se atiende por orden de llegada); lo resuelto, al revés. Cursor opaco; uno roto da `422`.
- Cada elemento sigue `ModerationItem` de la web, más `infoRequest?` (`{note, deadline}`) y `replies?` (`{message, at}[]`) cuando hubo «Info pedida», con dos diferencias: `type` en lugar de `kind` (`edit` ↔ `correction`) y `createdAt` (ISO) en lugar de `daysAgo`. El correo sale siempre enmascarado (`a***@dominio`); el entero no se expone por ninguna ruta.
- Solo se ve lo de tu **ámbito** (`moderationScope`): las propuestas por país y ciudad (las anteriores a pedir el país, solo por ciudad) y el resto por el local al que apuntan. Un ámbito vacío no ve nada. Un `admin` ve y decide en **todas las regiones**, sea cual sea su ámbito guardado (que solo sirve como país de reserva al aprobar un pin puesto a mano).
- `GET /suggestions/:id`: la misma forma. Para un equipo, un `admin` recibe además `team.storyTexts` (`displayName`, `role`, `storyText`, `consentBy`): es el único sitio donde salen nombres y textos antes de decidir; la lista y quien modera sin ser `admin` ven solo cuántas hay (`team.stories`). Una vez resuelta, ya no quedan. `404` si no existe, el id no es válido o está fuera del ámbito (no se distingue).
- `GET /audit` (solo `admin`; un moderador recibe `403`): de la línea más reciente a la más antigua. Filtros opcionales `entity` (`restaurant`, `team`, `suggestion`, `user`) y `entityId` (para ver el historial de una cosa); `limit` (1–200, por defecto 50) y `cursor` opaco con `nextCursor`, igual que la cola. Cada línea: `id`, `entity`, `entityId`, `action`, `at`, el cambio (`diff`, si lo hay) y quién lo hizo (`actorId` y su correo en `actor`; sin ellos, lo hizo el sistema, y si esa persona ya no existe falta `actor`). Las líneas nunca llevan nombres ni textos de historias ni el correo de quien envió algo: lo garantiza quien las escribe. Sin caché.
- `/retired` (solo `admin`; un moderador recibe `403`; las escrituras llevan el `Origin` de la web y `X-Requested-With`). Sin caché.
  - `GET /retired` → `{ listings, stories }`: lo retirado que aún no se ha borrado, lo más próximo a borrarse primero (hasta 200 de cada). Cada ficha: `id`, `slug`, `name`, `city`, `retiredAt` y `deleteAt` (`retiredAt` + 30 días). Cada historia: `restaurantSlug`, `restaurantName`, `index` (su posición), `revokedAt` y `deleteAt`. De una historia nunca salen el nombre, el puesto, el texto ni la foto (ni se leen de la base de datos). Solo cuenta lo archivado con `retiredAt`: lo archivado por cierre del local no aparece.
  - `POST /retired/listings/:id/restore` → `204`. La ficha vuelve a `published` y pierde `retiredAt`, así que deja de contar el plazo. Auditoría `restore` con quién lo hizo. `404 not_found` si el id no es válido, la ficha no está retirada (publicada, o archivada por cierre) o ya la borró el trabajo horario. No hay «restaurar» para las historias: retirar una historia es retirar el consentimiento.
- `/users` (solo `admin`; un moderador recibe `403`, y las escrituras llevan el `Origin` de la web y `X-Requested-With`, como el resto). Sin caché. Cada elemento: `id`, `email`, `role`, `moderationScope` (`{country, city?}[]`), `createdAt` y `disabledAt` si está de baja.
  - `GET /users` → `{ items }`: moderadores y administradores, con las bajas, del más antiguo al más nuevo (hasta 200).
  - `POST /users` con `{ email, moderationScope }` (1–10 ámbitos; `country` de dos letras, `city` opcional) → `201` con el usuario. Siempre se crea como `moderator`: los administradores solo salen de `ADMIN_EMAIL`. No se envía ningún correo: la persona pide su enlace de acceso con su dirección (ADR 0007). `409 already_exists` si ya tiene acceso; si estaba de baja, se repone con el ámbito nuevo (`reinstate`).
  - `DELETE /users/:id` → `204`. Es una baja, no un borrado: pone `disabledAt`, cierra sus sesiones y sus enlaces sin usar, y sus acciones siguen en la auditoría. Idempotente. `404` si no existe, el id no es válido o no es de moderación; `409 cannot_remove_admin` para un administrador.
  - En el registro quedan `invite`, `reinstate` y `disable` (`entity: user`), con quién lo hizo y, en las altas, rol y ámbito; nunca el correo.
- **Geocodificación (ADR 0006).** La primera vez que se abre el detalle de un local nuevo con calle, y mientras esté `pending` o `info_requested`, el servidor consulta Nominatim (cola de una petición por segundo, `User-Agent` con contacto) y guarda el resultado en la solicitud: no se repite. El detalle trae `location: {lat, lng}` (el pin) y, si hay un local publicado o pendiente a menos de 50 m, un aviso `duplicate` con `meters` (si ya había uno por nombre o dirección, se le añade la distancia). Sin resultado, `location` no viene y el pin se coloca a mano. Si Nominatim falla, la solicitud se ve igual sin pin y se reintenta en la próxima apertura. El detalle de un local nuevo trae también `country` (el que dio quien propone; las antiguas no lo llevan). Si quien propone puso el pin en el mapa (`location`), ese es el pin (`locationBy: proposer`; `address` si sale de la dirección): no se consulta nada, no hace falta calle y el aviso de duplicado por distancia se calcula igual. Sin pin ni calle no se geocodifica. La cola (`GET /suggestions`) nunca geocodifica.
- Las respuestas llevan `Cache-Control: no-store`.

**Decisión**

- `approve` (un local nuevo, una corrección, una retirada o un equipo). Lo que lleva el cuerpo depende del tipo. **Local nuevo**: exige `level` (`community` o `admin`), `method` y `ownerConfirmed: true` (el negocio da siempre el último sí; se guarda como `ownerConfirmedAt`). Acepta `businessType` (por defecto `restaurant`) y un `location` opcional (`{lat,lng}`) que manda sobre la geocodificación. Publica la ficha con `lastVerifiedAt` en la fecha de la decisión; el `slug` sale del nombre y la ciudad (con un número si ya existe); el país, de la geocodificación, del que dio quien propone o, si el pin es a mano y no hay ninguno, del ámbito de quien aprueba si es uno solo. Cierra la solicitud con `resolution.restaurantId`, deja dos líneas en `AuditLog` (`approve` de la solicitud y `create` de la ficha, con nivel y método) y avisa a quien propuso si dejó correo.
  - Errores: `422 validation_failed` (falta `level`, `method` o `ownerConfirmed`, o no valen); `422 geocoding_required` (sin pin ni geocodificación: se geocodifica en ese momento si no se había abierto); `422 country_required` (pin a mano, sin país geocodificado y ámbito de varios países); `422 proposal_incomplete` (a la propuesta le falta la calle o una categoría de comida: se pide a quien propuso con `ask_info`).
  - Primero se crea la ficha y después se cierra la solicitud: si crear la ficha falla, la solicitud no cambia; si otra persona decide en el mismo instante, `409 conflict` y se deshace la ficha. Si el aviso por correo falla, la ficha sigue publicada y solo se anota el fallo (sin la dirección).
  - **Fotos**: las del local y las de los platos pasan a `p/` antes de crear la ficha (si el almacén falla, `502 photo_store_failed` y nada cambia; si no hay almacén, `503 uploads_unavailable`). `skipPhotos` (lista de claves `q/…`) deja fuera las que Moderación no quiere publicar: se borran. La ficha guarda solo los nombres de archivo (`photos[]` y `signatureDishes[].photo`); la auditoría anota cuántas se publican y cuántas se dejan fuera, nunca las claves.
  - **Corrección** (`edit`): lo que cuenta quien la envía es texto libre, así que quien aprueba escribe el cambio ya comprobado. Admite `name`, `address` (`street`, `city`, `postalCode`; basta uno), `location` (`{lat,lng}`), `openingHours` (`[{day 0–6, open, close}]`, `HH:MM`), `priceRange` (`1`–`3`), `menuUrl` (`https`), `accessibility` (la lista completa: sustituye a la de la ficha, y `[]` la deja sin datos) y `closed: true` (el local cerró para siempre: la ficha pasa a `archived` y deja de verse). Hace falta al menos un campo (`422 validation_failed`). Si cambia la dirección y no viene `location`, se geocodifica la dirección ya corregida; si no se puede, `422 geocoding_required` y se coloca el pin a mano. La ficha se guarda con `save()`, que recalcula `cityKey` y el texto de búsqueda. No toca la verificación (`level`, `method`, `lastVerifiedAt`). Contacto, descripción y fotos se corrigen aún a mano: llegarán cuando haga falta. Si la ficha ya no está publicada, `409 target_unavailable`.
  - **Retirada** (`removal`, solo `admin`): exige `identityConfirmed: true` (Moderación ha confirmado por correo que quien la pide es la persona o su representante). `listing` archiva la ficha; `story` revoca una historia (`revokedAt`) y exige `storyIndex` (0–2, su posición en la ficha: `422 story_required`; si no existe o ya está retirada, `422 story_not_found`). `photo` y `data` no cambian ningún dato: la foto se retira antes desde «Fotos» (`DELETE /restaurants/:slug/photos/:file`, que borra el archivo al momento) y un derecho sobre datos personales se atiende a mano por correo; aprobar solo cierra la solicitud como atendida (`404`/`409` si la ficha ya no existe) y deja la auditoría `handle_removal` con el tipo, sin el texto de lo pedido. Lo retirado deja de servirse al momento; el contenido de una historia retirada y la ficha retirada (con su equipo y sus fotos) se borran pasado un plazo (ver «Conservación»).
  - **Equipo** (`team`, solo `admin`): exige `ownerConfirmed: true` (el negocio da siempre el último sí: Moderación ha comprobado por el correo que lo envía el negocio). Crea el `Team` del local o actualiza el que hay (nivel, cifras, áreas y tipos). Las historias nuevas se añaden detrás de las que ya había, también las retiradas, para que las posiciones no cambien (`storyIndex` de las retiradas), con el consentimiento (`consentBy`) y la fecha de cuando se enviaron. Si no caben (máximo 3 en total), `422 too_many_stories` y no cambia nada. Si la ficha ya no está publicada, `409 target_unavailable`. Las historias salen de la solicitud al aprobar, al rechazar y al cerrarse sola por falta de respuesta: solo estaban de paso hasta la decisión. La auditoría anota el nivel, las cifras y cuántas historias se añaden, nunca nombres ni textos. Las fotos del equipo no se mueven todavía: llegan con la siguiente PR de fotos. **Fotos de las personas**: pasan de `q/` a `p/` antes que la historia (si no hay almacén, `503 uploads_unavailable` y nada cambia; si guardar el equipo falla, se deshacen). `skipPhotos` (hasta 3 claves `q/…`) deja fuera las que no se quieren publicar: se borran y la historia sale sin foto. La historia guarda solo el nombre del archivo (`photo`); la ficha pública la sirve como `photoUrl`, que apunta a la miniatura de 400 px. La auditoría anota cuántas se publican y cuántas se dejan fuera, nunca nombres ni archivos. En el detalle, solo el administrador ve `team.storyTexts[].photo` (`key`, `url`, `thumbUrl`) y puede abrir esas fotos (`GET /suggestions/:id/photos/:file`); a un moderador le dan `404`. Al rechazar o cerrarse la solicitud, sus fotos se borran de la cuarentena.
  - **Orden y concurrencia** (corrección y retirada): primero se reclama la solicitud —solo una de las decisiones simultáneas lo consigue— y después se cambia la ficha; si el cambio falla, la solicitud vuelve a como estaba (con su correo). Deja dos líneas en `AuditLog`: `approve` de la solicitud y la de la ficha (`update` con el antes y el después de cada campo, `archive`) o la del equipo (`revoke_story`, solo con la posición, nunca el nombre ni el texto). Se borra el correo y no se envía aviso: quien pidió la retirada ya habló con Moderación por correo, y una corrección no promete respuesta.
- `reject`: exige `reason` (`not_independent`, `no_evidence`, `duplicate`, `out_of_zone`, `other`) y admite `note`.
- `ask_info`: exige `note` y que la solicitud tenga correo; si no, `409 no_contact`. La solicitud pasa a `info_requested`, con plazo de 30 días, y se envía el enlace de respuesta. Solo desde `pending` (`409 info_already_requested`). Si el correo no sale, `502 mail_failed` y la solicitud vuelve a `pending`.
- Una solicitud ya resuelta no admite otra decisión (`409 already_resolved`). `reject` también cierra una solicitud en `info_requested`. Si otra persona decide en el mismo instante, `409 conflict`.
- **Al rechazar o aprobar se borra `contactEmail`** y el enlace de respuesta deja de valer (requisito de `08_PRIVACIDAD_LEGAL.md`). La auditoría guarda el estado antes y después y el motivo, nunca el correo ni la nota.
- El enlace de respuesta es `<WEB_URL>/<idioma>/reply#token=…` (la página ya existe en la web: lee el token del fragmento y lo deja en la dirección, así que recargar no lo pierde). El token es un HMAC (`REPLY_TOKEN_SECRET`) que lleva la solicitud, el plazo y un `nonce` guardado en la solicitud; el correo incluye la nota de Moderación.
- `team` y `removal` solo los decide un `admin` (ADR 0008); un `moderator` recibe `403`.
- Una **retirada** aprobada oculta lo pedido al momento (la historia deja de servirse). El borrado de una historia retirada llega a los ❓ 30 días (ver «Conservación»); el de una ficha retirada queda pendiente.
- Fuera del ámbito del usuario (`moderationScope`), `404`, igual que en el detalle: no se distingue de una solicitud que no existe.

## Conservación (trabajo horario del servidor)

Sin ninguna llamada de por medio, el servidor repasa los plazos al arrancar y cada hora (`services/maintenance.ts`). Cada tarea falla por su cuenta y es segura con varias instancias a la vez. Todas dejan una línea en la auditoría sin actor (la hizo el sistema) y sin contenido ni correos.

- **Solicitudes sin respuesta:** se cierran como `rejected` / `no_reply` (ver «Responder a "Info pedida"»).
- **Historias retiradas:** pasados ❓ **30 días** desde `revokedAt`, se borran el nombre, el puesto, el texto y la foto (también del almacén, con su miniatura; sin almacén no se vacía una historia con foto, y si el almacén falla se reintenta a la hora siguiente). Se conserva el hueco (las posiciones no se mueven), el consentimiento y las fechas, con `purgedAt`. Auditoría: `purge_stories` con las posiciones.
- **Fichas retiradas:** al aprobar una retirada de ficha (`what: listing`) se archiva y se marca `retiredAt`. Pasados ❓ **30 días**, se borran la ficha, su equipo y sus fotos (las del local, las de los platos y las de las personas del equipo, con miniaturas) del almacén `p/`. Primero van las fotos y luego los documentos, así que un fallo del almacén deja la ficha para reintentar en la hora siguiente; sin almacén no se borra una ficha con fotos. No se tocan las fichas archivadas por cierre del local (sin `retiredAt`) ni las retiradas antes de que existiera el campo. Auditoría: `purge_listing`, sin actor y sin contenido.
- **Correo de las solicitudes:** pasados ❓ **270 días** (≈ 9 meses) desde que se envió, se borra el correo aunque la solicitud siga sin resolver. Auditoría: `purge_email`.

Los plazos son constantes en `services/retention.ts` y provisionales hasta la revisión legal. Las fotos de una historia retirada se borrarán del almacenamiento cuando existan (el equipo aún no las admite).

## Modelo de la solicitud (resumen)

Ampliación de `Suggestion` (`01_ESPECIFICACION_DATOS.md` §2.3) con lo que necesita la API: `warnings[]`, `geocode?` (`{lat,lng,provider,at}`), `photoKeys[]`, `infoRequest?`, `infoDeadline?`, `replies[]` (respuestas de quien propuso), `locale`, `contactEmail?` (privado; se borra al resolver o en el plazo de la política, ❓ máx. 6 meses).

## Seguridad

- Helmet, CORS solo con `https://hearteats.org` y credenciales; `Origin` comprobado en escrituras.
- Cookie `HttpOnly; Secure; SameSite=Strict`; sin tokens en `localStorage`.
- Límite de envíos y de solicitudes de enlace; token de un solo uso con hash en base de datos.
- Registro (logs) sin cuerpos de petición, sin correos completos y sin IP más allá de lo que conserva el proveedor.
- Dependencias fijadas y revisión de vulnerabilidades en CI.

## Preguntas abiertas

1. ❓ Cómo revisa Moderación el **contenido** de las historias antes de publicarlas (CU-22): un administrador las lee al abrir la solicitud (`team.storyTexts`) y desaparecen de ella al decidir. Falta decidir si hace falta un registro de quién las abre y si se cifran en reposo.
2. ❓ Límites exactos de envíos por IP.
3. ❓ Plazos de borrado del correo (270 días) y de las historias y fichas retiradas (30 días), provisionales hasta la revisión legal (`08_PRIVACIDAD_LEGAL.md`).
4. ✅ No hay API pública de datos abiertos: los datos de HeartEats no se ofrecen para descarga ni reutilización (ADR 0009). La API es la de la web.
