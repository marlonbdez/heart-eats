# Hoja de ruta

> Estado a 2026-10-11. Sustituye al plan lineal de `00_HANDOFF.md` §15, que suponía backend antes que frontend. Seguimos el orden contrario por decisión del proyecto: **primero la web completa con un backend simulado** (los datos pasan por `web/src/lib/data/`, así que el servidor se enchufa después sin tocar las pantallas), y el backend cuando se decidan P1, P4 y P5.

Criterios que valen para todo:
- **Móvil primero**: cada pantalla se comprueba a 320–390 px antes de darla por buena.
- **Presupuesto**: Railway (5 $/mes de mínimo) más ~10 €/mes de margen para el resto, usado con austeridad (ver `06_COSTES.md`). Estático y planes gratuitos mientras se pueda.
- **Accesibilidad**: WCAG 2.2 AA como criterio de aceptación.
- **Todo texto en ES y EN** a la vez. El inglés necesita una revisión nativa antes de abrir al público.
- Cada cambio entra por PR, con sus pruebas e2e (Playwright).

## Fase 0 · Definición y diseño — casi cerrada

Hecho: estructura del repo, licencias (ADR 0001), mapa (ADR 0002), idiomas y rutas (ADR 0003), logo (ADR 0004), flujos F1–F5, especificación de datos, proceso de verificación y borrador de privacidad.

Pendiente del gate (`04_DISENO_UI.md` §9):
- [ ] Revisión de accesibilidad básica
- [ ] Revisión de lenguaje (idealmente con alguien del sector)
- [ ] Aprobación de Marlon
- [x] `02_API_SPEC.md`, `03_ARQUITECTURA.md` y `06_COSTES.md` (primer borrador, 2026-10-13)

## Fase 1 · Frontend con backend simulado — en curso

Hecho y publicado en `hearteats.org`:
- [x] Mapa (MapLibre + OpenFreeMap), lista, buscador, filtros por comida y «Cerca de mí»
- [x] Ficha con «El equipo detrás de cada plato» en tres niveles
- [x] F2 proponer un local, F4 sugerir una corrección, F3 el negocio cuenta su equipo
- [x] F5 moderación (con acceso provisional desde el menú)
- [x] Páginas de contenido: qué es, verificación, privacidad y contacto (borrador)
- [x] ES + EN, modo oscuro, menú lateral, pruebas e2e

Siguiente (por orden):
- [x] Los envíos de F2, F3 y F4 llegan a la cola de moderación (buzón de prueba en el navegador)
- [x] «Pedir retirada» de una ficha o historia (`/removal`), con su flujo, sin depender del correo
- [x] Pruebas automáticas de accesibilidad (axe, WCAG 2.2 AA) en todas las páginas y estados, en móvil, ES/EN y modo claro/oscuro (no sustituyen las pruebas con personas)
- [x] «Guardar borrador» en proponer un local (en el propio dispositivo, sin el correo, 7 días)
- [x] Fotos opcionales desde la web, al proponer un local (una por plato) y desde el formulario del negocio (hasta 3): se reducen en el navegador, con permiso y en cuarentena; la subida es simulada y el almacenamiento real (R2) llega con el servidor
- [x] Correo del dominio (`contact@hearteats.org`, reenvío gratuito con ImprovMX; ver `09_CORREO.md`), puesto en `/contact` y `/privacy`

## Fase 2 · Decisiones de backend

Hay que cerrarlas antes de escribir servidor (`00_HANDOFF.md` §3). Propuestas el 2026-10-13; se dan por cerradas al fusionar la PR de documentación:
- [x] **P1** hosting del backend: Railway (plan Hobby, siempre despierto) + MongoDB Atlas M0 + R2 para fotos (ADR 0005)
- [x] **P4** geocodificación: Nominatim desde el servidor, al abrir la propuesta en moderación (ADR 0006)
- [x] **P5** autenticación: enlace mágico solo para moderación; quien envía no tiene cuenta y responde a «Info pedida» con un enlace firmado (ADR 0007). Entonces se oculta la entrada de moderación del menú
- [x] **P9** moderación inicial: Marlon como único admin; los demás, por invitación; equipo y retiradas solo los decide un admin al principio (ADR 0008)

## Fase 3 · Backend e integración

