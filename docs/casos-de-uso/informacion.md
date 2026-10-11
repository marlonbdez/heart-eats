# Paquete Información · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md` §5.5](../10_CASOS_DE_USO.md). Cómo leer una ficha: [README](README.md).

Páginas de texto y cambio de idioma. Son de **solo lectura**, no dependen de ningún otro paquete y se llegan desde el menú ☰ («Sobre HeartEats»). Los CU-28 a CU-31 comparten el mismo componente (`ContentPage`) y el mismo patrón, descritos una sola vez aquí:

- Un título `h1`, una introducción y secciones con `h2`; cada sección puede llevar párrafos, una lista (numerada o no) y enlaces al final.
- El contenido vive en `web/messages/es.json` y `en.json`, bajo un apartado por página (`about`, `verification`, `privacy`, `contact`), con las mismas claves en los dos idiomas.
- El enlace de salto «Ir al contenido» lleva al `<main id="contenido">`.
- Un enlace que empieza por `/` es una página de la web; uno que empieza por `https://` es externo.
- El texto en inglés necesita revisión nativa antes de abrir al público.

---

## CU-28 · Consultar qué es HeartEats

- **Actores:** Visitante.
- **Resumen:** El Visitante lee qué es el proyecto, por qué existe y cómo funciona, para decidir con calma si le interesa.
- **Precondiciones:** Ninguna.
- **Poscondiciones:** Conoce el propósito del proyecto y su carácter abierto y sin ánimo de lucro.

**Flujo principal**

1. **Visitante** abre «Qué es HeartEats» desde el menú (`/about`).
2. **Sistema** muestra la introducción y las secciones: *Por qué existe*, *Qué encontrarás aquí*, *Cómo funciona*, *Las personas del equipo*, *Abierto y sin ánimo de lucro* y *Dónde estamos*.
3. **Visitante** lee. La página no tiene enlaces: para ir a otra, usa el menú ☰.

**Flujos alternativos y excepciones**

- Ninguno.

**Reglas y requisitos especiales**

- Tono sereno y lenguaje digno, sin pena ni paternalismo (principio de diseño n.º 2).
- Debe leerse bien en móvil a 320 px y con el contraste de WCAG 2.2 AA.
- Cualquier cambio de texto se hace en español **y** en inglés a la vez.

**Relaciones:** ninguna (ni `include` ni `extend`).

**Implementación:** `/about` · `ContentPage` · `messages/*.json` → `about`.

---

## CU-29 · Consultar cómo se verifica

- **Actores:** Visitante.
- **Resumen:** El Visitante entiende qué significan las insignias de las fichas y cómo se comprueba cada local antes de publicarlo.
- **Precondiciones:** Ninguna. Se llega desde el menú o desde el enlace «¿Cómo verificamos?» de una ficha (CU-09).
- **Poscondiciones:** Sabe qué hay detrás de cada insignia y qué negocios tienen cabida.

**Flujo principal**

1. **Visitante** abre «Cómo verificamos» (`/verification`).
2. **Sistema** muestra las secciones: *Qué pasa cuando alguien propone un local*, *Qué significa cada nivel*, *Cómo lo comprobamos*, *Qué negocios tienen cabida*, *Mantener los datos al día* y *Cuidamos tu privacidad al revisar*.
3. **Visitante** lee. La página no tiene enlaces: para seguir, usa el menú ☰ o el botón de atrás.

**Flujos alternativos y excepciones**

- **1a.** Llega desde la ficha de un local: al terminar, vuelve con el botón de atrás del navegador.

**Reglas y requisitos especiales**

- Debe reflejar `07_VERIFICACION.md`: nada se publica sin revisión humana y sin el visto bueno del propio negocio; en el MVP solo se publican fichas 🟢 o 🟡.
- Si cambia el proceso de verificación, hay que cambiar este texto (ES y EN) en la misma PR.

**Relaciones:** destino del enlace de CU-09.

**Implementación:** `/verification` · `ContentPage` · `messages/*.json` → `verification`.

---

## CU-30 · Consultar privacidad y datos

- **Actores:** Visitante.
- **Resumen:** El Visitante lee, en lenguaje llano, qué datos se tratan, para qué, durante cuánto tiempo y cuáles son sus derechos.
- **Precondiciones:** Ninguna. Se llega desde el menú, desde «Contacto» y desde los formularios.
- **Poscondiciones:** Conoce qué se guarda de él y cómo ejercer sus derechos.

**Flujo principal**

1. **Visitante** abre «Privacidad y datos» (`/privacy`).
2. **Sistema** muestra el aviso de que el texto es un borrador y las secciones: *En pocas palabras*, *Esta versión es una prueba*, *Quién es responsable de los datos*, *Qué datos tratamos y para qué*, *Las personas del equipo*, *Terceros que intervienen*, *Datos abiertos*, *Tus derechos*, *Seguridad* y *Cambios en este texto*.
3. **Visitante** lee. Si quiere saber a quién dirigirse, sigue «Contacto» (CU-31); si quiere ejercer un derecho, «Pedir una retirada» (CU-13) o «Escribir a contact@hearteats.org».

