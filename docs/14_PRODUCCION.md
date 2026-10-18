# 14 · Producción: sistemas, variables, flujos y recuperación

> **Estado a 2026-10-17.** Este documento es el mapa de cómo está montado HeartEats en producción: qué sistemas hay, cómo se hablan, qué variables y secretos usan, qué ocurre solo y qué hacer si algo falla. Se escribió con el servidor ya desplegado y comprobado a mano. Lo que aún no se ha podido confirmar va marcado con ❓ y está recogido al final.
>
> **Regla de este documento:** aquí van nombres, lugares y procedimientos, **nunca el valor de un secreto**. Los valores están en el panel de cada servicio y en el gestor de contraseñas del responsable.

## 1. Mapa de sistemas

| Sistema | Para qué | Dónde | Plan | Datos que guarda |
|---|---|---|---|---|
| **Web** (`web/`) | Pantallas estáticas. No guarda datos | Netlify, `hearteats.org` | Plan heredado, 0 € | Ninguno |
| **API** (`server/`) | Lógica, validación, moderación, correo, mantenimiento | Railway, `api.hearteats.org`, región **Ámsterdam (UE)** | Hobby, 5 $/mes de mínimo | Ninguno persistente (la IP del límite de envíos vive en memoria, horas) |
| **Base de datos** | Locales, equipos, solicitudes, usuarios, auditoría, sesiones | MongoDB Atlas, clúster M0, AWS **París (eu-west-3, UE)** | Gratuito (512 MB, sin copias) | **Todos** los datos, incluidos correos |
| **Correo saliente** | Enlaces de acceso, «Info pedida», aviso de aprobación | Resend, dominio `mail.hearteats.org`, región **Irlanda (UE)** | Gratuito (100/día, 3.000/mes) | Los correos enviados (registro de Resend) |
| **Correo entrante** | `contact@hearteats.org` | ImprovMX | Gratuito | Reenvía a un correo personal del responsable |
| **Copias** | `mongodump` semanal cifrado | GitHub Actions → Cloudflare R2 | Gratuito | Copia cifrada de toda la base de datos |
| **Almacén de objetos** | Hoy solo las copias. Más adelante, las fotos | Cloudflare R2, bucket `hearteats-backups` (pista de ubicación «Western Europe», jurisdicción por defecto) | Gratuito | Copias cifradas (fotos: aún no) |
| **Mapa** | Teselas y estilos | OpenFreeMap (público) | Gratuito, sin clave | Nada nuestro |
| **Direcciones** | Coordenadas de un local nuevo | Nominatim público | Gratuito, 1 consulta/s | Nada nuestro (se consulta desde el servidor) |
| **Código y CI** | Repositorio, pruebas, copias programadas | GitHub, `marlonbdez/heart-eats` | Gratuito | Código y secretos de las acciones |
| **Dominio** | `hearteats.org` | Registrado en Namecheap; **el DNS lo gestiona Netlify** | ~12–15 €/año | — |

Costes y límites de cada plan: `06_COSTES.md`.

### Cómo se conectan

```
                    ┌────────────────────────── Navegador de la persona ───────────────────────────┐
                    │                                                                                │
        HTML/JS/CSS │                       JSON por HTTPS, con cookie                  teselas      │
                    ▼                       he_session (solo moderación)                   ▼         │
        ┌────────────────────┐                           ┌───────────────────────┐  ┌──────────────┐ │
        │ Netlify            │                           │ API · Railway         │  │ OpenFreeMap  │ │
        │ hearteats.org      │                           │ api.hearteats.org     │  └──────────────┘ │
        └────────────────────┘                           └──┬─────┬─────┬─────┬──┘                   │
                                                            │     │     │     │                      │
                                         MONGODB_URI        │     │     │     │ HTTP, 1 consulta/s   │
                                      ┌─────────────────────┘     │     │     └──────────┐           │
                                      ▼                           │     │ RESEND_API_KEY ▼           │
                              ┌───────────────┐                   │     ▼        ┌────────────────┐  │
                              │ MongoDB Atlas │                   │ ┌─────────┐  │ Nominatim      │  │
                              │ clúster M0    │                   │ │ Resend  │  └────────────────┘  │
                              └───────┬───────┘                   │ └────┬────┘                      │
                                      │                           │      │ correo                    │
                      mongodump       │                           │      ▼                           │
                  (usuario de solo    │                           │  Bandeja de quien lo recibe      │
                   lectura, cada      │                           │                                  │
                   domingo)           ▼                           │                                  │
                          ┌─────────────────────┐                 │                                  │
                          │ GitHub Actions      │── cifrado con ──┘ (age, clave pública)             │
                          │ backup.yml          │       │                                            │
                          └─────────────────────┘       ▼                                            │
                                                ┌───────────────┐                                    │
                                                │ Cloudflare R2 │  backups/hearteats-AAAA-MM-DD…age  │
                                                └───────────────┘                                    │
```

