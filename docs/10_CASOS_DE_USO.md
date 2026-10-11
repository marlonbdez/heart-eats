# 10 · Casos de uso

> **Estado:** borrador v0.2 · entregas 1 y 2a (actores, paquetes, casos de uso y fichas de Descubrir e Información). Pendiente: fichas de Colaborar, Negocio y Moderación, diagramas de actividad y de estados, modelo de dominio y matriz de trazabilidad (ver §7).
> Complementa a `04_DISENO_UI.md` (flujos y pantallas) y a `07_VERIFICACION.md` (proceso de moderación).

## 1. Para qué sirve este documento

Es el mapa de **qué hace HeartEats y para quién**, en lenguaje UML. Sirve para entender la aplicación de un vistazo, ver qué está hecho y qué falta, y decidir con criterio el orden de lo que viene.

Cada diagrama tiene debajo una tabla con lo mismo en texto, de modo que nada depende solo de la imagen. El detalle de cada CU (flujo, alternativas, reglas) está en las **fichas**, en [`casos-de-uso/`](casos-de-uso/README.md).

## 2. Convenciones

- **UML 2**: un diagrama de casos de uso por paquete. Un óvalo es un caso de uso (CU); un muñeco, un actor.
- `«include»`: el CU de origen **siempre** ejecuta al de destino.
- `«extend»`: el CU de origen **a veces** amplía al de destino, si se cumple la condición escrita junto a la flecha.
- Flecha con triángulo vacío: especialización (el hijo es una variante del padre).
- **Gris con «pendiente»**: CU identificado que aún no existe en la web.
- Identificadores `CU-nn`, estables: no se reutilizan aunque un CU desaparezca.
- **Estado** de cada CU:
  - **Hecho**: pantalla terminada; funciona con datos de ejemplo. Qué prueba e2e cubre cada CU se anotará en la matriz de trazabilidad (entrega 4).
  - **Hecho (envío simulado)**: la pantalla está terminada, pero lo que se envía solo llega al buzón de prueba del navegador (`outbox.ts`); con el servidor llegará de verdad.
  - **Pendiente**: no existe todavía.
- Los diagramas están en `modelado/*.puml` y se regeneran con `modelado/render.sh` (ver §8).

## 3. Actores

![Actores del sistema: Visitante, con dos especializaciones (Colaborador/a y Representante del negocio); Moderador/a; y dos actores externos, el servicio de mapas y la geolocalización del dispositivo.](modelado/00-actores.svg)

| Actor | Descripción |
|---|---|
| **Visitante** | Cualquier persona. Ve, busca y consulta sin registrarse (decisión de diseño n.º 7). |
| **Colaborador/a** | Visitante que propone un local o sugiere una corrección. No es un usuario registrado: es un papel que se adopta al hacerlo. |
| **Representante del negocio** | Visitante que habla en nombre de un local: cuenta su equipo y da los consentimientos. Moderación confirma por correo que lo es antes de publicar nada. |
| **Moderador/a** | Revisa las solicitudes y decide. Al inicio, Marlon. Hoy se entra desde el menú (provisional); con la autenticación (P5) será la única persona con acceso. |
| **Servicio de mapas** *(externo)* | Pone el mapa y las indicaciones para llegar (ADR 0002). |
| **Geolocalización del dispositivo** *(externo)* | Da la posición, solo tras pulsar «Cerca de mí». |

Quien pide una retirada (CU-13) es un Visitante: puede ser el negocio o la persona cuyos datos aparecen.

## 4. Paquetes

![Cinco paquetes (Descubrir, Colaborar, Negocio, Moderación e Información) y sus dependencias: Colaborar y Negocio dependen de Descubrir; Negocio, de Colaborar; y Moderación, de Colaborar, Negocio y Descubrir.](modelado/00-paquetes.svg)

| Paquete | Qué agrupa | CU |
|---|---|---|
| **Descubrir** | Encontrar un sitio y ver su ficha | CU-01 a CU-09 |
| **Colaborar** | Proponer, corregir, pedir retirada y el envío común | CU-10 a CU-14 |
| **Negocio** | El negocio cuenta su equipo y consiente | CU-15 a CU-17 |
| **Moderación** | Revisar y decidir | CU-18 a CU-27, CU-33, CU-34 |
| **Información** | Páginas de contenido e idioma | CU-28 a CU-32 |

