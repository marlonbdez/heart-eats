# Servidor de HeartEats

API en Node.js + Express + MongoDB (TypeScript). Hoy tiene la **lectura pública** (`GET /api/v1/restaurants`, `/restaurants/geojson`, `/restaurants/:slug`, `/meta/filters` y `/health`) y el envío de **propuestas de locales nuevos** (`POST /api/v1/proposals`). El resto de envíos, la moderación y el despliegue llegan en las siguientes PRs (ver `docs/05_ROADMAP.md`, fase 3).

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
npm run test:unit      # pruebas sin base de datos (rápidas)
npm test               # todas; las de base de datos usan MongoDB en memoria
npm run build          # genera dist/
npm start              # arranca dist/server.js
```

## Variables de entorno

Se validan al arrancar con Zod (`src/config/env.ts`); si alguna está mal, el servidor no arranca y dice cuál.

| Variable                                       | Defecto                                                          | Para qué                                                                                                            |
| ---------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                                     | `development`                                                    | `development`, `test` o `production`                                                                                |
| `PORT`                                         | `3001`                                                           | Puerto de escucha (el hosting lo fija en producción)                                                                |
| `CORS_ORIGINS`                                 | `http://localhost:3000`                                          | Orígenes de la web autorizados, separados por comas                                                                 |
| `MONGODB_URI`                                  | `mongodb://127.0.0.1:27017/hearteats` (solo fuera de producción) | Conexión a MongoDB; en producción es obligatoria (Atlas)                                                            |
| `TRUST_PROXY`                                  | `0`                                                              | Saltos de proxy delante del servidor (Railway: `1`), para ver la IP real en el límite de envíos                     |
| `SUBMISSIONS_PER_HOUR` / `SUBMISSIONS_PER_DAY` | `30` / `200`                                                     | Tope de envíos guardados por IP (propuesta, sin cerrar); `0` lo desactiva. En local el `.env.example` lo trae a `0` |
| `KNOWN_CHAINS`                                 | vacío                                                            | Nombres de grandes cadenas, separados por comas, para el aviso `chain`. Es configuración: no se escriben en el repo |

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
├─ models/         # Mongoose: Restaurant, Team y Suggestion (la solicitud de la comunidad)
├─ services/       # lógica sin Express: filtros, forma pública, privacidad del equipo
├─ middleware/     # 404, gestor de errores y tope de envíos por IP (en memoria)
└─ routes/         # una por área; todo cuelga de /api/v1
tests/             # Vitest + Supertest; *.int.test.ts usan MongoDB en memoria
seed/              # restaurants.json (6 locales [DEMO]) y el script que los carga
```

## Reglas

- Ni correos, ni cuerpos de petición, ni datos de personas en los registros (logs).
- Las respuestas de error no repiten lo que envió el cliente.
- Lo que no se debe ver no sale de la API: la privacidad del equipo (nivel, umbral de plantilla, consentimiento y retiradas) se aplica en `services/team-privacy.ts`, no en la web.
- Los envíos de la comunidad no publican nada: crean una `Suggestion` en `pending`. Solo se guarda lo que el esquema de Zod conoce (lo demás se descarta, también cualquier dato de personas del equipo) y el correo va aparte del contenido, nunca por la lectura pública.
- Honeypot (`website` relleno): respuesta `202` igual y no se guarda nada. La IP vive solo en los contadores en memoria del tope de envíos, unas horas. Ese tope solo cuenta lo que se guarda: un envío con errores o el del honeypot no gasta cupo.
- Los locales nunca se piden «todos»: hace falta una zona (`bbox`, `near`, `country` o `city`).
- Un código de error estable en inglés (`validation_failed`, `not_found`…); el mensaje no está pensado para mostrarse.