Lo importante del dibujo:

- **La web nunca habla con la base de datos**: solo con la API, desde el navegador.
- **Solo la API escribe en Atlas** (más el usuario de solo lectura de las copias).
- **La API es el único sistema que envía correo y llama a Nominatim.**
- Las copias salen de GitHub, no de Railway: si Railway falla, las copias siguen.

## 2. Dominio y DNS

El registro está en Namecheap, pero el DNS lo gestiona **Netlify** (*Domains → DNS* de `hearteats.org`). Para tocar un registro, se hace allí.

| Para qué | Tipo | Nombre | Apunta a | Quién lo da |
|---|---|---|---|---|
| Web | (los que crea Netlify solo) | `@`, `www` | Netlify | Netlify |
| API | `CNAME` | `api` | Dirección que da Railway al añadir el dominio personalizado | Railway (*Networking → Custom Domain*) |
| Correo entrante | `MX` | `@` | `mx1.improvmx.com` (prioridad 10) y `mx2.improvmx.com` (20) | ImprovMX |
| Correo entrante | `TXT` | `@` | `v=spf1 include:spf.improvmx.com ~all` | ImprovMX |
| Correo saliente | Los que muestre Resend para `mail.hearteats.org` (SPF y DKIM, y un `MX` del subdominio) | `mail`, `send`, `resend._domainkey`… | Valores de Resend | Resend (*Domains*) |

- Los registros de Resend viven en un **subdominio** (`mail.`) para no chocar con los de ImprovMX. Resend los muestra tal cual en su panel; si hubiera que recrearlos, se copian de allí. ❓ Anotar aquí los nombres exactos que quedaron en Netlify.
- Estado a 2026-10-17: el dominio de Resend figura como **verificado** y el correo de acceso llega.
- Detalle del correo: `09_CORREO.md`.

## 3. Variables de entorno

### 3.1 API (Railway → servicio → *Variables*)

El servidor valida todo al arrancar (`server/src/config/env.ts`). Si falta algo obligatorio o está mal, **no arranca** y el motivo sale en los registros del despliegue.

| Variable | ¿Obligatoria en producción? | Valor en producción | Secreto | Para qué / qué pasa si falla |
|---|---|---|---|---|
| `NODE_ENV` | Sí (la fija el entorno) | `production` | No | Activa las cookies `Secure` y exige las variables de abajo |
| `PORT` | No | Lo fija Railway | No | Puerto de escucha. El dominio de Railway apunta al 3001 |
| `MONGODB_URI` | **Sí** | Cadena de Atlas terminada en `/hearteats` | **Sí** | Sin ella no arranca. Con la base mal escrita, los datos van a otra base |
| `REPLY_TOKEN_SECRET` | **Sí** (mín. 32 caracteres) | Generado con `openssl rand -hex 32` | **Sí** | Firma los enlaces de «Info pedida». Si cambia, **los enlaces ya enviados dejan de valer** (§7) |
| `RESEND_API_KEY` | **Sí** | Clave de Resend con permiso de envío | **Sí** | Sin ella no arranca. Con una clave errónea el servidor arranca pero no puede enviar el enlace de acceso |
| `ADMIN_EMAIL` | Sí, para tener un primer administrador | Correo del responsable | No (pero no va al repo) | Al arrancar se da de alta (o se repone) como `admin`. Con él se entra a `/moderation` |
| `WEB_URL` | Sí | `https://hearteats.org` | No | Dirección que llevan los enlaces de los correos. Mal puesta, los enlaces llegan rotos |
| `CORS_ORIGINS` | Sí | `https://hearteats.org` | No | Webs que pueden llamar a la API **y** orígenes válidos para escribir con sesión. Varias, separadas por comas. Si falta, el navegador bloquea todo |
| `TRUST_PROXY` | Sí | `1` | No | Hay un proxy de Railway delante. Sin él, el límite de envíos vería una única IP para todos |
| `SUBMISSIONS_PER_HOUR` | No | (sin poner: 100) | No | Tope de envíos por IP y hora. `0` lo desactiva |
| `SUBMISSIONS_PER_DAY` | No | (sin poner: 1000) | No | Tope de envíos por IP y día |
| `KNOWN_CHAINS` | No | Vacío | No | Nombres de grandes cadenas, separados por comas, para el aviso `chain`. Es configuración: no va al repo |
| `MAIL_FROM` | No | (sin poner: `HeartEats <acceso@mail.hearteats.org>`) | No | Remitente. Tiene que ser de un dominio verificado en Resend |
| `MAIL_REPLY_TO` | No | (sin poner: `contact@hearteats.org`) | No | Dónde llegan las respuestas |
| `NOMINATIM_URL` | No | (sin poner: instancia pública) | No | Servicio de direcciones |
| `GEOCODER_USER_AGENT` | No | (sin poner) | No | Identifica el proyecto ante Nominatim, como piden sus condiciones |

