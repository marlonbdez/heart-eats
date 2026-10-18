# Servidor de HeartEats

API en Node.js + Express + MongoDB (TypeScript). Todo cuelga de `/api/v1`. Hace esto:

- **Lectura pública:** `GET /restaurants`, `/restaurants/geojson`, `/restaurants/:slug`, `/meta/filters` y `/health`.
- **Envíos de la comunidad, sin cuenta:** `POST /proposals`, `/corrections`, `/removals` y `/teams`, con honeypot y límite por IP.
- **Entrada de moderación** por enlace mágico: `/auth/magic-link`, `/auth/session`, `/auth/me`, `/auth/logout`.
- **Moderación:** la cola (`GET /suggestions`, `/suggestions/:id`) y las decisiones (`POST /suggestions/:id/decision`): rechazar, pedir información y aprobar un local nuevo, una corrección, una retirada o el equipo de un negocio. El detalle de un local nuevo lo geocodifica con Nominatim la primera vez que se abre.
- **Respuesta a «Info pedida»:** `GET` y `POST /replies/:token`.
- **Administración (solo `admin`):** `GET /audit` y `/users` (altas y bajas de moderadores).
- **Mantenimiento automático** dentro del propio proceso, cada hora (plazos de conservación y cierre de solicitudes sin respuesta).

Todavía no hay fotos (`POST /uploads`). Cómo está desplegado, qué variables y secretos usa y qué hacer si algo falla: [`docs/14_PRODUCCION.md`](../docs/14_PRODUCCION.md). El estado y lo que queda: `docs/05_ROADMAP.md`.

Los endpoints previstos están en [`docs/02_API_SPEC.md`](../docs/02_API_SPEC.md) y la arquitectura en [`docs/03_ARQUITECTURA.md`](../docs/03_ARQUITECTURA.md).

## Comandos

Desde `server/` (Node.js 22 o superior):

```bash
npm install
cp .env.example .env   # variables para desarrollo local
npm run dev            # recarga al guardar; http://localhost:3001/api/v1/health
npm run lint
npm run typecheck
npm run seed           # carga los 6 locales [DEMO] (borra y recrea solo los isDemo)
npm run seed -- --clear  # quita los [DEMO] sin recrearlos (pide confirmación; --yes la salta)
npm run seed:stress -- --per-city 15  # cientos de locales ficticios por el mundo, para probar la carga (se quitan con --clear)
npm run test:unit      # pruebas sin base de datos (rápidas)
npm test               # todas; las de base de datos usan MongoDB en memoria
npm run build          # genera dist/
npm start              # arranca dist/server.js
```

## Variables de entorno

Se validan al arrancar con Zod (`src/config/env.ts`); si alguna está mal, el servidor no arranca y dice cuál.

| Variable                                       | Defecto                                                                                          | Para qué                                                                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                     | `development`                                                                                    | `development`, `test` o `production`                                                                                                  |
| `PORT`                                         | `3001`                                                                                           | Puerto de escucha (el hosting lo fija en producción)                                                                                  |
| `CORS_ORIGINS`                                 | `http://localhost:3000`                                                                          | Orígenes de la web autorizados, separados por comas                                                                                   |
| `MONGODB_URI`                                  | `mongodb://127.0.0.1:27017/hearteats` (solo fuera de producción)                                 | Conexión a MongoDB; en producción es obligatoria (Atlas)                                                                              |
| `TRUST_PROXY`                                  | `0`                                                                                              | Saltos de proxy delante del servidor (Railway: `1`), para ver la IP real en el límite de envíos                                       |
| `SUBMISSIONS_PER_HOUR` / `SUBMISSIONS_PER_DAY` | `100` / `1000`                                                                                   | Tope de envíos guardados por IP (propuesta, sin cerrar); `0` lo desactiva. En local el `.env.example` lo trae a `0`                   |
| `WEB_URL`                                      | `http://localhost:3000`                                                                          | Dirección pública de la web: los enlaces de acceso del correo apuntan aquí                                                            |
| `NOMINATIM_URL` / `GEOCODER_USER_AGENT`        | instancia pública de OpenStreetMap / `HeartEats (+https://hearteats.org; contact@hearteats.org)` | Geocodificación de locales propuestos (ADR 0006). Sin claves; el `User-Agent` identifica el proyecto, como piden sus condiciones      |
| `ADMIN_EMAIL`                                  | vacío                                                                                            | Correo del primer administrador; se da de alta al arrancar (ADR 0008). No se escribe en el repo                                       |
| `RESEND_API_KEY`                               | vacío                                                                                            | Clave de Resend para enviar los enlaces de acceso; obligatoria en producción. Sin ella, en desarrollo se escriben en la consola       |
| `REPLY_TOKEN_SECRET`                           | vacío                                                                                            | Secreto (mín. 32 caracteres) que firma los enlaces de «Info pedida»; obligatorio en producción. Sin él, cada arranque usa uno al azar |
| `MAIL_FROM` / `MAIL_REPLY_TO`                  | `HeartEats <acceso@mail.hearteats.org>` / `contact@hearteats.org`                                | Remitente (subdominio propio, ADR 0007) y dirección a la que responden                                                                |
| `KNOWN_CHAINS`                                 | vacío                                                                                            | Nombres de grandes cadenas, separados por comas, para el aviso `chain`. Es configuración: no se escriben en el repo                   |

