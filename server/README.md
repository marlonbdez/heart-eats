# Servidor de HeartEats

API en Node.js + Express (TypeScript). Hoy es solo el esqueleto: arranque, configuración, validación, errores uniformes y `GET /api/v1/health`. Los endpoints, la base de datos (MongoDB) y la moderación llegan en las siguientes PRs (ver `docs/05_ROADMAP.md`, fase 3).

Los endpoints previstos están en [`docs/02_API_SPEC.md`](../docs/02_API_SPEC.md) y la arquitectura en [`docs/03_ARQUITECTURA.md`](../docs/03_ARQUITECTURA.md).

## Comandos

Desde `server/` (Node.js 22 o superior):

```bash
npm install
cp .env.example .env   # variables para desarrollo local
npm run dev            # recarga al guardar; http://localhost:3001/api/v1/health
npm run lint
npm run typecheck
npm test               # Vitest + Supertest
npm run build          # genera dist/
npm start              # arranca dist/server.js
```

## Variables de entorno

Se validan al arrancar con Zod (`src/config/env.ts`); si alguna está mal, el servidor no arranca y dice cuál.

| Variable | Defecto | Para qué |
|---|---|---|
| `NODE_ENV` | `development` | `development`, `test` o `production` |
| `PORT` | `3001` | Puerto de escucha (el hosting lo fija en producción) |
| `CORS_ORIGINS` | `http://localhost:3000` | Orígenes de la web autorizados, separados por comas |

`.env` no se sube al repo.

## Estructura

```
src/
├─ app.ts          # Express: Helmet, CORS, límite de cuerpo (32 KB), rutas y errores
├─ server.ts       # arranque y cierre ordenado
├─ config/env.ts   # variables de entorno validadas
├─ errors.ts       # ApiError: { error: { code, message, details } }
├─ validation.ts   # parseOrThrow(schema, datos): 422 con los campos que fallan
├─ middleware/     # 404 y gestor de errores
└─ routes/         # una por área; todo cuelga de /api/v1
tests/             # pruebas con Vitest + Supertest
seed/              # datos de ejemplo (llegan con la lectura)
```

## Reglas

- Ni correos, ni cuerpos de petición, ni datos de personas en los registros (logs).
- Las respuestas de error no repiten lo que envió el cliente.
- Un código de error estable en inglés (`validation_failed`, `not_found`…); el mensaje no está pensado para mostrarse.
