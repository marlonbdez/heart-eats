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
  - [ ] `POST /teams` (F3): aparte, porque guarda historias y depende de cómo las revisa Moderación (`02_API_SPEC.md`, pregunta 1)
  - [ ] Subida de fotos en cuarentena (`POST /uploads`) y `photoKey` en los envíos
- [ ] Moderación. Por partes:
  - [x] Entrada: enlace mágico, sesión, `/auth/*`, primer administrador y registro de auditoría de los accesos
  - [x] Cola: `GET /suggestions` y `/suggestions/:id`, con filtro por ámbito y correo enmascarado
  - [x] Geocodificación con Nominatim al abrir un local nuevo, y aviso de duplicado por distancia (ADR 0006)
  - [ ] Decisiones (aprobar, rechazar, pedir información), geocodificación, avisos por correo y borrado del correo al resolver
  - [ ] Altas y bajas de moderadores (`/users`) y consulta de la auditoría (`/audit`)
- [ ] Sustituir las funciones de `web/src/lib/data/` por llamadas a la API, retirar el buzón de prueba y actualizar `/cookies` y `/privacy`
- [ ] Despliegue (Railway, Atlas, R2, Resend, DNS) y copia de seguridad semanal

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
