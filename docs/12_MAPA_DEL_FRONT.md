# Mapa del front

> Guía corta para entender la web antes de escribir el backend: cómo verla, qué pantallas hay, qué recorrido hace un envío y qué cambiará con el servidor. El estado del proyecto está en [`05_ROADMAP.md`](05_ROADMAP.md).

## Cómo verlo

La web es estática y vive en `web/`. Los datos son de ejemplo: 6 locales marcados `[DEMO]` y 4 solicitudes en la cola de moderación.

Para ir probando (desde `web/`):

```bash
npm install
npm run dev
```

Abre `http://localhost:3000/es` (o `/en`). Para el móvil, usa las herramientas del navegador con una pantalla de 360 px.

La versión compilada, como la ve el público y como la prueban los tests:

```bash
npm run build
npx serve out -l 4567 --no-clipboard
```

Abre `http://localhost:4567/es`.

## Un paseo de prueba

1. **Mapa y lista:** en `/es` toca un marcador, prueba el buscador, un filtro de comida y «Cerca de mí». Cambia a «Lista».
2. **Ficha:** «Ver local →». Mira equipo, horario y verificación. «Volver» regresa a donde estabas, con tu búsqueda.
3. **Proponer un local:** los 4 pasos, un plato con foto y la casilla de permiso. Cierra a medias y vuelve: el borrador se recupera.
4. **Moderación:** menú ☰ → «Moderar propuestas (demo)». Tu envío sale arriba, junto a los 4 de ejemplo. Comprueba y decide; la decisión no se guarda.
5. **Negocio y retirada:** «¿Es tu local?» desde una ficha (elige el nivel y llega a «Revisión»), y «Pedir una retirada» desde el menú.

## Pantallas

Viven en `web/src/app/[locale]/`. Las direcciones son en inglés en los dos idiomas.

| Ruta | Para qué |
|---|---|
| `/` | Mapa con un marcador por local |
| `/list` | La misma información en lista (alternativa accesible al mapa) |
| `/place/[slug]` | Ficha: platos, equipo, horario, verificación, cómo llegar |
| `/propose` | Proponer un local, 4 pasos, con borrador y fotos de platos |
| `/correct/[slug]` | Sugerir una corrección, 3 pasos |
| `/business/[slug]` | Contar el equipo, 4 pasos, con historias con consentimiento y fotos |
| `/removal` | Pedir una retirada, 3 pasos |
| `/moderation` | Cola, comprobaciones, decisión y registro (provisional, desde el menú) |
| `/about` · `/verification` · `/contact` | Qué es, cómo se verifica, contacto |
| `/privacy` · `/cookies` · `/legal` | Privacidad, cookies y almacenamiento, aviso legal |

## Qué pasa al enviar un formulario

```
Formulario (ProposeForm, CorrectForm, BusinessForm, RemovalForm)
   │  valida paso a paso (lib/validation.ts) y reduce las fotos (lib/image.ts)
   ▼
lib/data/index.ts   ← FRONTERA con el backend
   │  submitProposal / submitCorrection / submitBusinessTeam / submitRemoval
   │  hoy: descarta si el campo oculto «website» viene relleno, espera 0,6 s y guarda
   │  mañana: POST /api/v1/… con la misma firma
   ▼
lib/data/outbox.ts   (solo prototipo)
   │  resumen en localStorage, máx. 20: correo enmascarado, sin nombres ni historias,
   │  solo el número de fotos; las fotos no se guardan en ningún sitio
   ▼
ModerationPanel / ModerationDetail
      leen getModerationQueue() + getDemoSubmissions(); decideModeration() hoy no guarda nada
```

La lectura sigue el mismo patrón: `getRestaurants()`, `getRestaurant()` y `getFoodTags()` devuelven los mocks de `lib/data/mock-restaurants.ts`.

## Dónde está cada cosa

| Carpeta | Contenido |
|---|---|
| `src/app/[locale]/` | Las pantallas (páginas cortas que montan un componente) |
| `src/components/` | Formularios, mapa, tarjeta, ficha, moderación, cabecera y menú |
| `src/lib/data/` | **La frontera con el backend:** mocks, buzón de prueba y las funciones que llaman las pantallas |
| `src/lib/types.ts` | Los tipos de todo; serán el contrato del API |
| `src/lib/*.ts` | Utilidades: búsqueda, distancia, horarios, fotos, borrador, «Volver», menú |
| `messages/` | Todos los textos, `es.json` y `en.json` con las mismas claves |
| `e2e/` | Pruebas de navegador, con accesibilidad en todas las pantallas |

## Qué cambia con el backend

**Cambia**
- Las funciones de `lib/data/index.ts`: de datos de ejemplo a `fetch`.
- El buzón de prueba desaparece: la cola de moderación la alimenta el servidor.
- `decideModeration()` guarda de verdad y deja registro de auditoría.
- Las fotos se suben (Cloudflare R2, con una URL que firma el servidor) en vez de quedarse en el navegador.
- Moderación se protege con enlace mágico (ADR 0007) y se oculta del menú.
- `/place/[slug]` pasa a leer la ficha desde el navegador, con estado de carga (ADR 0005).

**No cambia**
- Las pantallas, los formularios, los textos y las pruebas de accesibilidad.
- Los tipos de `lib/types.ts`, salvo ajustes pequeños.
- Las reglas de privacidad: qué se pide, qué se guarda y cuánto tiempo.

**Decisión que condicionaba todo (propuesta el 2026-10-13, ADR 0005).** La web es estática (`output: 'export'`) y las fichas se generan al compilar con los datos de ejemplo. Con datos reales los locales se **leen desde el navegador**, por zona del mapa o ciudad, en vez de recompilar la web al publicar. P1, P4, P5 y P9 están propuestas en los ADR 0005–0008.