Railway añade además variables propias (las de `RAILWAY_…`); no las usa el código.

### 3.2 Web (Netlify, al compilar)

| Variable | Dónde | Valor | Para qué |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `netlify.toml` (en el repo) | `https://api.hearteats.org` | Dirección de la API. **Se fija al compilar**: si cambia, hay que volver a desplegar la web |
| `NODE_VERSION` | `netlify.toml` | `24` | Versión de Node del build |

No hay secretos en la web: todo lo que lleva `NEXT_PUBLIC_` acaba en el navegador.

### 3.3 Local y pruebas

`server/.env.example` es la plantilla; `.env` nunca se sube. En local, sin clave de Resend, el enlace de acceso se escribe en la consola del servidor. Las pruebas del servidor usan MongoDB en memoria; las e2e de la web, una API simulada (`web/e2e/support/test.ts`). `PW_CHROMIUM_PATH` y `CI` solo afectan a las pruebas.

## 4. Secretos de GitHub Actions

*Repo → Settings → Secrets and variables → Actions.* Solo los usa `.github/workflows/backup.yml`. GitHub **no deja leerlos** una vez guardados, solo reemplazarlos.

| Secreto | Qué es | De dónde sale |
|---|---|---|
| `MONGODB_URI` | Cadena de Atlas del usuario **`backup`**, de solo lectura | Atlas → *Database Access* |
| `BACKUP_AGE_RECIPIENT` | Clave **pública** de cifrado (`age1…`) | Se genera con `age-keygen`; la privada no sale del equipo del responsable |
| `R2_ACCOUNT_ID` | Identificador de la cuenta de Cloudflare (no es secreto, pero se guarda aquí) | Parte inicial de la dirección S3 de R2 |
| `R2_ACCESS_KEY_ID` | Clave de acceso del token `hearteats-backup` | Cloudflare → R2 → *Manage API tokens* |
| `R2_SECRET_ACCESS_KEY` | Su secreto (se muestra una sola vez) | Ídem |
| `R2_BUCKET` | Nombre del bucket: `hearteats-backups` | Cloudflare → R2 |

## 5. Dónde está cada credencial y qué pasa si se pierde

Esta es la tabla más importante en caso de apuro. «Gestor» = gestor de contraseñas del responsable.

| Credencial | Dónde vive | ¿Se puede recuperar? | Si se pierde |
|---|---|---|---|
| **Clave privada de cifrado** (`hearteats-backup.key`) | Gestor y un segundo sitio. **Nunca** en el repo ni en el chat | **No** | Las copias dejan de poder abrirse. Se genera otra pareja y se actualiza `BACKUP_AGE_RECIPIENT`, pero las copias antiguas se pierden |
| Contraseña del usuario de Atlas de la API | Cadena `MONGODB_URI` en Railway y en el gestor | Se puede cambiar en Atlas | Se cambia en Atlas y se actualiza en Railway |
| Contraseña del usuario `backup` de Atlas | Secreto `MONGODB_URI` de GitHub | Se puede cambiar | Se cambia en Atlas y se actualiza el secreto |
| Token de R2 (`hearteats-backup`) | Secretos de GitHub | Se revoca y se crea otro | Se crea otro token y se actualizan `R2_ACCESS_KEY_ID` y `R2_SECRET_ACCESS_KEY` |
| `REPLY_TOKEN_SECRET` | Railway y gestor | Se puede cambiar (§7) | Se genera otro; los enlaces de «Info pedida» pendientes dejan de valer |
| `RESEND_API_KEY` | Railway y gestor | Se revoca y se crea otra | Se crea otra en Resend y se cambia en Railway |
| Cuentas (Railway, Atlas, Cloudflare, Resend, Netlify, Namecheap, ImprovMX, GitHub) | Gestor del responsable | Con la recuperación de cada servicio | Sin acceso a una cuenta, ese sistema queda bloqueado: conviene tener activada la verificación en dos pasos y los códigos de recuperación guardados |

