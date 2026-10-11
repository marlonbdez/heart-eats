# Fichas de casos de uso

Una ficha por caso de uso (CU), agrupadas por paquete. El catálogo, los actores y los diagramas están en [`../10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md); aquí está el detalle de cada uno.

## Fichas disponibles

| Paquete | CU | Ficha |
|---|---|---|
| Descubrir | CU-01 a CU-09 | [descubrir.md](descubrir.md) |
| Información | CU-28 a CU-32 | [informacion.md](informacion.md) |
| Colaborar | CU-10 a CU-14 | [colaborar.md](colaborar.md) |
| Negocio | CU-15 a CU-17 | [negocio.md](negocio.md) |
| Moderación | CU-18 a CU-27, CU-33, CU-34 | [moderacion.md](moderacion.md) |

## Cómo leer una ficha

Todas siguen el mismo orden:

- **Actores**: quién lo inicia (principal) y quién interviene (secundario).
- **Resumen**: qué consigue el actor, en dos o tres frases.
- **Precondiciones**: lo que tiene que ser cierto antes de empezar.
- **Poscondiciones**: lo que es cierto al terminar bien.
- **Flujo principal**: los pasos del caso normal, numerados. Se indica quién actúa: **Visitante**, **Sistema**…
- **Flujos alternativos y excepciones**: cada uno lleva el número del paso donde se desvía (`3a` = alternativa al paso 3).
- **Reglas y requisitos especiales**: privacidad, accesibilidad y decisiones de diseño que condicionan el CU.
- **Relaciones**: `include`, `extend` y navegación hacia otros CU.
- **Implementación**: ruta, componentes y funciones donde vive hoy, para poder encontrarlo en el código.
- **Observaciones** *(solo si las hay)*: huecos o mejoras que el análisis ha hecho aflorar. No son decisiones: son candidatas a hoja de ruta.

El **estado** de cada CU está en la tabla de [`10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md).

## Convenciones de estas fichas

- Los textos de interfaz se citan entre «comillas» tal como salen en español.
- «Datos de ejemplo» significa que hoy se leen de `web/src/lib/data/mock-*.ts`; con el servidor vendrán de la API sin tocar las pantallas.
- Un flujo alternativo que depende del servidor se marca con *(con servidor)*.
