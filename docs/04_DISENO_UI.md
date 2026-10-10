# 04 · Diseño UI/UX y flujos del MVP

> **Estado:** borrador v0.1 para revisión · Fase 0
> Base: §4 y §13 de `00_HANDOFF.md`. ❓ = decisión abierta.

## 1. Personas y objetivos

| Persona | Quiere | Éxito |
|---|---|---|
| **Comensal** (principal, móvil, en la calle) | Encontrar un buen sitio cerca y saber que su inclusión es real | De abrir la app a ver una ficha en < 30 s |
| **Colaborador/a** | Proponer un local o corregir un dato | Enviar una sugerencia en < 3 min |
| **Dueño/a de negocio** | Aparecer con el nivel de detalle que elija y corregir su ficha | Controla qué se muestra de su equipo |
| **Moderador/a** (Marlon al inicio) | Revisar sugerencias con evidencias | Cola clara, decidir en pocos clics |

## 2. Principios

1. **La comida y el negocio son los protagonistas.** Se elige por lo que apetece; la inclusión es un valor añadido, no una categoría de búsqueda. Todos los locales del mapa tienen equipo inclusivo, por eso el tipo de discapacidad **no es un filtro público**: vive solo en "El Equipo" de la ficha, si el negocio decide contarlo.
2. **Lenguaje digno**: sin pena, sin "inspiración", sin paternalismo. Revisión con personas del sector.
3. **Transparencia visible**: insignia y fecha de verificación siempre a la vista.
4. **Mobile-first y WCAG 2.2 AA** desde el primer prototipo: contraste, objetivos táctiles ≥ 44 px, teclado, lectores de pantalla.
5. **El mapa nunca es la única vía**: toda función tiene alternativa en lista.

## 3. Mapa de navegación

```
Mapa (inicio) ◄──► Lista
   │                 │
   └──► Ficha ◄──────┘
          │
          ├──► Sugerir corrección ─┐
          │                        ▼
          └────────────── Formulario de sugerencia ──► Confirmación

Páginas de contenido: Sobre el proyecto · Cómo verificamos · Para restaurantes · Privacidad
Moderación (acceso con magic link): Cola ──► Detalle de sugerencia ──► Aprobar / Rechazar
```

### Cabecera y menú lateral

Cabecera fija: botón de menú (☰) · logo · "Proponer un local"; debajo, buscador y filtros de comida. El ☰ abre un **panel lateral** (cierra con ×, tocando fuera o con Esc) con:

- **Navegar:** Mapa · Lista de locales
- **Colaborar:** Proponer un local · Corregir un dato · Soy de un negocio
- **Sobre HeartEats:** Qué es · Cómo verificamos · Privacidad y datos · Contacto
- **Pie:** selector de idioma (ES/EN) y lema del proyecto

En escritorio el panel puede quedar fijo a la izquierda. Todo accesible por teclado, con foco atrapado mientras está abierto.

## 4. Flujos

### F1 · Descubrir y ver una ficha (principal)
1. Abre la app → mapa centrado en la zona del usuario (o Madrid si no da permiso de ubicación ❓ geolocalización: pedir solo tras gesto del usuario).
2. Ve marcadores y clusters. El **buscador** encuentra **locales, ciudades/barrios y códigos postales** (si escribe una comida, sugiere la categoría como atajo). La **fila de categorías con icono** filtra por comida: pizza, hamburguesas, sushi, italiana, café, postres, tapas, menú del día, panadería, vegetariano.
3. Toca un marcador → **tarjeta de vista previa**: lidera el **plato estrella** (foto + nombre), después el local, distancia, sello "Equipo inclusivo" e insignia.
4. Toca la tarjeta → **ficha completa**.
5. Desde la ficha: cómo llegar (abre app de mapas del dispositivo), llamar, web, **Sugerir corrección**.
- Alternativa: conmutador **Mapa / Lista** con los mismos filtros y orden por distancia.
- Estados: cargando, sin resultados (sugerir ampliar filtros o proponer un local), error de red (reintentar), sin permiso de ubicación.