⚠️ **Hoy todo depende de una sola persona.** Cuando se constituya la asociación (P6 en `05_ROADMAP.md`), las cuentas deben pasar a un correo de la asociación o tener una segunda persona con acceso.

## 6. Flujos

### 6.1 Lectura pública (mapa, lista, ficha)
1. El navegador carga la web estática de Netlify.
2. Desde el navegador pide a `GET /api/v1/restaurants` (por zona: `bbox`, `near`, `country` o `city`; sin zona devuelve `zone_required`), `/restaurants/geojson`, `/restaurants/:slug` y `/meta/filters`.
3. No hay cookies ni cuenta. Si la API no responde o no hay locales, la web lo dice con calma y no pinta nada.
4. Las fichas (`/place/<slug>`) son una sola página que Netlify sirve para cualquier slug (reescritura en `netlify.toml`); la página pide el local a la API.

### 6.2 Envíos de la comunidad (propuestas, correcciones, retiradas, equipo)
`POST /proposals`, `/corrections`, `/removals` y `/teams` (sin cuenta, sin cookies).
1. Validación (Zod) y *honeypot*: un envío con el campo trampa se descarta sin avisar.
2. Límite por IP (100/hora y 1000/día por defecto). Solo cuenta lo que se **guarda**; un envío con errores no cuenta. Los contadores están **en la memoria** de la API.
3. Se guarda una `Suggestion` en estado `pending`, con avisos automáticos (cadena, sin pruebas…). Si hay correo, se guarda en la solicitud.
4. Responde `202`. La API no envía nada por correo en este paso.
5. Las fotos aún no se piden (`photoUploads` apagado en `web/src/lib/features.ts`, a la espera de `POST /uploads` y R2).

### 6.3 Entrada a moderación (enlace mágico)
1. La persona escribe su correo en `/moderation/login`. `POST /auth/magic-link` responde siempre lo mismo, exista o no, y solo envía correo si el usuario existe y está activo. Límite: 20 por IP y hora, y como mucho 5 enlaces vivos a la vez por persona.
2. Resend envía el enlace, que lleva el token en el fragmento (`/es/moderation/login#token=…`) y vale **15 minutos**, un solo uso.
3. Al abrirlo, `POST /auth/session` cambia el enlace por una sesión y fija la cookie **`he_session`**: `httpOnly`, `Secure` y `SameSite=Strict`. Caduca a los **7 días sin actividad**.
4. Las escrituras exigen esa cookie, un `Origin` incluido en `CORS_ORIGINS` y la cabecera `X-Requested-With`.
5. Darse de baja a un moderador borra sus sesiones y enlaces: la sesión abierta deja de valer al instante.
6. **El primer administrador** sale de `ADMIN_EMAIL`: cada arranque lo da de alta con ámbito España / Madrid, o lo repone si estaba de baja (y lo hace `admin` si era moderador); si ya existía, no toca su ámbito. Los demás los invita un administrador desde «Usuarios».

### 6.4 Revisar y decidir una solicitud
1. La cola (`GET /suggestions`) muestra solo lo del **ámbito** de la persona (`moderationScope`: país y, opcional, ciudad), con el correo enmascarado.
2. Al abrir un local nuevo por primera vez, la API **geocodifica** con Nominatim (1 consulta por segundo). Si falla, se coloca el pin a mano. También avisa de posibles duplicados por distancia.
3. Decisiones (`POST /suggestions/:id/decision`):
   - **Rechazar**: guarda el motivo y **borra el correo**.
   - **Pedir información**: guarda la nota, crea un enlace firmado (§6.5) y envía el correo a quien propuso.
   - **Aprobar un local nuevo**: exige `ownerConfirmed` (el negocio da siempre el último sí); publica la ficha, borra el correo y avisa a quien propuso.
   - **Aprobar una corrección**: aplica lo que escribe quien aprueba (nombre, dirección, pin, horario completo o cierre). Si cambia la dirección y no hay pin, geocodifica.
   - **Aprobar una retirada**: exige confirmar la identidad; oculta al instante la ficha o la historia.
   - **Aprobar un equipo**: **solo administración**; añade las historias a la ficha con su consentimiento.