La flecha `A ⇢ B` significa «A necesita a B». La dependencia es de dirección única: lo que se aprueba en Moderación acaba en las fichas de Descubrir, pero Descubrir no sabe nada de Moderación.

## 5. Casos de uso por paquete

### 5.1 Descubrir

Fichas: [casos-de-uso/descubrir.md](casos-de-uso/descubrir.md).

![Casos de uso de Descubrir: el Visitante explora el mapa o la lista, busca, filtra, ordena por cercanía y consulta la ficha de un local, con sus extensiones.](modelado/01-descubrir.svg)

| ID | Caso de uso | Actor | Qué hace | Ruta | Flujo | Estado |
|---|---|---|---|---|---|---|
| CU-01 | Explorar el mapa | Visitante; Servicio de mapas | Ve los locales sobre el mapa y toca un marcador para ver su tarjeta. Si el mapa no se puede mostrar, se ofrece la lista. | `/` | F1 | Hecho |
| CU-02 | Ver la lista de locales | Visitante | Lo mismo que CU-01 en forma de lista; es la alternativa accesible al mapa. | `/list` | F1 | Hecho |
| CU-03 | Buscar sitios | Visitante | Busca por local, barrio, ciudad o código postal. Si lo escrito parece una comida, sugiere la categoría. Extiende CU-01 y CU-02. | `/`, `/list` | F1 | Hecho |
| CU-04 | Filtrar por tipo de comida | Visitante | Elige una o varias categorías con icono. El tipo de discapacidad **no** es un filtro (decisión de diseño n.º 9). | `/`, `/list` | F1 | Hecho |
| CU-05 | Ordenar por cercanía | Visitante; Geolocalización | Con «Cerca de mí» pide la ubicación (solo tras el gesto) y ordena por distancia. Avisa si se deniega, no está disponible o está fuera de la zona. | `/`, `/list` | F1 | Hecho |
| CU-06 | Consultar la ficha de un local | Visitante | Ve platos estrella, horario y contacto del local. Incluye CU-09. | `/place/[slug]` | F1 | Hecho |
| CU-07 | Llegar al local o contactarlo | Visitante; Servicio de mapas | Abre las indicaciones, llama o abre la web del local. | `/place/[slug]` | F1 | Hecho |
| CU-08 | Consultar el equipo del local | Visitante | Ve «El equipo detrás de cada plato» en el nivel que el negocio eligió (cifras; áreas y tipos; historias). Sin la confirmación del negocio, o en equipos de menos de 5 personas, solo la cifra. | `/place/[slug]` | F1, F3 | Hecho |
| CU-09 | Consultar la verificación del local | Visitante | Ve la insignia (🟢 o 🟡), el método y la fecha, y un enlace a «Cómo verificamos». | `/place/[slug]` | F1 | Hecho |

### 5.2 Colaborar

![Casos de uso de Colaborar: el Colaborador/a propone un local y sugiere correcciones; el Visitante pide una retirada. Los tres incluyen el envío a moderación; gestionar el borrador extiende a proponer.](modelado/02-colaborar.svg)

| ID | Caso de uso | Actor | Qué hace | Ruta | Flujo | Estado |
|---|---|---|---|---|---|---|
| CU-10 | Proponer un local | Colaborador/a | Formulario de 4 pasos: el local, los platos, el equipo (solo cómo lo conoce y un enlace; nunca nombres ni datos de salud) y el envío, con correo opcional. | `/propose` | F2 | Hecho (envío simulado) |
| CU-11 | Gestionar el borrador de la propuesta | Colaborador/a | Mientras escribe, se guarda en el dispositivo (7 días, sin correo ni web); se recupera al volver y se borra al enviar o con «Empezar de cero». Extiende CU-10. | `/propose` | F2 | Hecho |
| CU-12 | Sugerir una corrección | Colaborador/a | Elige qué está mal (dirección, horario, cerrado, equipo, otro), lo describe y, si quiere, aporta una prueba. | `/correct`, `/correct/[slug]` | F4 | Hecho (envío simulado) |
| CU-13 | Pedir una retirada | Visitante | 3 pasos, sin cuenta: qué retirar, en qué local y correo obligatorio para confirmar la identidad. | `/removal` | F6 | Hecho (envío simulado) |
| CU-14 | Enviar una solicitud a moderación | *(interno)* | Paso común de CU-10, CU-12, CU-13 y CU-15: valida, descarta el envío si el campo trampa viene relleno, enmascara el correo y deja la solicitud en la cola. | `lib/data` | — | Hecho (envío simulado) |

