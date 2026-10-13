# ADR 0005 · Hosting y pila del backend

- **Estado:** propuesta (se acepta al fusionar la PR)
- **Fecha:** 2026-10-13
- **Resuelve:** P1 (hosting del backend). Confirma la pila del handoff (§2): Node + Express + MongoDB.

## Contexto

La web ya está completa con datos simulados (`web/src/lib/data/`). El servidor debe caber en el presupuesto (~10 €/mes en total, ver `06_COSTES.md`) y sostener, al principio, una beta privada con 15–20 negocios de Madrid. El tráfico será bajo y las escrituras (propuestas, decisiones) más raras aún.

## Decisión

- **API:** Node.js 24 (LTS, como la web) + Express, en TypeScript. Validación con Zod, Helmet, CORS restringido a `hearteats.org`, límite de envíos por IP y pruebas con Vitest + Supertest.
- **Base de datos:** MongoDB Atlas, plan gratuito M0, en una región de la UE. Mongoose para los modelos (`01_ESPECIFICACION_DATOS.md`).
- **Hosting de la API:** Render, servicio web en la región de Fráncfort.
  - **Beta privada:** plan gratuito (0 €). Se duerme tras unos 15 minutos sin tráfico y la primera petición tarda del orden de un minuto en despertarlo.
  - **Apertura al público:** plan Starter (unos 7 $/mes), que no se duerme. También se puede pasar antes si el sueño estorba en la beta.
- **Dominio de la API:** `api.hearteats.org`. Al ser del mismo sitio que la web (`hearteats.org`), la cookie de sesión de moderación puede ser `SameSite=Strict` (ver ADR 0007).
- **Fotos:** Cloudflare R2, con subida por URL firmada que emite el propio servidor. Las fotos entran en un prefijo de cuarentena y solo se mueven al público cuando Moderación las aprueba.
- **Copias de seguridad:** M0 no incluye copias automáticas. Una acción programada de GitHub Actions hace `mongodump` semanal, cifrado, a un bucket privado de R2, y se conservan 4 semanas (los datos incluyen correos, ver `08_PRIVACIDAD_LEGAL.md`).

## Cómo llegan los datos a la web

Hoy la web es estática y genera las fichas al compilar. Con datos reales, lo más sencillo parecería recompilar la web al aprobar algo, pero **no es viable en el plan gratuito de Netlify**: son 300 créditos al mes y cada despliegue de producción gasta 15, es decir, unos 20 despliegues contando solo eso.

**Decisión:** la web **lee los locales desde el navegador** al abrir (`GET /api/v1/restaurants`, con caché HTTP corta) y no se recompila al publicar. Consecuencias para la web (PR de integración):

- `/place/[slug]` deja de generarse por local y pasa a una sola página que lee el `slug` y pide la ficha.
- Las listas y la ficha muestran un estado de carga mientras la API despierta.
- Los datos de ejemplo (`mock-restaurants.ts`) pasan a ser los datos semilla del servidor.

**Plan B si el sueño de Render molesta en la beta:** el servidor publica una copia JSON de los locales publicados en R2 (con caché de CDN) cada vez que cambia algo, y la web lee esa copia. Las lecturas no dependen de que la API esté despierta; las escrituras sí (un formulario que tarda en enviar es asumible). Si no basta, plan Starter.

## Alternativas descartadas

- **Railway:** sin plan gratuito permanente (handoff §17).
- **Fly.io:** sin plan gratuito para cuentas nuevas y más configuración.
- **Cloudflare Workers + D1:** no se duerme y costaría casi 0 €, pero obliga a cambiar Express y Mongo por una pila distinta; no hay motivo suficiente para reabrir la decisión del handoff.
- **PostgreSQL + PostGIS:** descartado en el handoff (§5); sigue valiendo.

## Riesgos

- **Cold start** de Render gratis: mitigado como arriba.
- **Atlas M0** (512 MB, sin copias, y puede pausar clústeres inactivos): copia semanal propia y comprobación en `06_COSTES.md`. Sobra para cientos de locales.
- **Los precios y límites cambian:** `06_COSTES.md` anota qué hay que verificar y cuándo.
- **Datos personales fuera del EEE:** Atlas, Render y R2 deben quedar en la UE, o documentarse en `/privacy` si no es posible.
