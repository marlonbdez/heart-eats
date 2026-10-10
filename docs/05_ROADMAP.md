# Hoja de ruta

> Estado a 2026-10-10. Sustituye al plan lineal de `00_HANDOFF.md` §15, que suponía backend antes que frontend. Seguimos el orden contrario por decisión del proyecto: **primero la web completa con un backend simulado** (los datos pasan por `web/src/lib/data/`, así que el servidor se enchufa después sin tocar las pantallas), y el backend cuando se decidan P1, P4 y P5.

Criterios que valen para todo:
- **Móvil primero**: cada pantalla se comprueba a 320–390 px antes de darla por buena.
- **Presupuesto**: como máximo ~10 €/mes en total (ver `06_COSTES.md`). Estático y planes gratuitos mientras se pueda.
- **Accesibilidad**: WCAG 2.2 AA como criterio de aceptación.
- **Todo texto en ES y EN** a la vez. El inglés necesita una revisión nativa antes de abrir al público.
- Cada cambio entra por PR, con sus pruebas e2e (Playwright).

## Fase 0 · Definición y diseño — casi cerrada

Hecho: estructura del repo, licencias (ADR 0001), mapa (ADR 0002), idiomas y rutas (ADR 0003), logo (ADR 0004), flujos F1–F5, especificación de datos, proceso de verificación y borrador de privacidad.

Pendiente del gate (`04_DISENO_UI.md` §9):
- [ ] Revisión de accesibilidad básica
- [ ] Revisión de lenguaje (idealmente con alguien del sector)
- [ ] Aprobación de Marlon
- [ ] `02_API_SPEC.md` y `06_COSTES.md` (siguen vacíos o en borrador)

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
- [ ] «Pedir retirada» de una ficha o historia, con su flujo, sin depender del correo
- [ ] Pruebas automáticas de accesibilidad (axe) en todas las páginas, en móvil y modo oscuro
- [ ] «Guardar borrador» en proponer un local
- [ ] PWA: icono en la pantalla de inicio y apertura a pantalla completa
- [ ] Correo del dominio (`contact@hearteats.org`, reenvío gratuito) y ponerlo en `/contact` y `/privacy`

## Fase 2 · Decisiones de backend

Hay que cerrarlas antes de escribir servidor (`00_HANDOFF.md` §3):
- [ ] **P1** hosting del backend (cabe en el presupuesto)
- [ ] **P4** geocodificación
- [ ] **P5** autenticación: enlace mágico para quien envía y para moderación; entonces se oculta la entrada de moderación del menú
- [ ] **P9** quién modera Madrid al inicio y cómo se asciende a moderador

## Fase 3 · Backend e integración

- [ ] Express + base de datos, modelos y validación
- [ ] Endpoints de lectura, de sugerencias y de moderación (`02_API_SPEC.md`)
- [ ] Sustituir las funciones de `web/src/lib/data/` por llamadas a la API (y retirar el buzón de prueba)
- [ ] Registro de auditoría real y limitación de envíos (rate limit)
- [ ] Tests y CI

## Fase 4 · Antes de abrir al público

- [ ] **Revisión legal** de privacidad y consentimientos (los plazos de conservación son provisionales)
- [ ] **P6** estructura legal: hoy figura Marlon Bermúdez como responsable; decidir cuándo se constituye la asociación
- [ ] **P8** búsqueda de marca (OEPM / EUIPO)
- [ ] Aviso legal y política de cookies (`08_PRIVACIDAD_LEGAL.md`)
- [ ] Revisión nativa del inglés
- [ ] Pruebas con personas usuarias, incluidas personas con discapacidad

## Fase 5 · Datos reales y lanzamiento

- [ ] Identificar y verificar 15–20 negocios de Madrid (contacto, visita, consentimientos)
- [ ] Beta privada con esos negocios
- [ ] Lanzamiento público
- [ ] Abrir contribuciones (verificadores, desarrolladores, donaciones) y explorar financiación

## Ideas para más adelante

Sin fecha ni compromiso: más ciudades, más idiomas, fotos de platos aportadas por los negocios, avisos para fichas sin revisar desde hace tiempo.

> Las duraciones dependen del tiempo disponible, por eso no se ponen fechas.