Una PR por paso:
- [x] Esqueleto de `server/`: Express, `/health`, validación, configuración y CI
- [x] Lectura: modelos, datos semilla (los de ejemplo de la web) y `GET /restaurants`
- [ ] Envíos de F2, F3 y F4 y petición de retirada, con límite de envíos, honeypot y subida de fotos. Por partes:
  - [x] `POST /proposals` (F2): validación, honeypot, límite por IP y filtro automático
  - [x] `POST /corrections` (F4) y `POST /removals`
  - [x] `POST /teams` (F3): nivel, cifras, áreas, tipos e historias (con el permiso de quien la cuenta); la cola muestra el equipo sin nombres ni textos
  - [x] Subida de fotos en cuarentena: `POST /uploads` (el servidor comprueba que es WebP o JPEG, máx. 1 MB; bucket privado de R2) y limpieza a las 24 h; sin las claves `R2_*` responde 503
  - [x] Fotos en los envíos y publicadas: miniatura emparejada (`?thumbOf=`), `photoKeys` y `photoKey` por plato en `POST /proposals`, paso de `q/` a `p/` al aprobar (con `skipPhotos`), borrado al rechazar o cerrarse, `GET /photos/:file` y `photos` en la ficha pública
  - [x] Moderación sube, ordena y retira fotos de un local ya publicado (publicación directa, con auditoría) y texto alternativo
  - [ ] Web: 1600 px + miniatura de 400 px, activar `photoUploads`, portada y galería
- [ ] Moderación. Por partes:
  - [x] Entrada: enlace mágico, sesión, `/auth/*`, primer administrador y registro de auditoría de los accesos
  - [x] Cola: `GET /suggestions` y `/suggestions/:id`, con filtro por ámbito y correo enmascarado
  - [x] Geocodificación con Nominatim al abrir un local nuevo, y aviso de duplicado por distancia (ADR 0006)
  - [x] Decisiones de rechazar (borra el correo) y pedir información (enlace firmado, 30 días): `POST /suggestions/:id/decision`
  - [x] Decisión de aprobar un local nuevo: publicar la ficha, borrar el correo y avisar por correo
  - [x] Aprobar correcciones (nombre, dirección, pin, horario, cerrado) y retiradas (ficha o historia)
  - [x] Aprobar el equipo (solo admin): crea o actualiza el `Team`, añade las historias con su consentimiento y las saca de la solicitud; el admin las lee al abrirla
  - [ ] Retiradas de fotos y de datos, y mover las fotos al aprobar (cuando exista `POST /uploads`)
  - [x] Borrado definitivo de las historias retiradas (21 días) y tope de conservación del correo (9 meses), en el trabajo horario
  - [ ] Borrado definitivo de una ficha retirada y de su equipo (hoy solo se archiva; hace falta marcar cuándo se retiró) y de las fotos retiradas (cuando existan)
  - [x] Responder a «Info pedida» (`/replies/:token`) y cierre automático a los 30 días (más 3 de margen)
  - [x] Consulta de la auditoría (`GET /audit`, solo admin, con filtros y paginación)
  - [x] Altas y bajas de moderadores (`/users`, solo admin, por invitación)
- [ ] Conectar la web a la API, por partes:
  - [x] Lecturas (inicio, lista, fichas y categorías) desde el navegador, sin datos fijos; las fichas se sirven con una reescritura y no se generan al compilar
  - [x] Envíos de propuestas, correcciones y retiradas a la API (con el idioma, y el aviso de «demasiados envíos»); `/privacy` actualizada (Resend, Nominatim, plazos); topes de envío del servidor subidos a 100/hora y 1000/día
  - [x] Equipo del negocio: el formulario envía a `POST /teams` (con el idioma y el aviso de «demasiados envíos»); moderación lo aprueba desde la web y el admin lee las historias; `/privacy` actualizada
  - [x] Fotos al proponer un local: 1600 px + miniatura de 400 px (WebP, JPEG de reserva), hasta 5 del local y una por plato, subidas al enviar; Moderación las ve y puede dejar fuera alguna (`photoUploads` activo)
  - [ ] Fotos del equipo y del formulario del negocio: el servidor aún no las acepta en `POST /teams` (`teamPhotoUploads` apagado); retirar entonces el buzón de prueba
  - [x] Portada y galería a pantalla completa en la ficha (mosaico en pantallas anchas, visor en un `<dialog>` nativo con `#photos` en la dirección, deslizar, flechas, teclado y contador) y miniatura en la tarjeta
  - [x] Dirección al proponer un local: país (selector, con su nombre en el idioma de la web), calle y ciudad obligatorias, código postal según el país y pin opcional en un mapa (se toca el sitio, o se lleva el mapa hasta él y se pone el pin en el centro; sin arrastrar). El servidor reparte las propuestas por país y ciudad y usa ese pin sin geocodificar (ADR 0006). La ficha de Moderación muestra el país y de dónde viene el pin (`locationBy`); al abrir una solicitud pide su detalle (`GET /suggestions/:id`), que es donde el servidor pone el pin y los avisos de duplicado por distancia
  - [x] Pantalla de Moderación para las fotos de un local publicado (sección «Fotos», para moderadores y administración): se busca el local por país y nombre (`GET /restaurants?q=`) y se puede añadir una foto (se reduce en el navegador, con texto alternativo en ES/EN y opción de portada), cambiar el texto, poner otra de portada o retirarla con confirmación. Máximo 12. El orden es «la portada primero, el resto por subida»; ordenar libremente quedaría para otra PR si hace falta
  - [x] Moderación: entrada con enlace por correo (`/moderation/login`), cola, detalle y decisiones (rechazar, pedir información, aprobar un local nuevo, una corrección o una retirada); `/cookies` actualizada (`he_session`). Una corrección también cambia el pin (latitud y longitud) y el horario completo de la semana. Falta: retiradas de fotos y de datos
  - [x] Administración en la moderación (`/moderation`, solo si el rol es `admin`): «Usuarios» (invitar a un moderador con correo, país y ciudad; darlo de baja con confirmación; reponerlo invitándolo de nuevo) y «Registro» (la auditoría con filtro por tipo y «Cargar más»)
  - [x] Página `/reply` para responder a «Info pedida» (lee el token del fragmento, muestra la nota y el plazo, y explica con calma el enlace ya usado o caducado); `/privacy` recoge la respuesta
  - [ ] Aviso de recompilación o de caché al publicar un local; vistas previas de Netlify con acceso a la API (CORS)
