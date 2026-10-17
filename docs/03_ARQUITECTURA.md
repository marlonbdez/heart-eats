# 03 · Arquitectura

> **Estado:** borrador v0.2 · Decisiones: ADR 0001 (licencias), 0002 (mapa), 0003 (idiomas y rutas), 0005 (hosting), 0006 (geocodificación), 0007 (autenticación), 0008 (moderación inicial). Contexto original: `00_HANDOFF.md` §5, que este documento sustituye en lo que cambió.

## Visión general

```
┌─────────────────────────┐                        ┌──────────────────────────┐
│ Navegador (móvil)       │   teselas y estilos    │ OpenFreeMap              │
│ Web estática Next.js    │ ─────────────────────► │ (mapa, ADR 0002)         │
│ + MapLibre              │                        └──────────────────────────┘
└───────┬─────────────────┘
        │ HTML/JS/CSS                      HTTPS + JSON (api.hearteats.org)
        ▼                                          │
┌─────────────────────────┐                        ▼
│ Netlify                 │                ┌──────────────────────────┐
│ hearteats.org (estática)│                │ API Express (Railway, UE) │
└─────────────────────────┘                └───┬──────────┬───────┬───┘
                                               │          │       │
                       Mongoose                ▼          ▼       ▼
                                  ┌────────────────┐ ┌─────────┐ ┌────────────┐
                                  │ MongoDB Atlas  │ │ R2      │ │ Resend     │
                                  │ M0 (UE)        │ │ fotos   │ │ enlaces y  │
                                  └────────────────┘ └─────────┘ │ avisos     │
                                                                 └────────────┘
                              Nominatim (geocodificación, solo desde el servidor)
```

- **La web no cambia de arquitectura:** sigue siendo estática y solo habla con el servidor a través de `web/src/lib/data/`, desde el navegador (`NEXT_PUBLIC_API_URL`, fijada al compilar). Las fichas (`/place/<slug>`) no se generan al compilar: una reescritura de Netlify (`netlify.toml`, y `web/serve.json` en las pruebas) sirve una sola página para cualquier slug y esta pide el local a la API. Por eso la ficha no lleva el nombre del local en el HTML inicial; el título se pone al cargar.
- **La lectura pública** se hace desde el navegador, por zona del mapa o ciudad (ADR 0005), y no se recompila la web al publicar. No hay ningún dato de locales fijo en la web.
- **El servidor** es el único que escribe en la base de datos, envía correo y llama a Nominatim. Cuando existan las fotos, también firmará las subidas.
- Cómo está desplegado hoy, con sus variables, secretos y flujos, está en `14_PRODUCCION.md`.

## Componentes

| Componente | Dónde | Responsabilidad |
|---|---|---|
| Web | Netlify (`web/`) | Pantallas, formularios, validación en el navegador, reducción de fotos |
| API | Railway (`server/`) | Validación, solicitudes, moderación, publicación, auditoría, límite de envíos |
| Base de datos | MongoDB Atlas M0 | `Restaurant`, `Team`, `Suggestion`, `User`, `AuditLog`, sesiones y tokens |
| Copias y, más adelante, fotos | Cloudflare R2 | Hoy, copias cifradas (`backups/`). Previsto para las fotos: cuarentena (`q/`) y público (`p/`), con URLs firmadas por el servidor |
| Correo saliente | Resend | Enlaces mágicos, «Info pedida», avisos de resolución |
| Correo entrante | ImprovMX | `contact@hearteats.org` (solo recepción, `09_CORREO.md`) |
| Mapa | OpenFreeMap | Teselas y estilos |
| Direcciones | Nominatim | Coordenadas de un local nuevo, en moderación |

## Estructura de `server/`

```
server/
├─ src/
│  ├─ app.ts            # Express: Helmet, CORS, límites, rutas
│  ├─ server.ts         # arranque y conexión a Mongo
│  ├─ config/           # variables de entorno validadas con Zod
│  ├─ models/           # Mongoose (restaurant, team, suggestion, user, audit-log…)
│  ├─ routes/           # una por área: restaurants, submissions, auth, moderation…
│  ├─ services/         # geocoding, mail, storage (R2), moderation, publish
│  └─ middleware/       # sesión, roles, límite de envíos, errores
├─ seed/                # datos de ejemplo (los de la web), marcados [DEMO]
└─ tests/               # Vitest + Supertest, con MongoDB en memoria
```

Los tipos de intercambio (`Restaurant`, `*Input`, `ModerationItem`, `ModerationDecision`…) hoy viven en `web/src/lib/types.ts`. Pasan a `shared/types` cuando el servidor los necesite, y la web los importa de allí; mientras no haga falta, no se mueve nada.

## Flujo de una propuesta con servidor

1. El formulario valida (y, cuando existan las fotos, las reduce, pide URLs a `POST /uploads` y las sube a la cuarentena).
2. `POST /proposals`: honeypot, validación, límite por IP; se guarda la solicitud (`pending`) con sus avisos automáticos y se registra en la auditoría.
3. Moderación entra con enlace mágico, abre la solicitud (primera vez: geocodificación) y revisa.
4. Decide: aprobar publica la ficha y mueve las fotos; rechazar o pedir información avisan a quien propuso, si dejó correo.
5. Cada decisión deja una línea en `AuditLog` con la persona que la tomó.

## Datos personales en el servidor

| Dato | Dónde | Visible para | Se borra |
|---|---|---|---|
| Correo de quien envía | `Suggestion.contactEmail` | Moderación (enmascarado en la cola) | Al resolver o en el plazo de la política ❓ |
| Historias de personas | `Team.stories` | Administración; público solo con consentimiento y confirmación del negocio | Al retirarlas, en el plazo de la política ❓ |
| Correo de moderadores | `User.email` | Administración | Al darse de baja |
| IP | Contador temporal del límite de envíos | Nadie | Horas |

Detalle y bases legales: `08_PRIVACIDAD_LEGAL.md`.

## Entornos

- **Producción:** `hearteats.org` (Netlify) + `api.hearteats.org` (Railway) + Atlas M0.
- **Local:** `npm run dev` en `web/` y en `server/`, con MongoDB en local o un clúster de pruebas, y `.env` fuera del repo.
- **PRs:** Netlify genera una vista previa de la web; la vista previa usa la API de producción solo en lectura hasta que se acuerde otra cosa; para que el navegador la deje leer, `CORS_ORIGINS` del servidor tiene que incluir ese origen (❓ pendiente: comodín para las vistas previas). ❓ Entorno de pruebas del servidor.

## CI

La CI (`.github/workflows/ci.yml`) cubre `server/` (lint, tipos, pruebas con MongoDB en memoria, build) y `web/` (lint, tipos, build, prueba de humo). La copia semanal es otro flujo programado (`.github/workflows/backup.yml`, `13_COPIAS.md`).

## Preguntas abiertas

1. ❓ Un único entorno de producción, sin staging, mientras sea beta privada.
2. ❓ Si `shared/types` se publica como paquete o se importa por ruta relativa (monorepo con `npm workspaces`, ver nota del handoff §6).
3. ❓ Registro y alertas del servidor (los registros de Railway conservan 7 días; valorar un aviso de caída gratuito).