### 5.3 Negocio

![Casos de uso de Negocio: el Representante del negocio cuenta el equipo, lo que incluye previsualizar la ficha y enviar la solicitud; dar el consentimiento de una historia extiende a contar el equipo cuando el nivel es historias con nombre.](modelado/03-negocio.svg)

| ID | Caso de uso | Actor | Qué hace | Ruta | Flujo | Estado |
|---|---|---|---|---|---|---|
| CU-15 | Contar el equipo del negocio | Representante del negocio | 4 pasos: «tú decides cuánto contar», nivel (solo cifras, áreas y tipos, historias con nombre), datos y revisión con correo obligatorio. En equipos de menos de 5 personas solo se pide y se muestra la cifra. | `/business`, `/business/[slug]` | F3 | Hecho (envío simulado) |
| CU-16 | Previsualizar la ficha | Representante del negocio | Ve «así se verá» con el mismo componente que la ficha pública. Incluido en CU-15. | `/business/[slug]` | F3 | Hecho |
| CU-17 | Dar el consentimiento de una historia | Representante del negocio | Cada historia lleva su permiso, de la persona o de su representante legal; sin él, no se puede enviar. Extiende CU-15 con el nivel «Historias con nombre» (hasta 3). | `/business/[slug]` | F3 | Hecho |

El texto de consentimiento es **provisional** hasta la revisión legal (`08_PRIVACIDAD_LEGAL.md`).

### 5.4 Moderación

![Casos de uso de Moderación: el Moderador/a consulta la cola y revisa solicitudes (cuatro variantes según el tipo); aprobar, rechazar o pedir más información extienden a la revisión y registran la acción en la auditoría. La autenticación y la revisión de fichas sin actualizar aparecen en gris como pendientes.](modelado/04-moderacion.svg)

| ID | Caso de uso | Actor | Qué hace | Ruta | Flujo | Estado |
|---|---|---|---|---|---|---|
| CU-18 | Consultar la cola de solicitudes | Moderador/a | Ve pendientes y resueltas, con tipo, zona, antigüedad y aviso ⚠ si hay posible duplicado, cadena o falta de pruebas. | `/moderation` | F5 | Hecho (datos de ejemplo) |
| CU-19 | Revisar una solicitud | Moderador/a | Abre el detalle: datos, pruebas, avisos y comprobaciones obligatorias. **Abstracto**: se concreta en CU-20 a CU-23. | `/moderation` | F5 | Hecho |
| CU-20 | Revisar la propuesta de un local | Moderador/a | Comprueba que existe, es independiente, hay pruebas del equipo inclusivo y el negocio ha confirmado que quiere aparecer. | `/moderation` | F5 | Hecho |
| CU-21 | Revisar una corrección | Moderador/a | Ve el dato antes y después y comprueba que es correcto. | `/moderation` | F5 | Hecho |
| CU-22 | Revisar el equipo de un negocio | Moderador/a | Comprueba que quien envía representa al negocio, que las cifras son coherentes y, si hay historias, que cada una trae su consentimiento. Nunca ve nombres ni textos de historias. | `/moderation` | F5 | Hecho |
| CU-23 | Revisar una petición de retirada | Moderador/a | Comprueba la identidad de quien la pide antes de ocultar nada. | `/moderation` | F5, F6 | Hecho |
| CU-24 | Aprobar y publicar | Moderador/a | Solo se activa con todas las comprobaciones hechas; en un local nuevo, también con nivel de insignia y método elegidos. Extiende CU-19. | `/moderation` | F5 | Hecho (decisión simulada) |
| CU-25 | Rechazar con motivo | Moderador/a | Motivo obligatorio: no independiente, sin pruebas, duplicado, fuera de zona u otro. Extiende CU-19. | `/moderation` | F5 | Hecho (decisión simulada) |
| CU-26 | Pedir más información | Moderador/a | Devuelve la solicitud con una nota obligatoria. Extiende CU-19. | `/moderation` | F5 | Hecho (decisión simulada) |
| CU-27 | Registrar la acción en la auditoría | *(interno)* | Cada decisión deja quién, qué y cuándo. Incluido en CU-24, CU-25 y CU-26. | `/moderation` | F5 | Hecho (se muestra en el detalle; el registro real llega con el servidor) |
| CU-33 | Autenticarse (enlace mágico) | Moderador/a | Entrar sin contraseña con un enlace enviado al correo. Al llegar, se oculta la entrada del menú. | — | — | **Pendiente** (decisión P5) |
| CU-34 | Revisar fichas sin actualizar | Moderador/a | Revisar las fichas con más de 12 meses sin verificar. Hoy solo se marcan con «necesita revisión»; no hay flujo para tratarlas (`07_VERIFICACION.md`). | — | — | **Pendiente** |

