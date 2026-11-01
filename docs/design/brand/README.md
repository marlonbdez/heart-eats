# Marca: logo e imágenes

El logo es la galleta con forma de corazón y un mordisco (`docs/adr/0004-logo.md`). Estos archivos salen del mismo dibujo que `web/src/app/icon.svg` y `web/src/components/LogoMark.tsx`: si se retoca, hay que cambiar todos.

| Archivo | Para qué |
|---|---|
| `logo.svg` | El original vectorial, sin fondo. Escala a cualquier tamaño. |
| `logo-1024.png` | El mismo dibujo en PNG con fondo transparente. |
| `avatar-1024.png` | Icono cuadrado con fondo crema (`#fbf5ea`) y margen, para avatares de plataformas que recortan en círculo. |
| `social-preview-1280x640.png` | Imagen social del repositorio (*Settings → General → Social preview*) y tarjeta al compartir el enlace. |

Colores: masa `#E0A04A`, borde `#B4432A`, pepitas `#6B3A1E`; fondo `#fbf5ea`, texto `#2b211c`, «Eats» en `#b5482a`.

Los PNG se generaron desde el SVG con un navegador (Chromium) y la tipografía Inter para el texto del banner. La web usa la tipografía del sistema, así que el banner es una imagen aparte, no una referencia de estilo.

No hay logotipo con texto: la cabecera usa el logo y el nombre escrito, siempre **HeartEats**, junto.