- [ ] Despliegue (Railway, Atlas, R2, Resend, DNS) y copia de seguridad semanal. Hechos: Atlas, Railway (plan Hobby), `api.hearteats.org`, Resend, R2 y la copia semanal cifrada (`backup.yml`, `13_COPIAS.md`; primera copia comprobada el 2026-10-17). Falta: confirmar la región de Railway (UE), una restauración de prueba con `mongorestore` y anotar los servicios en `/privacy`

## Fase 3b · Web internacional (decidido el 2026-10-18)

La web debe servir a cualquier lugar del mundo, en el idioma de cada persona, sin cargar el mundo entero. Hoy está fijada a `country=ES` (`web/src/lib/data/index.ts`) y el mapa arranca en Madrid. Orden acordado, en PRs pequeñas:

- [x] **1. `GET /regions`** (servidor): países y ciudades con locales publicados, con número y rectángulo. Alimenta el selector de zona.
- [x] **2. Idioma visible**: selector de idioma siempre a la vista en la cabecera (no escondido en el menú), con los idiomas escritos en su propio idioma. Por defecto, el del navegador si es ES; **inglés para el resto**. Lo que la persona elija se recuerda en el navegador (`localStorage`; actualizar `/cookies` en la misma PR) y manda sobre el del navegador. Se revisa ADR 0003 (hoy el idioma por defecto es el español).
- [x] **3. Selector «¿Dónde?»**: buscador de ciudades y países con locales (de `/regions`), independiente del idioma; la zona va en la dirección (`?city=…`). «Cerca de mí» lleva a tu zona o, si no hay locales cerca, ofrece la región activa más próxima. Con una sola región activa se queda en una etiqueta. Hecho: la zona es una **ciudad** (`?country=ES&city=madrid`); sin elegir, la ciudad con más locales. Al elegirla se piden sus locales (`/restaurants?country&city`) y el mapa se encuadra en ella. Con una sola zona, es una etiqueta. «Cerca de mí» va a la ciudad con locales a menos de 60 km; si no hay, avisa y se queda donde estaba. **Pendiente:** los formularios «Proponer retirada» y «Equipo del negocio» sin ficha de origen eligen entre los locales de la zona por defecto; falta un selector de local con búsqueda para todo el mundo.
- [x] **4. Mapa por zona visible**: al abrir, el mapa enseña los locales de la zona (la ciudad). Cuando la persona lo mueve o cambia el zoom (no cuando lo encuadra la web), tras 350 ms quieta se piden los locales de lo que se ve (`/restaurants?bbox=…`, hasta 3 páginas de 100; la petición anterior se cancela) y el selector pasa a mostrar la ciudad más cercana al centro. Si aún quedan más, el mapa pide acercar (`truncated`); si no hay ninguno, lo dice. Elegir una zona (también la actual) o «Cerca de mí» descarta lo explorado y vuelve a ella. Con búsqueda o filtros se sigue buscando en toda la zona, y al borrarlos se vuelve a ella. La lista sigue siendo por zona. **Pendiente:** si hace falta aligerar, pedir solo puntos (`/restaurants/geojson`) y la ficha al tocar un marcador; y una lista paginada por scroll.
- [x] **5. Nombres de ciudad por idioma**: el servidor guarda `address.cityNames` (`{ es, en }`, de Nominatim al publicar o al corregir la ciudad) y `/regions` los da como `names`. La web muestra `names[idioma] ?? name` en el selector y en la etiqueta de la zona, y el buscador de ciudades encuentra por cualquiera de los nombres («Tokio», «Tokyo», «東京»). Los locales ya publicados sin nombres siguen con el local; para los de prueba basta volver a ejecutar `seed:stress`. **Pendiente:** la dirección de cada ficha va como se escribe allí (correcto en una dirección); una ciudad escrita de dos maneras son dos zonas.
- [ ] **6. Descubrir antes de explorar** (la lista y las tarjetas, primeras; el mapa se conserva): a) [x] tarjeta de la lista con la foto grande arriba, nombre, barrio, plato estrella y sello, y toda la tarjeta clicable; la lista se reparte en columnas en pantallas anchas. b) escritorio con vista partida (desde 900 px, tarjetas y mapa a la vez): [x] 2a lista y mapa juntos, la lista sigue lo que ve el mapa, tocar un pin marca su tarjeta (sin globo); [x] 2b resalte al pasar el ratón o el foco entre tarjeta y pin. c) móvil con la lista primero: [x] 3a `/` es la lista (con una frase que explica qué es), el mapa pasa a `/map` y un botón flotante «Mapa» lleva a él (`/list` sigue como alias); [x] 3b la tarjeta del pin en el móvil lleva la foto grande a un lado y toda ella abre la ficha (sin «Ver local →»). Pendiente: datos de ejemplo con fotos libres de derechos para ver el resultado.
- [x] **7. Pulido de la interfaz** (decidido el 2026-10-20, en este orden, una PR cada uno): a) [x] feedback de carga (#116): spinners en los botones que envían o buscan, esqueleto en la primera carga de la lista, barra fina y aviso «Cargando…» cuando cambia la zona o el mapa, barra al tocar un enlace con la red lenta, mensaje de paciencia a los 4 s y estado «pulsado» visible en los botones; b) [x] cabecera con «Proponer» antes del idioma, tema sistema/claro/oscuro en el menú lateral (se recuerda; también lo siguen los mapas) y la frase corta en vez de la explicativa en la lista; c) [x] «Cerca de mí» como primera opción del selector de lugar y mirilla en el mapa (los botones de texto desaparecen); d) [x] vista partida al 50 % y barras de desplazamiento finas y discretas; e) [x] 20 categorías (cocina y formato mezclados), solo las que tienen locales en la zona y de más a menos, con flechas para desplazarlas con ratón (sin botón «Más»; en el móvil se desliza el dedo). Tras el merge hay que volver a lanzar `seed:stress` en producción para repartir las nuevas.
- [ ] Más idiomas además de ES/EN: la estructura lo permite (un `messages/xx.json` y revisión nativa por idioma), pero no se abre ninguno hasta que haya quien lo revise.

## Fase 4 · Antes de abrir al público

- [ ] **Revisión legal** de privacidad y consentimientos (los plazos de conservación son provisionales)
- [ ] **P6** estructura legal: hoy figura Marlon Bermúdez como responsable; decidir cuándo se constituye la asociación
- [ ] **P8** búsqueda de marca (OEPM / EUIPO)
- [x] Aviso legal (`/legal`) y política de cookies y almacenamiento (`/cookies`), en borrador; falta añadir domicilio y número fiscal (P6) y la revisión legal
- [x] Revisión editorial del inglés hecha en octubre de 2026 (por IA, `fix/revision-ingles`)
- [ ] Revisión del inglés por una persona nativa, antes de abrir al público
- [ ] Pruebas con personas usuarias, incluidas personas con discapacidad

## Fase 5 · Datos reales y lanzamiento

- [ ] Identificar y verificar 15–20 negocios de Madrid (contacto, visita, consentimientos)
- [ ] Beta privada con esos negocios
- [ ] Lanzamiento público
- [ ] Abrir contribuciones (verificadores, desarrolladores, donaciones) y explorar financiación

## Ideas para más adelante

Sin fecha ni compromiso: PWA (icono en la pantalla de inicio y apertura a pantalla completa; descartada por ahora, aporta poco frente a una web que ya funciona bien en el móvil), más ciudades, más idiomas, avisos para fichas sin revisar desde hace tiempo.

**Redis (u otra caché en memoria).** No hace falta hoy: hay un solo servidor, las sesiones y los enlaces mágicos caben en MongoDB con caducidad automática y la caché HTTP cubre las lecturas. Se valoraría si ocurre alguna de estas tres cosas:
1. Hay más de una instancia del servidor y el límite de envíos por IP debe compartirse entre ellas o sobrevivir a reinicios.
2. Las consultas del mapa se vuelven pesadas y la caché HTTP (o una CDN delante de la API) no basta.
3. Aparecen colas de trabajos, como avisos por correo o geocodificación en lote.

> Las duraciones dependen del tiempo disponible, por eso no se ponen fechas.
