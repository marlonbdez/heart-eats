# 10 · Casos de uso

> **Estado:** v1.0 · versión corta, pensada para leerse en cinco minutos.
> Complementa a `04_DISENO_UI.md` (pantallas) y a `07_VERIFICACION.md` (proceso de moderación).

## Qué hace HeartEats, en una frase

Cualquiera encuentra locales de hostelería de Madrid con equipos inclusivos; cualquiera puede proponer uno; una persona moderadora lo comprueba, y el propio negocio da el último sí antes de publicar.

## Diagrama

![Actores y casos de uso de HeartEats. Visitante: explorar mapa y lista, ver la ficha, entender el proyecto. Colaborador/a y Representante del negocio son Visitantes: el primero propone un local, sugiere una corrección o pide una retirada; el segundo cuenta su equipo y da el consentimiento. Moderador/a: revisa la cola y decide, consulta la auditoría y se autentica (pendiente). Servicio de mapas y geolocalización son actores externos de explorar.](modelado/casos-de-uso.svg)

## Actores

| Actor | Quién es |
|---|---|
| **Visitante** | Cualquiera. Ve, busca y consulta sin registrarse. |
| **Colaborador/a** | Visitante que propone, corrige o pide una retirada. Es un papel, no un usuario registrado. |
| **Representante del negocio** | Visitante que habla por un local: cuenta su equipo y consiente. Moderación lo confirma por correo antes de publicar. |
| **Moderador/a** | Revisa y decide. Al inicio, Marlon. Hoy se entra desde el menú (provisional, hasta P5). |
| **Servicio de mapas** y **Geolocalización** | Externos. El mapa y la posición («Cerca de mí», solo si se pulsa). |

## Casos de uso

| Caso de uso | Actor | Estado |
|---|---|---|
| Explorar mapa y lista (buscar, filtrar por comida, ordenar por cercanía) | Visitante | Hecho |
| Ver la ficha de un local (equipo, verificación, cómo llegar) | Visitante | Hecho |
| Entender el proyecto (qué es, cómo se verifica, privacidad, contacto, idioma) | Visitante | Hecho |
| Proponer un local (con borrador guardado 7 días) | Colaborador/a | Hecho, envío simulado |
| Sugerir una corrección | Colaborador/a | Hecho, envío simulado |
| Pedir una retirada | Colaborador/a | Hecho, envío simulado |
| Contar el equipo y dar el consentimiento | Representante | Hecho, envío simulado |
| Revisar la cola y decidir (aprobar, rechazar, pedir información) | Moderador/a | Hecho, decisión simulada |
| Consultar la auditoría | Moderador/a | Hecho, simulado |
| Autenticarse | Moderador/a | Pendiente (P5) |

*Envío simulado:* la pantalla está terminada, pero lo enviado solo llega al buzón de prueba del navegador. Con servidor, solo se cambia `web/src/lib/data/`.

## Cómo viaja una propuesta

Las cuatro acciones de Colaborar y Negocio (local nuevo, corrección, equipo, retirada) entran por el mismo sitio y llegan a la cola de moderación como **Pendiente**. Moderación la deja en uno de estos estados:

| Estado | Qué pasa |
|---|---|
| **Aprobada** | Nuevo local o equipo: se publica. Corrección: se aplica. Retirada: se oculta. |
| **Rechazada** | Se cierra con un motivo. |
| **Info pedida** | Hoy se cierra igual que rechazar (ver «Decisiones abiertas»). |

## Qué falta y qué decidir

**Falta, y no es del front:** aviso legal y política de cookies y almacenamiento; revisión nativa del inglés; pruebas con personas; y, con servidor, revisión legal de recibir nombres e historias de terceros, verificación real del negocio y un registro de auditoría con persona y hora.

**Decisiones abiertas** (candidatas a hoja de ruta, no decididas):

1. ¿Cómo aporta un negocio la foto y los platos de su local? Hoy no hay ningún flujo.
2. «Info pedida»: **recomiendo** que vuelva a Pendiente cuando quien propuso responde, y que se cierre sola pasado un plazo (14 días). La alternativa, tratarla como final, es más simple pero pierde el hilo.
3. `01_ESPECIFICACION_DATOS.md` define 2 tipos de solicitud y 3 estados; la web usa 4 y uno más. Alinear antes de escribir el servidor.
4. Pequeños: «Volver» en la ficha lleva siempre al mapa inicial; cambiar de idioma pierde la búsqueda; el plato estrella no es obligatorio al proponer; las fichas de más de 12 meses solo se marcan.

## Regenerar el diagrama

Requiere PlantUML y Graphviz (`brew install plantuml graphviz`).

```bash
docs/modelado/render.sh
```

El SVG se versiona para que se vea en GitHub y en el móvil.
