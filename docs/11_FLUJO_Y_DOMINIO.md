# 11 · Flujo y dominio

> **Estado:** borrador v0.2 · tres diagramas que completan [`10_CASOS_DE_USO.md`](10_CASOS_DE_USO.md): cómo avanza una propuesta, en qué estados está una solicitud y qué datos maneja la web.

## 1. Cómo avanza una propuesta

![Diagrama de actividad con cuatro carriles (Colaborador/a, Sistema, Moderador/a y Negocio). El Colaborador/a propone un local; el Sistema lo valida y, si el campo trampa está vacío, lo deja en la cola. El Moderador/a lo revisa y contacta con el negocio, que confirma que quiere aparecer. El Moderador/a rechaza, pide información o aprueba; el Sistema lo registra en la auditoría y, si se aprobó, publica la ficha. Después el negocio puede contar su equipo.](modelado/06-actividad-ciclo.svg)

Es el ciclo de un **local nuevo** (CU-10, CU-14, CU-20, CU-24 a CU-27). Corrección, equipo y retirada siguen el mismo camino con sus propias comprobaciones.

## 2. Estados de una solicitud

![Diagrama de estados. Una solicitud entra como Pendiente. Desde ahí puede pasar a Aprobada, a Rechazada o a Info pedida. Desde Info pedida vuelve a Pendiente si responde quien propuso, o pasa a Rechazada si no responde en 30 días.](modelado/07-estados-solicitud.svg)

| Estado | Significa | Hoy |
|---|---|---|
| **Pendiente** | Espera revisión. | Hecho |
| **Aprobada** | Se publica, se aplica o se oculta, según el tipo. | Simulado |
| **Rechazada** | Descartada con motivo. | Simulado |
| **Info pedida** | Moderación necesita saber más; espera la respuesta (30 días). | Cierra la solicitud |

**Decidido.** Una solicitud con «Info pedida» **vuelve a Pendiente** cuando quien propuso responde, y **se cierra sola como rechazada** si no responde en **30 días**. Mantiene todo el historial en una sola solicitud. Quien propone no tiene cuenta, así que responde desde un enlace del correo. Sin correo no se puede pedir información: Moderación solo puede rechazar o dejarla pendiente.

**Hoy** (prototipo): «Info pedida» manda la solicitud a «Resueltas», igual que un rechazo. Cambia con el servidor, no antes.

## 3. Qué datos maneja la web

![Modelo de dominio. Un Restaurante tiene de 0 a 3 Platos estrella, cero o más Horarios, una Verificación y, opcionalmente, un Equipo, que a su vez tiene hasta 3 Historias. Una Solicitud se refiere, opcionalmente, a un Restaurante y se resuelve con una Decisión, que deja una línea en el Registro de auditoría (solo con servidor).](modelado/08-dominio.svg)

| Concepto | Qué es | Dónde vive hoy |
|---|---|---|
| **Restaurante** | Un local publicado. | `lib/types.ts` (`Restaurant`), datos de ejemplo |
| **Plato estrella** | De 0 a 3 por local; opcional. | `SignatureDish` |
| **Verificación** | Nivel, método, fecha y si necesita revisión. | `Restaurant.verification` |
| **Equipo** | Lo que el negocio cuenta, en tres niveles. | `Team` |
| **Historia** | Con el permiso de cada persona; hasta 3. | `TeamStory` |
| **Solicitud** | Algo que llega y espera decisión: nuevo, corrección, equipo o retirada. | `ModerationItem`, en el buzón de prueba del navegador |
| **Decisión** | Aprobar, rechazar o pedir información. | `ModerationDecision`, sin guardar |
| **Registro de auditoría** | Quién, qué y cuándo. | No existe aún |

**A alinear con la especificación de datos.** `01_ESPECIFICACION_DATOS.md` define la solicitud (`Suggestion`) con dos tipos, `new` y `edit`, y tres estados, `pending`, `approved` y `rejected`. La web ya trabaja con **cuatro tipos** (nuevo, corrección, equipo y retirada) y **un estado más** (info pedida). Ya alineada (`type`: `new`, `edit`, `team`, `removal`; `status`: `pending`, `info_requested`, `approved`, `rejected`).
