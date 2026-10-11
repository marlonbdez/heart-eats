# Paquete Colaborar · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md` §5.2](../10_CASOS_DE_USO.md). Cómo leer una ficha: [README](README.md).

Los tres formularios (proponer, corregir, pedir una retirada) comparten el mismo patrón y por eso se describe una sola vez:

- **Sin cuenta.** Cualquiera puede enviar.
- **Por pasos**, con barra de progreso (`role="progressbar"`) y botones «Atrás» y «Continuar». Al cambiar de paso, el foco va al título para los lectores de pantalla.
- **Validación en línea** al pulsar «Continuar»: el campo con error se marca (`aria-invalid`) y el mensaje se anuncia (`role="alert"`). Los enlaces deben empezar por `http(s)://` y los correos tener forma de correo (`lib/validation.ts`). El servidor volverá a validar.
- **Campo trampa** (`website`, invisible): si llega relleno, el envío se descarta en silencio.
- **Fin con confirmación** («¡Gracias…!») y dos salidas: volver, o enviar otro.
- **Nada se publica ni cambia** hasta que Moderación lo revisa.
- Se evita pedir datos de personas: cada formulario avisa de que **no se escriban nombres ni datos de salud**.

El envío en sí es [CU-14](#cu-14--enviar-una-solicitud-a-moderación).

---

## CU-10 · Proponer un local

- **Actores:** Colaborador/a.
- **Resumen:** Alguien que conoce un local con equipo inclusivo lo propone en cuatro pasos y aporta lo que sepa para que Moderación pueda comprobarlo.
- **Precondiciones:** Ninguna. Se llega desde la cabecera, el menú ☰ («Proponer un local»), los estados vacíos de CU-01 y CU-02, y desde el paso 1 de CU-15 («Propónlo primero»).
- **Poscondiciones:** Queda una solicitud de tipo «Nuevo local» en la cola de moderación. El borrador se borra.

**Flujo principal**

1. **Colaborador/a** abre `/propose`.
2. **Paso 1 · El local.** Escribe el nombre (obligatorio), y opcionalmente dirección, ciudad (por defecto «Madrid»), código postal y uno o varios tipos de comida (las mismas categorías de CU-04, más «Otra»).
3. **Paso 2 · Platos.** Escribe de 1 a 3 platos con una descripción corta opcional. Las fotos no se piden: las aporta el negocio o se usan con su permiso.
4. **Paso 3 · Equipo.** Cuenta cómo conoce el negocio, aporta un enlace que lo confirme (opcional) y marca si es independiente. Ve el aviso de no escribir nombres ni datos de salud.
5. **Paso 4 · Enviar.** Puede dejar un correo (opcional, privado, nunca se muestra), revisa el resumen y lee el aviso de que, al enviar, permite que se revise y se publique si encaja.
6. **Colaborador/a** pulsa «Enviar propuesta». **Sistema** ejecuta [CU-14](#cu-14--enviar-una-solicitud-a-moderación).
7. **Sistema** muestra «¡Gracias por proponerlo!» con «Volver al mapa» y «Proponer otro local».

**Flujos alternativos y excepciones**

- **2a.** Falta el nombre: «Cuéntanos el nombre del local para poder continuar.»
- **4a.** El enlace no empieza por `http(s)://`: se avisa y se puede corregir o dejar vacío.
- **5a.** El correo no tiene forma de correo: se avisa y se puede corregir o dejar vacío.
- **6a.** El envío falla: «No hemos podido enviar la propuesta. Cuando quieras, puedes intentarlo de nuevo.» Lo escrito se conserva.
- **7a.** «Proponer otro local» vacía el formulario y vuelve al paso 1.
- **Cualquier paso.** Si se cierra la pestaña, lo escrito se recupera con [CU-11](#cu-11--gestionar-el-borrador-de-la-propuesta).

**Reglas y requisitos especiales**

- Solo el nombre es obligatorio: es una barrera baja a propósito («con lo básico es suficiente»). Moderación recibe un aviso si no hay prueba del equipo inclusivo.
- Un local propuesto **nunca** se publica sin verificación y sin el sí del propio negocio.
- Criterio de exclusión: se aceptan negocios independientes y proyectos con impacto social; se rechazan grandes cadenas (`07_VERIFICACION.md`).
- El correo no se guarda tal cual en el buzón de prueba: se enmascara (`m***@dominio`).
- Texto de consentimiento y privacidad: **provisional** hasta la revisión legal.

**Relaciones:** incluye CU-14. Extendido por CU-11. Lo recoge Moderación en CU-20.

**Implementación:** `/propose` · `ProposeForm` · `submitProposal` · tipo `ProposalInput`.

**Observaciones:** el texto del paso 2 dice «de 1 a 3 platos», pero el formulario no exige ninguno (se descartan los vacíos). Moderación verá «Sin indicar». Conviene decidir si el plato estrella es obligatorio para publicar, ya que la ficha lo da por supuesto.

---

## CU-11 · Gestionar el borrador de la propuesta

- **Actores:** Colaborador/a.
- **Resumen:** Mientras el Colaborador/a escribe, lo escrito se guarda en su propio dispositivo para no perderlo si cierra la pestaña o se corta la conexión. Puede recuperarlo o empezar de cero.
- **Precondiciones:** Está en CU-10. El navegador permite `localStorage` (si no, el formulario funciona igual, sin borrador).
- **Poscondiciones:** Hay, o no hay, un borrador guardado en el dispositivo, que caduca a los 7 días.

**Flujo principal**

1. **Sistema** (al abrir CU-10) busca un borrador en el dispositivo.
2. Si lo hay y no ha caducado, **Sistema** rellena el formulario, lleva al paso donde se dejó y avisa «Hemos recuperado el borrador que dejaste a medias.» con el botón «Empezar de cero».
3. Mientras **Colaborador/a** escribe, **Sistema** guarda el borrador tras una pausa de unos 0,4 s.
4. Al enviar la propuesta, **Sistema** borra el borrador.

**Flujos alternativos y excepciones**

- **2a.** El borrador tiene más de 7 días: se descarta y se borra.
- **2b.** El borrador está dañado o incompleto (versión antigua): se sanea o se ignora; nunca rompe el formulario.
- **2c.** **Colaborador/a** pulsa «Empezar de cero»: se borra el borrador y se vacía el formulario.
- **3a.** El formulario vuelve a quedar vacío: no se guarda nada y se borra el que hubiera.
- **3b.** No hay almacenamiento (modo privado, bloqueado): se ignora el error y el formulario sigue.

**Reglas y requisitos especiales**

- **Privacidad:** el borrador **nunca** incluye el correo ni el campo trampa. No sale del dispositivo.
- Es uno de los dos únicos usos de `localStorage` de la web (el otro es el buzón de prueba, CU-14). Hay que reflejarlo en la política de cookies y almacenamiento antes del lanzamiento (`CLAUDE.md`).
- Siempre se ve la nota «Mientras escribes, se guarda un borrador solo en este dispositivo (sin tu correo). Se borra al enviar o a los 7 días.»
- Solo existe para «Proponer un local»: los demás formularios (corregir, retirar, contar el equipo) no guardan borrador.

**Relaciones:** extiende CU-10.

**Implementación:** `ProposeForm` · `lib/draft.ts` (`loadDraft`, `saveDraft`, `clearDraft`) · clave `hearteats:draft-propose`.

---

## CU-12 · Sugerir una corrección

- **Actores:** Colaborador/a.
- **Resumen:** Desde la ficha de un local publicado, el Colaborador/a avisa de que un dato está mal (dirección, horario, cierre, equipo u otra cosa).
- **Precondiciones:** El local existe. Se llega desde «Sugerir una corrección» en su ficha (CU-06), que abre `/correct/<local>` con el local ya elegido.
- **Poscondiciones:** Queda una solicitud de tipo «Corrección» en la cola de moderación. La ficha **no cambia** hasta que Moderación la apruebe.

**Flujo principal**

1. **Colaborador/a** abre «Sugerir una corrección» desde la ficha.
2. **Paso 1 · Qué corregir.** Elige una opción: la dirección, el horario, ha cerrado, la información del equipo u otra cosa.
3. **Paso 2 · Detalles.** Cuenta qué ha cambiado o qué está mal (obligatorio, con un ejemplo distinto según la opción) y, si quiere, un enlace que lo confirme. Ve el aviso de no escribir nombres ni datos de salud, tampoco si la corrección es sobre el equipo.
4. **Paso 3 · Enviar.** Correo opcional (privado), resumen y aviso de consentimiento.
5. **Colaborador/a** pulsa «Enviar corrección». **Sistema** ejecuta [CU-14](#cu-14--enviar-una-solicitud-a-moderación).
6. **Sistema** muestra «¡Gracias por avisarnos!» con «Volver a la ficha» y «Corregir otro dato».

**Flujos alternativos y excepciones**

- **1a.** Abre `/correct` sin local: se explica que el aviso se envía desde la ficha de cada local y se ofrece «Ver la lista de locales» (CU-02).
- **1b.** El local no existe: página «no encontrada».
- **2a.** No elige qué corregir: «Elige qué hay que corregir para poder continuar.»
- **3a.** No escribe detalles: «Cuéntanos qué hay que corregir para poder continuar.»
- **3b.** El enlace o el correo no son válidos: aviso, y se pueden corregir o dejar vacíos.
- **5a.** Falla el envío: aviso con posibilidad de reintentar; lo escrito se conserva.

**Reglas y requisitos especiales**

- Un enlace de prueba ayuda a Moderación, pero no es obligatorio.
- Para «La dirección», Moderación ve el valor actual y el propuesto lado a lado (CU-21).
- Cualquiera puede avisar; el negocio puede pedir cambios o su baja en cualquier momento (`07_VERIFICACION.md`).

**Relaciones:** incluye CU-14. Parte de CU-06. Lo recoge Moderación en CU-21.

**Implementación:** `/correct`, `/correct/[slug]` · `CorrectForm` · `submitCorrection` · tipo `CorrectionInput`.

---

## CU-13 · Pedir una retirada

- **Actores:** Visitante (en la práctica, el negocio o la persona cuyos datos aparecen, o su representante).
- **Resumen:** Alguien pide que se retire una historia, una foto o la ficha entera de un local, o ejerce otro derecho sobre sus datos, sin cuenta y sin dar explicaciones.
- **Precondiciones:** Ninguna. Se llega desde el menú («Pedir una retirada»), «Contacto» y «Privacidad y datos».
- **Poscondiciones:** Queda una solicitud de tipo «Retirada» en la cola de moderación. **No se retira nada** hasta que Moderación confirme por correo que quien lo pide es quien dice ser.

**Flujo principal**

1. **Visitante** abre `/removal`.
2. **Paso 1 · Qué retirar.** Elige una opción: una historia (la suya o la de alguien a quien representa), una foto, la ficha entera de un local u otra cosa sobre sus datos personales.
3. **Paso 2 · Dónde.** Elige el local de una lista y, si quiere, algo que ayude a encontrarlo (p. ej. el nombre o seudónimo que aparece). Se avisa de no escribir datos de salud ni nombres de otras personas.
4. **Paso 3 · Enviar.** Escribe un correo (**obligatorio**: sirve para confirmar su identidad), revisa el resumen y lee que el correo se usa solo para gestionar la petición.
5. **Visitante** pulsa «Enviar petición». **Sistema** ejecuta [CU-14](#cu-14--enviar-una-solicitud-a-moderación).
6. **Sistema** muestra «Petición recibida»: «Te escribiremos al correo que nos has dado para confirmar que eres tú. En cuanto lo confirmemos, retiraremos lo que has pedido.»

**Flujos alternativos y excepciones**

- **2a.** No elige qué retirar: «Elige qué quieres retirar para poder continuar.»
- **3a.** No elige local: «Elige el local para poder continuar.»
- **4a.** El correo falta o no es válido: «Escribe un correo válido para poder continuar.»
- **5a.** Falla el envío: aviso con posibilidad de reintentar.
- **6a.** «Hacer otra petición» vacía el formulario.

**Reglas y requisitos especiales**

- Se puede pedir **sin cuenta y sin dar explicaciones**: quien da su historia o su foto puede retirarla cuando quiera.
- El correo es obligatorio **a propósito**: evita que alguien retire algo en nombre de otra persona.
- El correo solo lo ve Moderación y debe borrarse al terminar la gestión (compromiso del texto; **provisional** hasta la revisión legal).
- Los textos de consentimiento de CU-17 prometen el borrado en un máximo de 7 días: ese plazo hay que cumplirlo con un proceso real.

**Relaciones:** incluye CU-14. Lo recoge Moderación en CU-23.

**Implementación:** `/removal` · `RemovalForm` · `submitRemoval` · tipo `RemovalInput` (`RemovalWhat`: `story`, `photo`, `listing`, `data`).

**Observaciones:** la lista de locales solo incluye los publicados; si alguien necesita pedir la retirada de algo que no está en el mapa, solo le queda el correo. La ficha de un local tampoco enlaza aquí (ver CU-06).

---

## CU-14 · Enviar una solicitud a moderación

- **Actores:** *interno* (lo ejecuta el Sistema para CU-10, CU-12, CU-13 y CU-15).
- **Resumen:** Paso común de los cuatro formularios: descarta los envíos de robots, enmascara el correo y deja la solicitud en la cola de moderación.
- **Precondiciones:** El formulario ha pasado la validación de su último paso.
- **Poscondiciones:** Hay una solicitud nueva en la cola de moderación (`pending`). Nada es público.

**Flujo principal**

1. **Sistema** recibe los datos ya validados.
2. **Sistema** comprueba el campo trampa: está vacío.
3. **Sistema** convierte la solicitud al formato de la cola (tipo, local, zona, antigüedad, avisos, datos propios del tipo) y **enmascara el correo** (`m***@dominio`).
4. **Sistema** la deja en la cola (hoy, un buzón de prueba del navegador) y responde que todo ha ido bien.

**Flujos alternativos y excepciones**

- **2a.** El campo trampa viene relleno: la solicitud se **descarta en silencio** y el formulario muestra el éxito igualmente, para no dar pistas al robot.
- **3a.** Una propuesta sin enlace de prueba lleva el aviso «No se aportó ninguna prueba del equipo inclusivo».
- **4a.** El envío falla: el formulario muestra su mensaje de error y deja reintentar.
- **4b.** No hay almacenamiento en el navegador: el envío simulado «funciona», pero no aparece en moderación.

**Reglas y requisitos especiales**

- **Hoy es simulado** (600 ms de espera y guardado local); con el servidor pasará a `POST /api/v1/proposals`, `/corrections`, `/teams` y `/removals`, con la misma firma, sin tocar las pantallas.
- **Privacidad:** en el buzón de prueba nunca se guarda el correo entero ni nombres ni textos de historias del equipo. Guarda como máximo 20 solicitudes.
- Con el servidor, aquí van el **límite de envíos** (rate limit), la revalidación y el registro de auditoría (fase 3 de la hoja de ruta).
- Cualquier dato nuevo que se recoja se anota antes en `08_PRIVACIDAD_LEGAL.md`.

**Relaciones:** incluido en CU-10, CU-12, CU-13 y CU-15.

**Implementación:** `lib/data/index.ts` (`submitProposal`, `submitCorrection`, `submitBusinessTeam`, `submitRemoval`) · `lib/data/outbox.ts` (`addToOutbox`, `maskEmail`).