**Flujos alternativos y excepciones**

- Ninguno.

**Reglas y requisitos especiales**

- **Provisional**: los textos y los plazos de conservación no son definitivos hasta la revisión legal (`08_PRIVACIDAD_LEGAL.md`). Así lo dice la propia página.
- Debe describir **todo** lo que la web guarda. Hoy, en el navegador, y solo en dos sitios: el buzón de envíos de prueba (`outbox.ts`, con el correo enmascarado y sin nombres ni historias) y el borrador de «Proponer un local» (`draft.ts`, 7 días, sin correo ni web).
- Antes del lanzamiento debe sumarse la política de cookies y almacenamiento y el aviso legal (aún no existen).
- Cualquier recogida de datos nueva se anota primero en `08_PRIVACIDAD_LEGAL.md` y después aquí.
- Consta como persona responsable provisional quien lanza el proyecto, hasta decidir la estructura legal (P6).

**Relaciones:** navegación hacia CU-13 y CU-31.

**Implementación:** `/privacy` · `ContentPage` · `messages/*.json` → `privacy`.

**Observaciones:** faltan el aviso legal y la política de cookies y almacenamiento; no hay CU ni página para ellos. Son trabajo de la fase 4 (hoja de ruta).

---

## CU-31 · Contactar con el proyecto

- **Actores:** Visitante.
- **Resumen:** El Visitante averigua por qué vía dirigirse al proyecto según lo que necesite, y dispone del correo para lo que no tenga formulario.
- **Precondiciones:** Ninguna.
- **Poscondiciones:** Sabe a dónde ir: a un formulario de la web o al correo del proyecto.

**Flujo principal**

1. **Visitante** abre «Contacto» (`/contact`).
2. **Sistema** muestra la introducción («Hay una vía para cada cosa. Casi todo se puede hacer desde la propia web.») y las secciones: *Proponer un local o corregir un dato*, *Si eres de un negocio*, *Retirar una historia o ejercer tus derechos* y *Errores de la web y código*.
3. **Visitante** sigue el enlace de la sección que le corresponde: «Proponer un local» (CU-10), «Corregir un dato» (CU-12), «Soy de un negocio» (CU-15) o «Pedir una retirada» (CU-13).

**Flujos alternativos y excepciones**

- **3a.** Lo que necesita no tiene formulario: «Escribir a contact@hearteats.org».
- **3b.** Ha encontrado un fallo de la web: «Avisar de un fallo», un enlace externo al seguimiento de incidencias del proyecto.

**Reglas y requisitos especiales**

- El correo del proyecto es **solo de recepción** y reenvía a la persona que lo gestiona (`09_CORREO.md`). Nunca se escribe en el repositorio un correo personal.
- Pedir una retirada no depende del correo: tiene su propio formulario (CU-13).

**Relaciones:** navegación hacia CU-10, CU-12, CU-13 y CU-15.

**Implementación:** `/contact` · `ContentPage` · `messages/*.json` → `contact`.

---

## CU-32 · Cambiar el idioma

- **Actores:** Visitante.
- **Resumen:** El Visitante cambia la web entre español e inglés desde el menú, y se queda en la misma pantalla.
- **Precondiciones:** El menú ☰ está abierto.
- **Poscondiciones:** La misma ruta se muestra en el otro idioma; la dirección cambia de prefijo (`/es/propose` ↔ `/en/propose`).

**Flujo principal**

1. **Visitante** abre el menú ☰ y mira el pie, «Idioma».
2. **Sistema** lista «Español» y «English». El idioma activo aparece como texto, no como enlace, y marcado como actual.
3. **Visitante** elige el otro idioma.
4. **Sistema** abre la misma ruta con el otro prefijo, cierra el menú y muestra todos los textos traducidos.

**Flujos alternativos y excepciones**

- **3a.** El Visitante elige el idioma que ya está activo: no es un enlace, no pasa nada.
- **4a.** Abre la raíz del sitio sin idioma (`/`): el Sistema lo lleva a español (idioma de lanzamiento).

**Reglas y requisitos especiales**

- Las URLs son **solo en inglés en todos los idiomas** (ADR 0003): solo cambia el prefijo.
- Cada enlace de idioma lleva `lang` y `hreflang`, para lectores de pantalla y buscadores.
- Todo texto nuevo va a la vez en `es.json` y `en.json`, con las mismas claves.
- El inglés necesita revisión nativa antes de abrir al público.

**Relaciones:** disponible desde cualquier pantalla.

**Implementación:** `Header` (pie del panel lateral) · `i18n/routing.ts`, `i18n/navigation.ts`.

**Observaciones**

- El enlace de idioma lleva solo la ruta: según el código, se pierden la búsqueda del mapa o la lista (`?q`, `?food`) al cambiar. Mejora pequeña.
- La primera visita siempre entra en español; la web no mira el idioma del navegador. Es coherente con la decisión de lanzar en Madrid, pero conviene revisarlo cuando se abra el inglés.
