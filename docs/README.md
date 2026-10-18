# Documentación de HeartEats

| Documento | Contenido |
|---|---|
| [00_HANDOFF](00_HANDOFF.md) | Contexto, decisiones y hoja de ruta |
| [01_ESPECIFICACION_DATOS](01_ESPECIFICACION_DATOS.md) | Esquemas, validaciones, índices |
| [02_API_SPEC](02_API_SPEC.md) | Endpoints de la API, errores y reglas |
| [03_ARQUITECTURA](03_ARQUITECTURA.md) | Arquitectura: componentes, flujo de una propuesta y datos personales |
| [04_DISENO_UI](04_DISENO_UI.md) | Diseño UI/UX |
| [05_ROADMAP](05_ROADMAP.md) | Fases y hitos |
| [06_COSTES](06_COSTES.md) | Presupuesto y límites de los planes gratuitos |
| [07_VERIFICACION](07_VERIFICACION.md) | Verificación y moderación |
| [08_PRIVACIDAD_LEGAL](08_PRIVACIDAD_LEGAL.md) | RGPD, consentimientos, licencias |
| [09_CORREO](09_CORREO.md) | Correo del dominio |
| [10_CASOS_DE_USO](10_CASOS_DE_USO.md) | Actores, paquetes y casos de uso (UML) |
| [11_FLUJO_Y_DOMINIO](11_FLUJO_Y_DOMINIO.md) | Ciclo de una propuesta, estados de una solicitud y modelo de dominio |
| [12_MAPA_DEL_FRONT](12_MAPA_DEL_FRONT.md) | Cómo ver la web, pantallas y recorrido de un envío |
| [13_COPIAS](13_COPIAS.md) | Copia de seguridad semanal de la base de datos y cómo restaurarla |
| [14_PRODUCCION](14_PRODUCCION.md) | Producción: sistemas, variables, secretos, flujos, operación y recuperación |
| [15_GUIA_DE_PRUEBAS](15_GUIA_DE_PRUEBAS.md) | Guía paso a paso para probar la web en producción, con casos que salen bien y que deben fallar con calma |
| [GUIA_RESTAURANTES](GUIA_RESTAURANTES.md) | Guía para negocios |
| [design/](design/) | Prototipos de las pantallas del MVP |
| [casos-de-uso/](casos-de-uso/README.md) | Fichas detalladas de cada caso de uso |
| [modelado/](modelado/) | Fuentes PlantUML y SVG de los diagramas |
| [adr/](adr/) | Decision records (0001 licencias, 0002 mapa, 0003 idiomas y rutas, 0004 logo, 0005 hosting del backend, 0006 geocodificación, 0007 autenticación, 0008 moderación inicial) |

## Estado (2026-10-18)

La web y el servidor están **desplegados**: la web en Netlify (`hearteats.org`), la API en Railway (`api.hearteats.org`), la base de datos en Atlas, el correo con Resend y las copias semanales cifradas en R2. La web lee los locales de la API y envía a ella propuestas, correcciones, retiradas y equipos; la moderación y la administración (usuarios y registro) funcionan desde `/moderation`. **La fuente del estado actual es [05_ROADMAP](05_ROADMAP.md)**; **cómo está montado y cómo operarlo** está en [14_PRODUCCION](14_PRODUCCION.md). El handoff (`00_HANDOFF.md`) es el contexto original y en algunos puntos ya está superado (ver su aviso inicial). Las reglas de trabajo para sesiones nuevas están en [`CLAUDE.md`](../CLAUDE.md).

La web es internacional: idioma visible (inglés por defecto), selector de zona y mapa que carga los locales de lo que se ve. Para probarla de punta a punta, [15_GUIA_DE_PRUEBAS](15_GUIA_DE_PRUEBAS.md).

Pendiente principal: fotos (`POST /uploads` y R2), confirmar las regiones de los servicios, revisión legal y revisión nativa del inglés.