4. Cada decisión deja una línea en `AuditLog` con quién la tomó.
5. Las historias (nombres y textos) solo las lee un administrador al abrir la solicitud; la cola y los moderadores ven únicamente cuántas hay.

### 6.5 «Info pedida» y su respuesta
1. El enlace lleva un token `idSolicitud.caducidad.nonce` firmado con `REPLY_TOKEN_SECRET`. Va en el **fragmento** (`#…`) de la URL de `/reply`, que no se envía a ningún servidor ni se guarda en registros.
2. Plazo: **30 días**, más **3 de cortesía**.
3. `GET /replies/:token` enseña la nota y el plazo; `POST /replies/:token` guarda **una** respuesta: el enlace es de un solo uso (se borra el `nonce`), la solicitud vuelve a `pending` y reaparece en la cola con la respuesta. Un enlace caducado, usado, manipulado o de una solicitud ya cerrada da siempre el mismo `404`. Si moderación pide más información, se envía un enlace nuevo y el anterior deja de valer.
4. Pasado el plazo sin respuesta, la solicitud se cierra sola como rechazada (§6.7).

### 6.6 Administración (solo `admin`)
`GET /audit` (registro con filtros y paginación), y `GET/POST/DELETE /users` (listar, invitar por ámbito, dar de baja). No se puede dar de baja a un administrador. Las acciones sobre usuarios quedan en el registro **sin** el correo.

### 6.7 Mantenimiento automático
Lo hace la propia API, **dentro de su proceso**: al arrancar y **cada hora** (`server/src/services/maintenance.ts`). No hay una tarea aparte que vigilar. Cada tarea falla por separado y se puede ejecutar a la vez desde varias instancias sin duplicar.

| Tarea | Qué hace | Plazo |
|---|---|---|
| Cerrar solicitudes sin respuesta | Pasa a `rejected` las de «Info pedida» sin respuesta, borra el correo y las historias de paso | 30 días + 3 de cortesía |
| Vaciar historias retiradas | Borra nombre, puesto, texto y foto; conserva el hueco, el consentimiento y las fechas | 21 días tras retirarlas |
| Borrar correos por antigüedad | Quita el correo de las solicitudes que aún lo conservan | ≈ 9 meses (270 días) |

Los plazos son **provisionales** hasta la revisión legal (`08_PRIVACIDAD_LEGAL.md`). Sesiones y enlaces de acceso caducan solos con un índice TTL de Mongo.

### 6.8 Copia de seguridad semanal
`.github/workflows/backup.yml`: domingos a las 03:17 UTC y a mano. `mongodump` (sin `sessions` ni `logintokens`) → cifrado con `age` → `backups/hearteats-AAAA-MM-DD.archive.gz.age` en R2. Falla si pesa menos de 1 KB. El bucket borra a los 28 días. Detalle, puesta en marcha y restauración: `13_COPIAS.md`.

### 6.9 Despliegue
- **Web**: cada fusión a `main` despliega en Netlify; cada PR tiene su vista previa (que, hoy, **no puede llamar a la API**: `CORS_ORIGINS` solo incluye `https://hearteats.org`).
- **API**: Railway despliega solo cada vez que cambia `main` (lo hace la integración con GitHub; aparece como *railway-app[bot]* en los despliegues). El panel de Railway muestra como constructor «Railpack» (el predeterminado); el comando de arranque del proyecto es `npm start` (`node dist/server.js`). El `Dockerfile` de `server/` está pensado para desarrollo local y para una opción de despliegue con Docker; ❓ confirmar cuál usa Railway hoy.
- **CI** (`.github/workflows/ci.yml`): en cada PR y en `main`, servidor (lint, tipos, pruebas con MongoDB en memoria, build) y web (lint, tipos, build, prueba de humo).
- Nunca se hace *push* a `main`: todo entra por PR.

## 7. Operación

