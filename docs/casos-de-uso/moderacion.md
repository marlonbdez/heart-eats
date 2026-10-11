# Paquete Moderación · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md` §5.4](../10_CASOS_DE_USO.md). Cómo leer una ficha: [README](README.md). Proceso completo: [`../07_VERIFICACION.md`](../07_VERIFICACION.md).

Moderación es la **puerta de salida** de todo lo que llega por Colaborar y Negocio: nada se publica sin que una persona lo revise y sin el sí del propio negocio. Hoy es un prototipo (`/moderation`) con datos de ejemplo:

- La cola mezcla **4 solicitudes de ejemplo** (3 locales nuevos y 1 corrección) con lo que se haya enviado desde ese mismo navegador (buzón de prueba, [CU-14](colaborar.md#cu-14--enviar-una-solicitud-a-moderación)). Las de equipo y retirada solo aparecen de esa segunda forma.
- Las decisiones **no se guardan**: al recargar, la solicitud vuelve a estar pendiente.
- Se entra desde el menú ☰ («Moderar propuestas (demo)»), de forma provisional hasta resolver la autenticación (P5).

Pensada **primero para el móvil**: la cola y el detalle son dos vistas, una a la vez, con «Volver a la lista»; a partir de 900 px se ven juntas.

---

## CU-18 · Consultar la cola de solicitudes

- **Actores:** Moderador/a.
- **Resumen:** El Moderador/a ve qué solicitudes esperan y cuáles ya resolvió, y elige una para revisarla.
- **Precondiciones:** Tiene acceso a Moderación (hoy, el enlace del menú; con P5, el enlace mágico de [CU-33](#cu-33--autenticarse-enlace-mágico--pendiente)).
- **Poscondiciones:** Ve las solicitudes agrupadas en dos pestañas, con su tipo y antigüedad.

**Flujo principal**

1. **Moderador/a** abre `/moderation`.
2. **Sistema** muestra la pestaña «Pendientes (N)» con una tarjeta por solicitud: etiqueta del tipo («Nuevo local», «Corrección», «Equipo» o «Retirada»), nombre del local, zona y antigüedad («hoy», «hace 2 días»).
3. Si la solicitud tiene avisos del filtro automático (posible duplicado, posible cadena o falta de pruebas), la tarjeta lleva ⚠ «Revisar».
4. **Moderador/a** toca una tarjeta y pasa a [CU-19](#cu-19--revisar-una-solicitud-abstracto).

**Flujos alternativos y excepciones**

- **2a.** No queda nada pendiente: «No queda nada por revisar. Buen trabajo.»
- **2b.** **Moderador/a** abre «Resueltas (N)»: ve las que ya decidió, con su estado («Aprobada», «Rechazada» o «Info pedida»). Si no hay ninguna: «Todavía no has resuelto ninguna solicitud.»
- **4a.** Al volver de una solicitud, el foco regresa a su tarjeta (o a las pestañas si ya no está en esa lista).
- **4b.** *(solo prototipo)* El banner «Tienes N envíos de prueba hechos desde este navegador» ofrece «Borrar mis envíos de prueba».

**Reglas y requisitos especiales**

- Los datos de contacto de quien envía **aparecen enmascarados** (`p***@dominio`); nunca el correo entero.
- Las pestañas son botones con `aria-pressed`; la lista, un conjunto de botones; el aviso ⚠ lleva texto, no solo icono.
- Se prefiere una cola corta y clara: decidir en pocos toques.
- El banner «Prototipo con datos de ejemplo…» desaparecerá con el servidor, igual que el borrado de envíos de prueba.

**Relaciones:** incluye CU-33 (pendiente). Conduce a CU-19.

**Implementación:** `/moderation` · `ModerationPanel` · `getModerationQueue`, `getDemoSubmissions` · datos de ejemplo en `lib/data/mock-moderation.ts`.

---

## CU-19 · Revisar una solicitud *(abstracto)*

- **Actores:** Moderador/a.
- **Resumen:** El Moderador/a abre una solicitud y ve todo lo que necesita para decidir: qué se pide, quién y cuándo, los avisos del filtro automático, las pruebas, las comprobaciones obligatorias y el registro. **No se usa solo**: se concreta en [CU-20](#cu-20--revisar-la-propuesta-de-un-local), [CU-21](#cu-21--revisar-una-corrección), [CU-22](#cu-22--revisar-el-equipo-de-un-negocio) o [CU-23](#cu-23--revisar-una-petición-de-retirada), según el tipo.
- **Precondiciones:** Ha elegido una solicitud de la cola (CU-18).
- **Poscondiciones:** Tiene el panorama completo y puede decidir con CU-24, CU-25 o CU-26. Si no decide, la solicitud sigue pendiente.

**Flujo principal**

1. **Sistema** abre el detalle con el foco en el título (para los lectores de pantalla) y un botón «← Volver a la lista».
2. **Sistema** muestra la etiqueta del tipo, el nombre, la dirección, «Recibida hace N días» y el contacto enmascarado.
3. Si hay avisos, **Sistema** los lista bajo «Atención»: posible duplicado («Compruébalo antes de aprobar»), posible cadena («Se recomienda rechazar») o sin pruebas.
4. **Sistema** muestra el contenido propio del tipo (CU-20 a CU-23).
5. **Sistema** muestra las **comprobaciones** del tipo, como casillas que marca el Moderador/a.
6. **Sistema** ofrece la decisión ([CU-24](#cu-24--aprobar-y-publicar), [CU-25](#cu-25--rechazar-con-motivo), [CU-26](#cu-26--pedir-más-información)) y el registro de auditoría ([CU-27](#cu-27--registrar-la-acción-en-la-auditoría)).

**Flujos alternativos y excepciones**

- **1a.** La solicitud ya está resuelta: el detalle muestra el resultado y el registro, en lugar de las comprobaciones y los botones de decisión.
- **6a.** **Moderador/a** vuelve a la lista sin decidir: la solicitud sigue pendiente.

**Reglas y requisitos especiales**

- **Nada se aprueba sin sus comprobaciones.** Cada tipo tiene las suyas (ver CU-20 a CU-23).
- Las comprobaciones **no se guardan** al salir: hay que marcarlas en la misma sesión.
- Un mismo detalle sirve para los cuatro tipos; solo cambian el contenido, las comprobaciones y los textos del botón.
- En pantallas anchas, lista y detalle se ven a la vez.

**Relaciones:** especializado por CU-20, CU-21, CU-22 y CU-23. Extendido por CU-24, CU-25 y CU-26.

**Implementación:** `ModerationDetail` (el tipo decide `checkKeys` y los textos).

---

## CU-20 · Revisar la propuesta de un local

- **Actores:** Moderador/a.
- **Resumen:** Revisa una propuesta de local nuevo (CU-10) y comprueba que existe, que es independiente y que su equipo es realmente inclusivo, y que el negocio quiere aparecer.
- **Precondiciones:** Hay una solicitud «Nuevo local» abierta (CU-19).
- **Poscondiciones:** Tiene marcadas, o no, las cuatro comprobaciones.

**Flujo principal**

1. **Sistema** muestra «Datos propuestos»: comida, platos estrella, «Cómo lo conoce quien propone» y el enlace aportado (o «Sin enlace»).
2. **Moderador/a** comprueba por su cuenta (web, redes, mapa, prensa) y marca:
   1. *El local existe (web, redes o mapa).*
   2. *Es un negocio independiente, no una gran cadena.*
   3. *Hay pruebas de que su equipo es inclusivo.*
   4. *El negocio ha confirmado que quiere aparecer (contacto por canal oficial).*

**Flujos alternativos y excepciones**

- **1a.** No hay enlace de prueba: el aviso «No se aportó ninguna prueba del equipo inclusivo» ya salió en el paso 3 de CU-19.
- **2a.** No puede confirmarlo todo: no aprueba; pide información (CU-26) o rechaza (CU-25).

**Reglas y requisitos especiales**

- El contacto con el negocio (comprobación 4) es el sí definitivo y ocurre **fuera de la web**, por correo o teléfono del dominio oficial; allí se le ofrece también CU-15.
- Criterio de exclusión de cadenas: `07_VERIFICACION.md`.
- Si alguien ha escrito datos de personas del equipo en una propuesta, se descartan al revisar.

**Relaciones:** especializa CU-19.

**Implementación:** `ModerationDetail` · `CHECKS_NEW`.

---

## CU-21 · Revisar una corrección

- **Actores:** Moderador/a.
- **Resumen:** Revisa un aviso de corrección (CU-12) y comprueba que el cambio es correcto.
- **Precondiciones:** Hay una solicitud «Corrección» abierta (CU-19).
- **Poscondiciones:** Tiene marcada, o no, la comprobación.

**Flujo principal**

1. **Sistema** muestra «Cambio propuesto». Si se conoce el valor actual (hoy, solo en la dirección), lo pone junto al propuesto bajo «Antes» y «Después»; si no, muestra solo «Propuesta».
2. **Sistema** ofrece «Ver la ficha» para contrastar con el local.
3. **Moderador/a** comprueba y marca: *He comprobado que el cambio es correcto.*

**Flujos alternativos y excepciones**

- **3a.** No puede comprobarlo: pide información (CU-26) o rechaza (CU-25).

**Reglas y requisitos especiales**

- Una sola comprobación; es el tipo más ligero.
- La nota de quien corrige es texto libre: no debe contener datos de personas.

**Relaciones:** especializa CU-19.

**Implementación:** `ModerationDetail` · `CHECKS_EDIT`.

---

## CU-22 · Revisar el equipo de un negocio

- **Actores:** Moderador/a.
- **Resumen:** Revisa lo que un negocio cuenta de su equipo (CU-15) y confirma que quien lo envía lo representa, que las cifras son coherentes y que cada historia trae su consentimiento.
- **Precondiciones:** Hay una solicitud «Equipo» abierta (CU-19).
- **Poscondiciones:** Tiene marcadas, o no, las comprobaciones.

**Flujo principal**

1. **Sistema** muestra «Equipo que cuenta el negocio»: nivel elegido, personas («N de M con discapacidad»), áreas, tipos de discapacidad y el número de historias («N historias, cada una con su consentimiento»).
2. **Sistema** ofrece «Ver la ficha».
3. **Moderador/a** confirma con el negocio por un canal oficial y marca:
   1. *He confirmado con el negocio, por un canal oficial, que quien envía lo representa.*
   2. *Las cifras son coherentes (al menos una persona; no más con discapacidad que en total).*
   3. *Cada historia trae el consentimiento de la persona o de su representante legal.* (solo si hay historias)

**Flujos alternativos y excepciones**

- **3a.** No consigue confirmar con el negocio: no aprueba; pide información (CU-26) o rechaza (CU-25).

**Reglas y requisitos especiales**

- **Aquí nunca se ven nombres ni textos de historias**, solo cuántas hay: es una decisión de privacidad del prototipo (`CLAUDE.md`).
- Sin la confirmación del negocio y los consentimientos, el equipo no se publica (mensaje de error al aprobar sin ellos).

**Relaciones:** especializa CU-19. Su aprobación hace que CU-08 muestre el nivel elegido.

**Implementación:** `ModerationDetail` · `CHECKS_TEAM`, `CHECK_TEAM_STORIES`.

**Observaciones:** como la persona que modera no ve las historias, no puede juzgar su contenido (tono, datos de salud no deseados). Con el servidor habrá que decidir cómo se revisa el texto antes de publicarlo.

---

## CU-23 · Revisar una petición de retirada

- **Actores:** Moderador/a.
- **Resumen:** Revisa una petición (CU-13) y, antes de ocultar nada, comprueba por correo que quien la hace es quien dice ser.
- **Precondiciones:** Hay una solicitud «Retirada» abierta (CU-19).
- **Poscondiciones:** Tiene marcada, o no, la comprobación de identidad.

**Flujo principal**

1. **Sistema** muestra «Qué se pide retirar»: qué (historia, foto, ficha entera u otra cosa sobre sus datos) y los detalles que dio la persona.
2. **Sistema** ofrece «Ver la ficha».
3. **Moderador/a** escribe al correo de la solicitud y, cuando recibe la confirmación, marca: *He confirmado, por el correo, que quien lo pide es la persona o su representante.*

**Flujos alternativos y excepciones**

- **3a.** No responde o no es quien dice ser: no se retira nada; se rechaza (CU-25).

**Reglas y requisitos especiales**

- «Sin eso no se retira nada»: no hay forma de retirar sin la comprobación marcada.
- El correo solo lo ve Moderación y debe borrarse al terminar la gestión.
- Los plazos de respuesta y borrado (7 días en los consentimientos) son **provisionales** hasta la revisión legal.

**Relaciones:** especializa CU-19. Su aprobación se llama «Retirar ahora».

**Implementación:** `ModerationDetail` · `CHECKS_REMOVAL`.

---

## CU-24 · Aprobar y publicar

- **Actores:** Moderador/a.
- **Resumen:** Con todas las comprobaciones hechas, el Moderador/a aprueba la solicitud; lo aprobado pasa a ser público (o, en una retirada, se oculta).
- **Precondiciones:** Está en CU-19 con todas las comprobaciones de su tipo marcadas. En un **local nuevo**, además, ha elegido el **nivel de verificación** y el **método**.
- **Poscondiciones:** La solicitud pasa a «Resueltas» como «Aprobada». Con el servidor, la ficha se publica o se actualiza, y queda registrado en CU-27.

**Flujo principal**

1. **Moderador/a** marca todas las comprobaciones.
2. En un local nuevo, elige el **nivel**: 🟢 «Verificado · lo he comprobado yo» o 🟡 «Confirmado · lo confirma el negocio», y el **método**: visita presencial, llamada al negocio, documentación o confirmado por el negocio.
3. Pulsa el botón de aprobar, que según el tipo dice «Aprobar y publicar», «Aprobar cambio», «Aprobar y publicar el equipo» o «Retirar ahora».
4. **Sistema** guarda la decisión (hoy, simulada), ejecuta CU-27 y muestra el resultado («Aprobada y publicada», «Cambio aplicado», «Equipo publicado» o «Retirado»), con el foco en el resultado.

**Flujos alternativos y excepciones**

- **3a.** Faltan comprobaciones: no se aprueba y se avisa («Faltan comprobaciones. Sin ellas, y sin el sí del negocio, no se puede publicar.» o la variante de su tipo).
- **3b.** Falta el nivel o el método en un local nuevo: «Elige el nivel de verificación y el método.»
- **4a.** Falla el guardado: «No hemos podido guardar la decisión. Puedes intentarlo de nuevo.»

**Reglas y requisitos especiales**

- **Nada se publica sin las comprobaciones ni sin el sí del negocio.**
- En el MVP solo se publican fichas 🟢 o 🟡; el nivel ⚪ es interno (`07_VERIFICACION.md`).
- El método queda visible en la ficha pública (CU-09).
- **Hoy es simulado**: la decisión no se guarda ni cambia ninguna ficha. Con el servidor será `POST /api/v1/suggestions/:id/decision`.

**Relaciones:** extiende CU-19. Incluye CU-27.

**Implementación:** `ModerationDetail` (`approve`, `submit`) · `decideModeration` · tipo `ModerationDecision` (`action: 'approve'`).

---

## CU-25 · Rechazar con motivo

- **Actores:** Moderador/a.
- **Resumen:** El Moderador/a descarta una solicitud eligiendo un motivo, para dejar constancia y poder explicarlo después.
- **Precondiciones:** Está en CU-19. No hace falta haber marcado las comprobaciones.
- **Poscondiciones:** La solicitud pasa a «Resueltas» como «Rechazada». Con el servidor, queda registrada en CU-27.

**Flujo principal**

1. **Moderador/a** pulsa «Rechazar».
2. **Sistema** pide el **motivo** («Motivo del rechazo») con cinco opciones: no es independiente, sin pruebas suficientes, duplicado, fuera de zona u otro, y una nota para el archivo (opcional).
3. **Moderador/a** elige el motivo y pulsa «Confirmar rechazo».
4. **Sistema** guarda la decisión, ejecuta CU-27 y muestra «Rechazada».

**Flujos alternativos y excepciones**

- **3a.** No elige motivo: «Elige un motivo para rechazar.»
- **3b.** Pulsa «Cancelar»: vuelve a las opciones de decisión sin cambios.
- **4a.** Falla el guardado: aviso con posibilidad de reintentar.

**Reglas y requisitos especiales**

- El motivo es **obligatorio**; la nota, opcional.
- Las cadenas se rechazan por el criterio de exclusión (`07_VERIFICACION.md`).
- Hoy es simulado, igual que CU-24.

**Relaciones:** extiende CU-19. Incluye CU-27.

**Implementación:** `ModerationDetail` (`mode === 'reject'`, `REASONS`) · tipo `RejectReason`.

**Observaciones:** la lista de cinco motivos es la misma para todos los tipos, y algunos no encajan con una petición de retirada o un equipo (p. ej. «No es independiente»). Conviene revisarla al diseñar las respuestas a quien propuso.

---

## CU-26 · Pedir más información

- **Actores:** Moderador/a.
- **Resumen:** Cuando falta algo para decidir, el Moderador/a devuelve la solicitud con una nota sobre lo que necesita saber.
- **Precondiciones:** Está en CU-19.
- **Poscondiciones:** La solicitud pasa a «Resueltas» con el estado «Info pedida» y el texto «A la espera de más información».

**Flujo principal**

1. **Moderador/a** pulsa «Pedir más información».
2. **Sistema** pide la nota: «Qué necesitas saber (se enviará a quien propuso, si dejó correo)».
3. **Moderador/a** la escribe y pulsa «Enviar petición».
4. **Sistema** guarda la decisión, ejecuta CU-27 y muestra el resultado.

**Flujos alternativos y excepciones**

- **3a.** La nota está vacía: «Escribe qué información necesitas.»
- **3b.** Pulsa «Cancelar»: vuelve sin cambios.
- **4a.** Falla el guardado: aviso con posibilidad de reintentar.

**Reglas y requisitos especiales**

- La nota es **obligatoria**.
- Hoy **no se envía ningún correo**: la nota solo queda en pantalla. Con el servidor, saldrá al correo de quien propuso, si lo dejó.

**Relaciones:** extiende CU-19. Incluye CU-27.

**Implementación:** `ModerationDetail` (`mode === 'info'`) · tipo `ModerationDecision` (`action: 'ask_info'`).

**Observaciones:** una solicitud con «Info pedida» pasa a «Resueltas»; no hay un estado «a la espera de respuesta» con seguimiento. Cuando haya servidor, hay que decidir qué ocurre al responder quien propuso (¿se reabre la misma solicitud o entra una nueva?). Ver el diagrama de estados (próxima entrega).

---

## CU-27 · Registrar la acción en la auditoría

- **Actores:** *interno* (lo ejecuta el Sistema).
- **Resumen:** Cada decisión deja constancia de quién hizo qué y cuándo, para poder explicar y revisar lo que se publica.
- **Precondiciones:** El Moderador/a ha tomado una decisión (CU-24, CU-25 o CU-26).
- **Poscondiciones:** Existe una línea nueva en el registro de la solicitud.

**Flujo principal**

1. **Sistema** muestra, bajo «Registro de auditoría», una línea fija: *«Sistema · propuesta recibida y filtro automático superado».*
2. Tras una decisión, **Sistema** añade encima una línea de **Moderación** (la más reciente primero), por ejemplo: *«aprobó y publicó “Cocina del Pilar” como Verificado (Visita presencial)»*, *«rechazó “…” · motivo: Duplicado»*, *«pidió más información sobre “…”»*, *«aprobó y publicó el equipo de “…”»* o *«retiró lo pedido en “…”»*.

**Flujos alternativos y excepciones**

- **2a.** Sin decisión: solo aparece la línea del Sistema.

**Reglas y requisitos especiales**

- Cada línea indica **qué** se hizo, **sobre qué** y **cómo** (nivel, método o motivo).
- Con el servidor, el registro será persistente (`AuditLog`, `00_HANDOFF.md` §8.6), con **quién** (la persona concreta) y **cuándo** (fecha y hora), y no se podrá editar.

**Relaciones:** incluido en CU-24, CU-25 y CU-26.

**Implementación:** `ModerationDetail` (`logLine`, sección «Registro de auditoría»).

**Observaciones:** hoy el registro es solo una línea de texto en pantalla («Hoy · Moderación · …»): no tiene persona ni hora y se pierde al recargar. Es parte de lo simulado.

---

## CU-33 · Autenticarse (enlace mágico) — *pendiente*

> **Propuesta.** Esta ficha describe lo previsto, no algo construido. Depende de la decisión **P5** (autenticación) y de **P9** (quién modera Madrid al inicio).

- **Actores:** Moderador/a.
- **Resumen:** El Moderador/a entra en Moderación sin contraseña: pide un enlace y lo recibe en su correo.
- **Precondiciones:** Su correo figura entre los de las personas que moderan.
- **Poscondiciones:** Tiene una sesión con acceso a Moderación. La entrada del menú ☰ deja de ser pública.

**Flujo principal (previsto)**

1. **Moderador/a** abre la pantalla de acceso e indica su correo.
2. **Sistema** envía un enlace de un solo uso.
3. **Moderador/a** abre el enlace.
4. **Sistema** abre la sesión y lo lleva a la cola (CU-18).

**Flujos alternativos y excepciones (previstos)**

- **1a.** El correo no figura entre los autorizados: la respuesta es la misma que si figurara, para no revelar quién modera.
- **3a.** El enlace ha caducado o ya se usó: se pide otro.
- **4a.** La sesión caduca: se vuelve a pedir un enlace.

**Reglas y requisitos especiales**

- Cualquier otra persona recibe «sin acceso»; la cola nunca se carga para ella.
- Debe limitarse el número de enlaces pedidos (rate limit).
- Cuando exista, **se oculta** la entrada «Moderar propuestas (demo)» del menú (`web/src/lib/nav.ts`).

**Relaciones:** incluido en CU-18 y CU-34.

**Preguntas abiertas:** ¿quién y cómo se añade una persona moderadora (P9)? ¿Cuánto dura la sesión? ¿Un solo nivel de moderación o roles?

---

## CU-34 · Revisar fichas sin actualizar — *pendiente*

> **Propuesta.** Describe lo previsto en `07_VERIFICACION.md` («Mantenimiento»), que hoy solo se cumple en parte: las fichas se **marcan**, pero nada las trata.

- **Actores:** Moderador/a.
- **Resumen:** El Moderador/a ve las fichas cuya última verificación tiene más de 12 meses y decide qué hacer con cada una.
- **Precondiciones:** Está autenticado (CU-33). Hay fichas con `needsReview`.
- **Poscondiciones:** Cada ficha revisada tiene una nueva fecha de verificación, o queda pendiente de retirada.

**Flujo principal (previsto)**

1. **Moderador/a** abre «Fichas por revisar».
2. **Sistema** lista las fichas con más de 12 meses sin verificar, de más antigua a más reciente.
3. **Moderador/a** elige una y vuelve a comprobarla (web, llamada, visita).
4. **Moderador/a** confirma que sigue igual: **Sistema** actualiza la fecha de verificación y deja constancia en CU-27.

**Flujos alternativos y excepciones (previstos)**

- **4a.** Ha cambiado algo: edita los datos o abre una corrección.
- **4b.** El local ha cerrado o ya no cumple: se retira la ficha.
- **4c.** El negocio no responde: se anota y se vuelve a intentar.

**Reglas y requisitos especiales**

- Hoy la marca «Pendiente de revisión» viene en el dato; la regla de los 12 meses la tendrá que fijar el servidor.
- Es **trabajo recurrente**, no una cola de entrada: conviene un aviso periódico, no solo una lista.

**Relaciones:** incluye CU-33. Se apoya en CU-27.

**Preguntas abiertas:** ¿se avisa al negocio antes de retirar una ficha caducada? ¿Quién decide cuándo se da por abandonada?