**En producción hay que poner a mano** `MONGODB_URI`, `RESEND_API_KEY`, `REPLY_TOKEN_SECRET` (por ejemplo, `openssl rand -hex 32`) y `ADMIN_EMAIL`, y además `WEB_URL` (`https://hearteats.org`), `CORS_ORIGINS` y `TRUST_PROXY=1`. Si falta una de las tres primeras, el servidor no arranca y el despliegue falla: el motivo está en los registros del despliegue.

`.env` no se sube al repo.

## Estructura

```
src/
├─ app.ts          # Express: Helmet, CORS, límite de cuerpo (32 KB), rutas y errores
├─ server.ts       # arranque y cierre ordenado
├─ config/env.ts   # variables de entorno validadas
├─ db.ts           # conexión a MongoDB
├─ catalog.ts      # catálogos controlados (comidas, tipos, niveles…)
├─ errors.ts       # ApiError: { error: { code, message, details } }
├─ validation.ts   # parseOrThrow(schema, datos): 422 con los campos que fallan
├─ models/         # Mongoose: Restaurant, Team, Suggestion (la solicitud) y, para moderar, User, LoginToken, Session y AuditLog
├─ services/       # lógica sin Express: filtros, forma pública, privacidad del equipo
├─ middleware/     # 404, gestor de errores, tope por IP (en memoria) y sesión de moderación
└─ routes/         # una por área; todo cuelga de /api/v1 (submission.ts: flujo común de los envíos)
tests/             # Vitest + Supertest; *.int.test.ts usan MongoDB en memoria
seed/              # restaurants.json (6 locales [DEMO]), stress-data.ts (generador mundial) y los scripts que los cargan
```

## Reglas

- Ni correos, ni cuerpos de petición, ni datos de personas en los registros (logs).
- Las respuestas de error no repiten lo que envió el cliente.
- Lo que no se debe ver no sale de la API: la privacidad del equipo (nivel, umbral de plantilla, consentimiento y retiradas) se aplica en `services/team-privacy.ts`, no en la web.
- Los envíos de la comunidad no publican nada: crean una `Suggestion` en `pending`. Solo se guarda lo que el esquema de Zod conoce (lo demás se descarta, también cualquier dato de personas del equipo) y el correo va aparte del contenido, nunca por la lectura pública.
- Honeypot (`website` relleno): respuesta `202` igual y no se guarda nada. La IP vive solo en los contadores en memoria del tope de envíos, unas horas. Ese tope, único para todas las rutas de envío, solo cuenta los envíos válidos: uno con errores o el del honeypot no gasta cupo.
- Moderación entra sin contraseña (ADR 0007): el token del enlace caduca a los 15 minutos, sirve una vez y solo se guarda su hash. La sesión vive en Mongo, caduca a los 7 días sin actividad y viaja en la cookie `he_session` (`HttpOnly`, `Secure` en producción, `SameSite=Strict`). Las escrituras con sesión exigen el `Origin` de la web y la cabecera `X-Requested-With`. `/auth/magic-link` responde siempre `202`, exista o no el correo, y no envía a quien no puede moderar.
- Las decisiones se escriben con la sesión y dejan una línea en `AuditLog` (estado antes y después y motivo; nunca el correo ni textos libres). Rechazar y aprobar borran el correo de quien envió; aprobar un local nuevo (`level`, `method`, `ownerConfirmed: true`, `location?`, `businessType?`) publica la ficha y avisa por correo a quien propuso. Equipo y retiradas solo los decide un admin (`403` a un moderador). «Pedir información» envía un enlace firmado con HMAC (`REPLY_TOKEN_SECRET`), válido 30 días (más 3 de margen); si el correo falla, la solicitud vuelve a pendiente. Quien propuso responde con `GET/POST /replies/:token` (sin sesión; el enlace sirve una vez y la solicitud vuelve a `pending` con la respuesta). Sin respuesta pasados el plazo y el margen, `services/close-expired.ts` (al arrancar y cada hora) la cierra como `rejected` / `no_reply`, borra el correo y deja una línea `auto_close` sin actor. Ese mismo trabajo horario (`services/maintenance.ts`) borra el contenido de las historias retiradas pasados 21 días y el correo de las solicitudes de más de 270 días (`services/retention.ts`; plazos provisionales).
- La cola de moderación solo enseña lo del ámbito de quien la mira y nunca el correo entero (`services/mask-email.ts`); fuera de ámbito, `404`.
- Los locales nunca se piden «todos»: hace falta una zona (`bbox`, `near`, `country` o `city`).
- Un código de error estable en inglés (`validation_failed`, `not_found`…); el mensaje no está pensado para mostrarse.