### Comprobar que todo vive
| Qué | Cómo |
|---|---|
| API despierta | `https://api.hearteats.org/api/v1/health` → `{"status":"ok"}` (no toca la base de datos) |
| API + base de datos | `https://api.hearteats.org/api/v1/restaurants?city=Madrid` |
| Entrada de moderación | Pedir el enlace en `https://hearteats.org/es/moderation` y comprobar que llega |
| Última copia | *GitHub → Actions → Copia de seguridad* en verde; o ver el bucket |
| Registros de la API | Railway → servicio → *Deployments / Logs*. **Se conservan 7 días** |

### Cambiar un secreto (rotar)
- **`RESEND_API_KEY`**: crear otra en Resend → cambiarla en Railway (reinicia solo) → borrar la vieja.
- **`MONGODB_URI` (contraseña de Atlas)**: cambiar la contraseña del usuario en Atlas → actualizar Railway. Hay unos segundos sin base de datos.
- **`REPLY_TOKEN_SECRET`**: cambiarlo **invalida todos los enlaces de «Info pedida» pendientes**. Hazlo cuando no haya solicitudes en espera, o avisa a esas personas.
- **Token de R2**: crear otro, actualizar los dos secretos de GitHub, revocar el viejo.
- **Clave de cifrado**: generar otra pareja, actualizar `BACKUP_AGE_RECIPIENT`, **guardar la privada vieja** mientras haya copias hechas con ella.

### Quitar los locales de ejemplo de producción
Solo borra los marcados `isDemo`; no toca locales reales. Dice en qué base está y cuántos borrará, y pide escribir «borrar».

```bash
cd server
# MONGODB_URI de producción en server/.env (que no se sube al repo), o en la línea de comandos
npm run seed -- --clear
```

Quita después la línea del `.env` o bórralo: una terminal con la cadena de producción es un riesgo. Para volver a cargar los de ejemplo en una base **local** basta `npm run seed`; **no lo ejecutes contra producción**.

### Datos de prueba por todo el mundo (fase de pruebas)
Mientras se prueba, producción lleva cientos de locales ficticios repartidos por unas 35 ciudades (Madrid con más densidad), con nombres y calles en su idioma o escritura, descripciones solo en ES, solo en EN o ninguna, locales sin horario, archivados o pendientes (no deben verse) y algunos equipos con historia. Todos llevan `isDemo`, «[DEMO]» en el nombre y el slug `demo-stress-…`.

```bash
cd server
# MONGODB_URI de producción en server/.env (que no se sube al repo)
npm run seed:stress -- --per-city 15   # 630 locales; dice la base y pide escribir «cargar»
```

Se puede repetir: borra los suyos y los recrea igual (son deterministas). `npm run seed -- --clear` los quita junto con los 6 de ejemplo. Ocupan menos de 1 MB (el límite de Atlas M0 son 512 MB), así que lo que se mide es la rapidez de las lecturas, no el espacio.

**Antes de abrir al público hay que borrar todo lo de prueba** (§9, pendiente 3), y la web sigue cerrada a buscadores hasta entonces («Abrir a buscadores»).

### Cuando algo falla
| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| La web carga pero no hay locales | La API no responde, o `CORS_ORIGINS` no incluye el origen | Probar `/health`; mirar los registros de Railway; revisar la variable |
| La API no arranca tras un cambio | Falta o está mal una variable obligatoria | Registros del despliegue: dicen cuál |
| No llega el enlace de acceso | Clave de Resend errónea, dominio sin verificar, o el correo no es de un usuario activo | Mirar Resend (*Emails*) y los registros de Railway |
| El enlace del correo no abre bien | `WEB_URL` mal puesta | Corregir y reiniciar |
| «Demasiados envíos» a todo el mundo | `TRUST_PROXY` mal puesto (todos comparten IP) | Debe ser `1` |
| La copia semanal falla | Token o bucket mal, Atlas inaccesible | Ver el registro de la acción. Errores vistos: `SSL handshake failure` = `R2_ACCOUNT_ID` mal; `AccessDenied` = `R2_BUCKET` mal o token de otro bucket |
| Atlas lleno (512 MB) | Muchos datos | Escrituras fallan: pasar a un plan de pago (`06_COSTES.md`) |

