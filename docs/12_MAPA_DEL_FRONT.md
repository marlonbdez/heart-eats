# Mapa del front

> Guía corta para entender la web: cómo verla, qué pantallas hay y qué recorrido hace un envío. El estado del proyecto está en [`05_ROADMAP.md`](05_ROADMAP.md).

## Cómo verlo

La web es estática y vive en `web/`. **No lleva datos fijos**: pide los locales a la API desde el navegador (`http://localhost:3001` por defecto). Para ver algo en local hace falta el servidor con locales de ejemplo (`docker compose up` y `docker compose run --rm seed`, ver el README de la raíz) o, más simple, abrir `https://hearteats.org`.

```bash
cd web
npm install
npm run dev
```

Abre `http://localhost:3000/es` (o `/en`). Para el móvil, usa las herramientas del navegador con una pantalla de 360 px.

La versión compilada, como la ve el público y como la prueban los tests (que responden con sus propios datos, sin servidor):

```bash
npm run build
npx serve out -l 4567 --no-clipboard
```

Abre `http://localhost:4567/es`.

## Un paseo de prueba

Los pasos completos, con lo que debería pasar y los fallos a propósito, están en [`15_GUIA_DE_PRUEBAS.md`](15_GUIA_DE_PRUEBAS.md).

## Pantallas

Viven en `web/src/app/[locale]/`. Las direcciones son en inglés en los dos idiomas.

| Ruta | Para qué |
|---|---|
| `/` | Mapa: arranca en la zona elegida (selector «¿Dónde?», una ciudad) y pide los locales de lo que se ve al moverlo |
| `/list` | La misma información en lista (alternativa accesible al mapa) |
| `/place/[slug]` | Ficha: platos, equipo, horario, verificación, cómo llegar |
| `/propose` | Proponer un local, 4 pasos, con borrador y fotos de platos |
| `/correct/[slug]` | Sugerir una corrección, 3 pasos |
| `/business/[slug]` | Contar el equipo, 4 pasos, con historias con consentimiento y fotos |
| `/removal` | Pedir una retirada, 3 pasos |
| `/moderation` | Entrada con enlace por correo; cola, comprobaciones, decisión y, para administración, usuarios y registro |
| `/reply` | Respuesta a «Info pedida» (el enlace lleva el token en el fragmento) |
| `/about` · `/verification` · `/contact` | Qué es, cómo se verifica, contacto |
| `/privacy` · `/cookies` · `/legal` | Privacidad, cookies y almacenamiento, aviso legal |

## Qué pasa al enviar un formulario

```
Formulario (ProposeForm, CorrectForm, BusinessForm, RemovalForm)
   │  valida paso a paso (lib/validation.ts)
   ▼
lib/data/index.ts   ← FRONTERA con el backend
   │  submitProposal / submitCorrection / submitBusinessTeam / submitRemoval
   │  descarta en silencio si el campo oculto «website» viene relleno
   │  POST /api/v1/proposals · /corrections · /teams · /removals  → 202
   ▼
API → Suggestion «pending» → cola de moderación (§6.2 y §6.4 de 14_PRODUCCION.md)
```

La lectura sigue el mismo patrón: `getRegions()`, `getRestaurants(zona)`, `getRestaurantsIn(rectángulo)`, `getRestaurant()` y `getFoodTags()` llaman a la API. Las fotos no se envían todavía (`web/src/lib/features.ts`).

## Dónde está cada cosa

| Carpeta | Contenido |
|---|---|
| `src/app/[locale]/` | Las pantallas (páginas cortas que montan un componente) |
| `src/components/` | Formularios, mapa, selector de zona e idioma, tarjeta, ficha, moderación, cabecera y menú |
| `src/lib/data/` | **La frontera con el backend:** las funciones que llaman las pantallas |
| `src/lib/types.ts` | Los tipos de todo; son el contrato de la API |
| `src/lib/*.ts` | Utilidades: zona, búsqueda, distancia, horarios, idioma, borrador, «Volver», menú |
| `messages/` | Todos los textos, `es.json` y `en.json` con las mismas claves |
| `e2e/` | Pruebas de navegador, con accesibilidad en todas las pantallas |