### F2 · Proponer un local nuevo
Desde el menú ☰, la cabecera o los estados vacíos. Formulario de **4 pasos** con barra de progreso, botones Atrás/Continuar y validación en línea:
1. **El local:** nombre (obligatorio), dirección, ciudad, código postal, tipo de comida (categorías con icono, multi-selección).
2. **Platos:** de 1 a 3 platos estrella (nombre + descripción corta opcional). Fotos: las aporta el negocio o se usan con su permiso; no se piden aquí.
3. **Equipo:** cómo conoce el negocio quien propone, un enlace que lo confirme y casilla "negocio independiente". Aviso: **no escribir nombres ni datos de salud de personas**; el detalle del equipo lo cuenta solo el negocio con consentimiento (F3).
4. **Enviar:** correo opcional (no público), resumen y aviso de privacidad.
Confirmación: "Gracias, lo revisaremos", volver al mapa o proponer otro.
- Antispam: honeypot y rate limit. ❓ Guardar borrador si se sale.

### F3 · Negocio cuenta su equipo y da los consentimientos
Pantalla para el negocio (acceso desde el menú "Soy de un negocio", desde el enlace «¿Es tu local?» de cada ficha —que deja el local ya elegido, `/business/[slug]`— o desde el contacto de moderación). **4 pasos**:
1. **Antes de empezar:** "Tú decides cuánto contar". Tres garantías: eliges el nivel, nadie aparece sin su permiso, se puede cambiar o retirar (borrado en máx. 7 días ❓). Aquí se elige también **de qué local se trata** (lista de locales; si no está, enlace a «Proponer un local»).
2. **Nivel:** tres tarjetas con ejemplo de cómo se verá: **Solo cifras** (recomendado para empezar), **Áreas y tipos**, **Historias con nombre** (solo con permiso de cada persona).
3. **Datos:** personas en el equipo y cuántas tienen discapacidad (validaciones: ≥1, ≤ total); en nivel medio, áreas y tipos de discapacidad sin identificar; en nivel máximo, hasta 3 historias, cada una con **su propio consentimiento** (la persona o su representante legal).
   - Áreas y tipos de discapacidad se eligen **por separado**, sin cruzarlos (ver `01_ESPECIFICACION_DATOS.md`).
   - Equipos de menos de 5 personas ❓: aviso, y solo se pide y se muestra la cifra, aunque se haya elegido otro nivel.
4. **Revisión:** vista previa fiel de la ficha ("así se verá", es el mismo componente que la ficha), **correo de contacto obligatorio** (privado: moderación lo usa para confirmar que quien envía es del negocio, sin cuentas) y casilla de responsabilidad; envío a moderación.
- El texto de consentimiento es **provisional** y debe revisarlo un profesional antes del lanzamiento.
- Una historia sin consentimiento marcado no se puede enviar.

### F4 · Sugerir corrección
Desde la ficha: elegir qué está mal (dirección, horario, ha cerrado, información del equipo, otro) → describir + evidencia opcional → enviar. Mismo patrón que F2, más corto.

### F5 · Moderación
Pantalla de uso interno (acceso por magic link, no aparece en el menú público), **pensada primero para el móvil**: la cola y el detalle son dos vistas, una a la vez, con botón «Volver a la lista»; a partir de 900 px se ven juntas. Prototipo en `/moderation`, con datos de ejemplo. Dos zonas:
- **Cola (izquierda en escritorio):** pestañas Pendientes / Resueltas; cada tarjeta indica tipo (Nuevo local / Corrección), zona, antigüedad y aviso ⚠ si hay posible duplicado o cadena.
- **Detalle (derecha en escritorio):** datos propuestos (o diff antes/después en correcciones), pruebas aportadas y alertas.
  - **Comprobaciones obligatorias** para un local nuevo: existe · es independiente · hay pruebas del equipo inclusivo · **el negocio ha confirmado que quiere aparecer**.
  - **Decisión:** *Aprobar y publicar* (solo se activa con las cuatro comprobaciones y con nivel 🟢/🟡 y método elegidos), *Pedir más información* (con nota) o *Rechazar* (motivo obligatorio: no independiente, sin pruebas, duplicado, fuera de zona, otro).
  - **Registro de auditoría** de cada acción (quién, qué, cuándo).
- Los datos de contacto de quien propone aparecen enmascarados.

## 5. Inventario de pantallas