### Recuperar tras un desastre
1. **Se pierde la base de datos**: restaurar la última copia (`13_COPIAS.md`) en una base nueva de Atlas, apuntar `MONGODB_URI` de Railway a ella y comprobar `/restaurants`. Se pierde como mucho una semana. Las sesiones y enlaces de acceso no están en la copia: habrá que volver a entrar.
2. **Se pierde Railway**: crear el servicio otra vez desde el repo (directorio raíz `server`), poner las variables de §3.1 y añadir otra vez el dominio `api.hearteats.org`.
3. **Se pierde Netlify**: crear el sitio desde el repo (`netlify.toml` ya lleva la configuración) y repasar los registros DNS de §2.
4. **Se pierde el administrador**: poner `ADMIN_EMAIL` con un correo accesible y reiniciar; el usuario se repone solo.

## 8. Límites que importan al escalar

- **Una sola instancia de la API.** Los contadores del límite de envíos están en memoria: con varias réplicas, cada una contaría por su cuenta. Antes de subir réplicas hay que compartir esos contadores (ver «Redis» en `05_ROADMAP.md`).
- **Atlas M0** está limitado a unas 100 operaciones por segundo y 500 conexiones. Es el primer cuello. La primera mejora gratuita es **cachear las lecturas públicas** (`Cache-Control` y una pequeña caché en memoria); la segunda, un plan de pago de Atlas.
- **Resend**: 100 correos al día. Solo se envían enlaces de acceso, peticiones de información y avisos de aprobación; hay mucho margen.
- **Nominatim**: 1 consulta por segundo, con `User-Agent` identificado. La API lo respeta con una cola.
- **Railway Hobby**: 5 $ de crédito al mes incluidos; hay que mirar la factura el primer mes. Conviene tener puesto un tope de uso en el panel.

## 9. Regiones y pendientes

### Regiones confirmadas (2026-10-18)
| Sistema | Región | ¿UE? |
|---|---|---|
| Railway (API) | Ámsterdam (Europe West) | Sí |
| MongoDB Atlas (base de datos) | AWS París (eu-west-3) | Sí |
| Cloudflare R2 (copias) | Pista «Western Europe»; **jurisdicción por defecto** (no es la jurisdicción UE, que solo se elige al crear el bucket) | No garantizado. Las copias se cifran con `age` antes de salir de GitHub: Cloudflare solo guarda texto ilegible sin nuestra clave. Se deja así a la espera de la revisión legal; si pide jurisdicción UE, hace falta otro bucket y cambiar la dirección S3 (`<cuenta>.eu.r2.cloudflarestorage.com`) |
| Netlify (web estática) | Red de distribución global | No guarda datos nuestros; registra la IP de quien visita |
| Resend (correo) | Irlanda (eu-west-1) | Sí |

Las empresas proveedoras son de fuera de la UE (p. ej. de EE. UU.): que los datos estén en servidores europeos no sustituye a mirar las transferencias en la revisión legal (`08_PRIVACIDAD_LEGAL.md`).

### Abrir a buscadores (al lanzar)
Hasta el lanzamiento la web está **cerrada a buscadores** en tres sitios a la vez, para que los locales de prueba no se indexen:

1. `web/public/robots.txt`: `Disallow: /`.
2. `netlify.toml`: cabecera `X-Robots-Tag = "noindex, nofollow"`.
3. `web/src/app/[locale]/layout.tsx`: `robots: { index: false, follow: false }` en `generateMetadata`.

Al abrir (tras borrar los datos de prueba y terminar el SEO): quitar los tres, poner `Allow: /` y la línea `Sitemap:` en `robots.txt`, y actualizar `web/e2e/seo.spec.ts`. Si los buscadores llegaran a indexar algo antes de tiempo, no basta con borrarlo: hay que pedir la retirada en sus herramientas para propietarios.

### ❓ Pendiente de confirmar
1. **Nombres exactos de los registros DNS** de Resend en Netlify (§2).
2. **Si Railway usa el `Dockerfile` o Railpack** (§6.9).
3. **Datos de prueba en producción**: los 6 `[DEMO]`, los de «Datos de prueba por todo el mundo» (§7) y un local real de la prueba completa («El mesón de Lola»). Hay que quitarlos antes de abrir al público: `npm run seed -- --clear` para los marcados; el resto (solicitudes, equipos, registro de auditoría, usuarios de prueba) con un comando de reinicio con confirmación que aún no existe.
4. ~~Restauración de prueba~~ **Hecha el 2026-10-18** (`13_COPIAS.md`). Repetirla de vez en cuando, p. ej. cada trimestre.
5. **Aviso de caída** gratuito (monitorización externa) y alertas del servidor.
6. **Segunda persona con acceso** a las cuentas (§5).
7. **Tope de uso** puesto en el panel de Railway.
