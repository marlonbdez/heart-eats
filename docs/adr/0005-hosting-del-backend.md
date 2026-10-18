# ADR 0005 · Hosting y pila del backend

- **Estado:** aceptada. Revisada el 2026-10-13: el hosting de la API pasa de Render a Railway por coste (ver «Cambio de Render a Railway»).
- **Fecha:** 2026-10-13
- **Resuelve:** P1 (hosting del backend). Confirma la pila del handoff (§2): Node + Express + MongoDB.

## Contexto

La web ya está completa con datos simulados (`web/src/lib/data/`). El servidor debe caber en el presupuesto (Railway, ~5 $/mes de mínimo, más ~10 €/mes de margen para el resto, usado con austeridad; ver `06_COSTES.md`) y sostener, al principio, una beta privada con 15–20 negocios de Madrid. El tráfico será bajo y las escrituras (propuestas, decisiones) más raras aún.

## Decisión

- **API:** Node.js 24 (LTS, como la web) + Express, en TypeScript. Validación con Zod, Helmet, CORS restringido a `hearteats.org`, límite de envíos por IP y pruebas con Vitest + Supertest.
- **Base de datos:** MongoDB Atlas, plan gratuito M0, en una región de la UE. Mongoose para los modelos (`01_ESPECIFICACION_DATOS.md`).
- **Hosting de la API:** Railway, plan Hobby, en una región de la UE (❓ confirmar al crear el servicio; Ámsterdam es la prevista).
  - **El servidor está siempre despierto:** no hay esperas de arranque y la API es estable también durante la beta.
  - **Coste:** 5 $/mes de mínimo, que se descuentan como crédito de uso. Se factura el uso real de memoria y CPU por segundo, así que una API pequeña con poco tráfico debería quedarse dentro de esos 5 $. Hobby llega a 48 vCPU / 48 GB por servicio y 5 réplicas: crecer no obliga a cambiar de plan. Pro (20 $) solo añade cosas de equipo y no hace falta.
  - **Control del gasto:** se fija un límite de uso en el panel desde el primer día.
  - **Despliegue:** desde GitHub, con directorio raíz `server/` y el `Dockerfile` (destino `production`). El puerto lo fija Railway con `PORT`.
- **Dominio de la API:** `api.hearteats.org`. Al ser del mismo sitio que la web (`hearteats.org`), la cookie de sesión de moderación puede ser `SameSite=Strict` (ver ADR 0007).
- **Fotos:** Cloudflare R2, en un bucket **privado**. Las fotos entran en un prefijo de cuarentena (`q/`) y solo pasan al público (`p/`) cuando Moderación las aprueba. El servidor las recibe y las sirve (ver «Cambio en las fotos»).
- **Copias de seguridad:** M0 no incluye copias automáticas. Una acción programada de GitHub Actions hace `mongodump` semanal, cifrado, a un bucket privado de R2, y se conservan 4 semanas (los datos incluyen correos, ver `08_PRIVACIDAD_LEGAL.md`).

## Cómo llegan los datos a la web

Hoy la web es estática y genera las fichas al compilar. Con datos reales, una opción sería recompilar la web cada vez que se aprueba algo. **El plan de Netlify no condiciona esta decisión**: se despliega todas las veces que haga falta, y si algún día se llega a un límite se decide entonces entre pagar o cambiar de proveedor. La descartamos por motivos de producto:

- **Retirar tiene que ser inmediato.** Una historia o una foto retirada deja de mostrarse al instante (`08_PRIVACIDAD_LEGAL.md`). Con páginas generadas al compilar, el texto seguiría publicado hasta terminar el build y en las cachés.
- **Publicar tiene que ser inmediato.** Una aprobación se ve en cuanto se decide, sin esperar minutos a un build.
- **Escala.** Reconstruir todas las páginas en cada aprobación tarda más cuantos más locales y ciudades haya.
- **Más simple.** Un cambio de datos no dispara ningún despliegue, y los despliegues de la web quedan para cambios de la propia web.

**Decisión:** la web **lee los locales desde el navegador** y no se recompila al publicar. Como el proyecto es internacional desde el primer día, la web **nunca pide «todos los locales»**: pide los de la zona que se ve en el mapa (`bbox`), los más cercanos (`near`) o los de una ciudad, con caché HTTP corta (`02_API_SPEC.md`). Hoy, con unos pocos locales, cada respuesta es diminuta; cuando haya miles en muchas ciudades, el contrato no cambia. Consecuencias para la web (PR de integración):