| # | Pantalla | Prioridad | Notas |
|---|---|---|---|
| 1 | Mapa principal | ★★★ | marcadores, clustering, buscador, filtros, tarjeta |
| 2 | Lista | ★★★ | alternativa accesible al mapa |
| 3 | Panel de filtros | ★★★ | bottom sheet en móvil, lateral en escritorio |
| 4 | Ficha | ★★★ | cabecera, Equipo (3 niveles), horarios, contacto, insignia |
| 5 | Formulario de sugerencia (4 pasos) | ★★★ | |
| 6 | Confirmación de envío | ★★ | |
| 7 | Elección de nivel del equipo + consentimientos | ★★★ | el más delicado |
| 8 | Páginas de contenido (4) | ★★ | |
| 9 | Moderación: cola + detalle | ★★ | versión mínima |
| 10 | Estados vacíos/error | ★★ | |

## 6. Componentes clave

- **Insignia de verificación** 🟢🟡⚪ con texto (no solo color) + método + fecha.
- **Bloque "El Equipo"** con tres variantes (mínimo / medio / máximo).
- **Marcador y cluster** accesibles (foco por teclado, etiqueta legible).
- **Tarjeta de restaurante** (reutilizada en mapa y lista).
- **Chip de filtro**, **stepper** del formulario, **bloque de consentimiento**.

## 7. Identidad visual (propuesta inicial)

- Logo: galleta con forma de corazón y un mordisco ([ADR 0004](adr/0004-logo.md)). Paleta cálida (terracota/ámbar sobre crema), alto contraste de texto.
- Tipografía de alta legibilidad (valorar una pensada para dislexia para el cuerpo de texto).
- Modo claro y oscuro. Respeta `prefers-reduced-motion`.
- Iconos siempre con etiqueta de texto; la información nunca depende solo del color.

## 8. Decisiones de diseño (cerradas el 2026-10-06)

Criterio rector: **simple, claro y útil; sin vanidad ni adornos. Servir, no vender.**

| # | Decisión | Motivo |
|---|---|---|
| 1 | Prototipo en **español**, con textos preparados para i18n (EN después) | Lanzamiento en Madrid |
| 2 | **Marcador del mapa uniforme**; la insignia de verificación va en la tarjeta y en la ficha | Un mapa limpio se lee mejor; la transparencia sigue visible al primer toque |
| 3 | **Ubicación solo tras pulsar "Cerca de mí"**; mientras tanto, mapa de Madrid | Privacidad y cero fricción |
| 4 | **Una foto por ficha en el MVP**, aportada por el negocio o con su permiso; sin foto, ilustración neutra | Evita problemas de derechos de imagen y mantiene el MVP simple |
| 5 | "Para restaurantes" es **página informativa + correo de contacto**, sin formulario propio | Menos que construir y moderar |
| 6 | **Tipografía del sistema** legible, sin fuentes externas | Carga rápida, accesible, sin dependencias |
| 7 | **Sin cuenta para el público**: ver, buscar y proponer sin registrarse | Cero barreras |
| 8 | **Sin gamificación, sin puntuaciones ni reseñas** en el MVP | No es el objetivo |
| 9 | **Filtros por tipo de comida**, no por discapacidad. La inclusión se muestra como sello sobrio ("Equipo inclusivo") | Promocionar el negocio, no etiquetar a las personas |
| 10 | **Cada ficha destaca 1–3 platos estrella** (nombre, descripción corta, foto opcional) | Es lo que mueve a ir |
| 13 | **Buscador = sitios** (local, ciudad/barrio, código postal); **comida = categorías con icono**. Direcciones exactas fuera del MVP (requieren geocodificador, P4) | Cada cosa en su sitio, sin duplicar |
| 12 | **Cabecera con menú lateral (☰)** que agrupa navegación, colaboración e información | Pantalla principal limpia y todo fácil de encontrar |
| 11 | En la ficha, el bloque de verificación va **después** del contenido gastronómico | Transparente pero sin protagonismo |

## 9. Gate de aprobación

- [ ] Flujos F1–F5 recorridos en prototipo
- [ ] Revisión de accesibilidad básica
- [ ] Revisión de lenguaje (idealmente con alguien del sector)
- [ ] Aprobación de Marlon
- [ ] Datos y API alineadas con las pantallas
