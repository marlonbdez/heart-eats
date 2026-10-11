# Información · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md). Páginas de texto y cambio de idioma, de solo lectura. CU-28 a CU-31 usan el mismo componente (`ContentPage`) y el texto vive en `web/messages/es.json` y `en.json`, con las mismas claves.

## CU-28 · Consultar qué es HeartEats
- **Quién:** Visitante.
- **Pasos:** menú ☰ → «Qué es HeartEats» (`/about`) → lee por qué existe, qué encontrará, cómo funciona y que es abierto y sin ánimo de lucro.
- **Reglas:** tono sereno y lenguaje digno; cualquier cambio de texto va en español **y** en inglés.

## CU-29 · Consultar cómo se verifica
- **Quién:** Visitante. Destino del enlace de CU-09.
- **Pasos:** menú o «¿Cómo verificamos?» de una ficha (`/verification`) → lee qué pasa al proponer, qué significa cada nivel y cómo se comprueba.
- **Reglas:** debe reflejar `07_VERIFICACION.md`; si el proceso cambia, cambia este texto en la misma PR.

## CU-30 · Consultar privacidad y datos
- **Quién:** Visitante.
- **Pasos:** menú o formularios (`/privacy`) → lee qué datos se tratan, para qué, cuánto tiempo y sus derechos. Desde aquí puede ir a Contacto (CU-31) o a «Pedir una retirada» (CU-13).
- **Reglas:** **provisional** hasta la revisión legal; debe describir todo lo que la web guarda (hoy, solo en el navegador: el buzón de pruebas y el borrador de «Proponer un local»); cualquier dato nuevo se anota primero en `08_PRIVACIDAD_LEGAL.md`.
- **También:** el menú tiene dos páginas hermanas del mismo tipo: «Cookies y almacenamiento» (`/cookies`: no hay cookies ni analítica; lista lo que guarda el navegador) y «Aviso legal» (`/legal`: quién está detrás, licencias, uso y responsabilidad).
- **Observación:** las dos son borrador: faltan domicilio y número fiscal del responsable (P6) y la revisión legal.

## CU-31 · Contactar con el proyecto
- **Quién:** Visitante.
- **Pasos:** menú → «Contacto» (`/contact`) → sigue el enlace que le corresponde: proponer un local (CU-10), corregir un dato (CU-12), soy de un negocio (CU-15) o pedir una retirada (CU-13). Para lo demás, `contact@hearteats.org`.
- **Reglas:** el correo es solo de recepción (`09_CORREO.md`); nunca se escribe un correo personal en el repo.

## CU-32 · Cambiar el idioma
- **Quién:** Visitante.
- **Pasos:** menú ☰ → pie «Idioma» → elige Español o English → se abre la misma ruta, con su búsqueda, con el otro prefijo (`/es/propose` ↔ `/en/propose`).
- **Reglas:** las URLs son solo en inglés (ADR 0003); el inglés necesita revisión nativa antes de abrir al público.
- **Observación:** la primera visita siempre entra en español.