El contacto con el negocio para confirmar que quiere aparecer (paso 4 de `07_VERIFICACION.md`) ocurre **fuera** de la web, por correo o teléfono, y por eso no es un CU.

### 5.5 Información

Fichas: [casos-de-uso/informacion.md](casos-de-uso/informacion.md).

![Casos de uso de Información: el Visitante consulta qué es HeartEats, cómo se verifica, la privacidad y datos, contacta con el proyecto y cambia el idioma.](modelado/05-informacion.svg)

| ID | Caso de uso | Actor | Qué hace | Ruta | Flujo | Estado |
|---|---|---|---|---|---|---|
| CU-28 | Consultar qué es HeartEats | Visitante | Qué es el proyecto y por qué existe. | `/about` | — | Hecho |
| CU-29 | Consultar cómo se verifica | Visitante | Qué significan las insignias y cómo se comprueba cada local. | `/verification` | — | Hecho |
| CU-30 | Consultar privacidad y datos | Visitante | Qué se guarda y cuánto tiempo (**provisional** hasta la revisión legal). | `/privacy` | — | Hecho |
| CU-31 | Contactar con el proyecto | Visitante | Muestra `contact@hearteats.org`, solo de recepción. | `/contact` | — | Hecho |
| CU-32 | Cambiar el idioma | Visitante | Español o inglés desde el menú; la URL cambia de prefijo (ADR 0003). El inglés necesita revisión nativa. | menú ☰ | — | Hecho |

## 6. Qué nos dice el modelo

- **Cobertura del front**: de los 34 CU identificados, 32 tienen ya su pantalla; los 2 pendientes (CU-33 y CU-34) dependen de decisiones de backend o de un flujo aún por diseñar.
- **Lo «simulado» es una sola cosa**: el envío (CU-14) y la decisión (CU-24 a CU-27). Cuando haya servidor, se cambia en `web/src/lib/data/` y el resto de pantallas no se toca.
- **Hay un único punto de entrada de datos** (CU-14) para cuatro flujos. Es el lugar natural para el límite de envíos (rate limit) y la validación en servidor.
- **Hueco sin CU**: aportar la foto y los platos de un local. Hoy no existe ningún flujo; la decisión n.º 4 dice que los aporta el negocio, pero no cómo. Queda como pregunta abierta (§7).

## 7. Siguientes entregas y preguntas abiertas

Entregas previstas, cada una en su PR:

1. ✅ Actores, paquetes y diagramas de casos de uso (este documento).
2. Fichas detalladas de cada CU (resumen, precondiciones, poscondiciones, flujo principal y alternativos, requisitos especiales), en dos PR:
   - 2a ✅ Descubrir e Información (CU-01 a CU-09 y CU-28 a CU-32).
   - 2b Colaborar, Negocio y Moderación (el resto).
3. Diagrama de actividad con carriles del ciclo «proponer → verificar → publicar», diagrama de estados de una solicitud y modelo de dominio.
4. Matriz de trazabilidad: CU ↔ ruta ↔ componente ↔ prueba e2e ↔ documento.

Preguntas abiertas que el modelo ha hecho aflorar:

- ❓ ¿Cómo aporta un negocio la foto y los platos de su local? (sin CU hoy)

## 8. Regenerar los diagramas

Hace falta `plantuml` y `graphviz`:

```bash
brew install plantuml graphviz
```

Después, desde `docs/modelado/`:

```bash
./render.sh
```

Los `.puml` son la fuente; los `.svg` se versionan para que se vean directamente en GitHub y desde el móvil. El estilo común está en `modelado/estilo.puml`: fondo blanco (se lee igual en tema claro y oscuro) y texto oscuro sobre crema.