- `/place/[slug]` deja de generarse por local y pasa a una sola página que lee el `slug` y pide la ficha.
- Las listas y la ficha muestran un estado de carga mientras llegan los datos.
- El mapa pide los locales al moverse (con un pequeño margen, y con el `bbox` redondeado para que se pueda cachear), y el buscador y los filtros pasan a hacerse en el servidor.
- La vista inicial depende de la región (configuración, no una constante de Madrid).
- Los datos de ejemplo (`mock-restaurants.ts`) pasan a ser los datos semilla del servidor.

**Caché.** Las respuestas públicas llevan caché HTTP corta y `bbox` en cuadrícula (`02_API_SPEC.md`). Si algún día el tráfico lo pide, se pone una CDN delante de la API antes de pagar un plan mayor.

## Cambio de Render a Railway

La primera propuesta era Render (Starter, ~7 $/mes). Al verlo en la práctica resultó caro para una API pequeña, y se cambió a Railway Hobby (5 $/mes de mínimo, con crédito de uso). El resto de la decisión (Node, Express, Atlas M0, R2, dominio, copias) no cambia. Se prefirió Railway a Fly.io porque se gestiona desde el panel web (el proyecto se mantiene mucho desde el móvil) y el coste es más previsible; la diferencia de precio con Fly.io es de 1–2 $/mes.

## Cambio en las fotos

La primera idea era subida por URL firmada y servir las fotos desde un dominio público de R2. Al llegar a hacerlo (2026-10-18) se cambió por dos motivos:

- **El DNS de `hearteats.org` lo gestiona Netlify, no Cloudflare.** Un dominio propio para un bucket público de R2 exige que la zona esté en Cloudflare. La alternativa gratuita (`r2.dev`) tiene límites y no es para producción.
- **Con una URL firmada el servidor no ve la foto.** Recibiéndola él mismo, comprueba que los bytes son WebP o JPEG y no solo lo que dice la cabecera. Con tope de 1 MB, pasar por Railway cuesta casi nada.

Por eso el bucket es privado y **la API sirve las fotos públicas** (`/photos/…`, con caché larga e `immutable`, porque la clave es aleatoria). Retirar una foto es borrarla del almacén: deja de verse al instante. Si algún día el tráfico lo pide, se pone una CDN delante de la API (o se mueve el DNS a Cloudflare) sin cambiar nada de la web. Esto no cambia el presupuesto: R2 sigue en capa gratuita y la salida de Railway por fotos reducidas es de céntimos al principio.

## Alternativas descartadas

- **Render:** el plan Starter (~7 $/mes por servicio) sale más caro que Railway y no aporta nada que necesitemos. Se eligió primero y se descartó el 2026-10-13 (ver abajo).
- **Render gratuito:** se duerme tras unos 15 minutos sin tráfico y despertarlo tarda del orden de un minuto.
- **Fly.io:** algo más barato sobre el papel (~4 $/mes con 1 núcleo compartido y 512 MB, estimación) pero la factura varía, no hay capa gratuita para cuentas nuevas y se maneja con terminal (`flyctl`). Como el `Dockerfile` sirve igual, cambiar a Fly.io sería cuestión de una tarde si algún día interesa.
- **Cloudflare Workers + D1:** no se duerme y costaría casi 0 €, pero obliga a cambiar Express y Mongo por una pila distinta; no hay motivo suficiente para reabrir la decisión del handoff.
- **PostgreSQL + PostGIS:** descartado en el handoff (§5); sigue valiendo.

## Riesgos

- **Atlas M0** (512 MB, sin copias automáticas, y puede pausar clústeres inactivos): copia semanal propia y comprobación en `06_COSTES.md`. Sobra para cientos de locales. Es el primer sitio donde gastar el margen del presupuesto si hace falta más garantía (un plan de pago con copias automáticas).
- **Los precios y límites cambian:** `06_COSTES.md` anota qué hay que verificar y cuándo.
- **Datos personales fuera del EEE:** Atlas, Railway y R2 deben quedar en la UE, o documentarse en `/privacy` si no es posible.
