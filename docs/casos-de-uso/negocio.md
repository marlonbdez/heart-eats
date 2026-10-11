# Paquete Negocio · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md` §5.3](../10_CASOS_DE_USO.md). Cómo leer una ficha: [README](README.md).

Es el flujo más delicado de la web: es la primera vez que se pide (aún sin servidor) información sobre **personas**. Por eso concentra las reglas de consentimiento. Todo texto legal que aparece aquí es **provisional** hasta la revisión de un profesional (`08_PRIVACIDAD_LEGAL.md`).

---

## CU-15 · Contar el equipo del negocio

- **Actores:** Representante del negocio.
- **Resumen:** El negocio decide cuánto quiere contar de su equipo (solo una cifra, áreas y tipos, o historias con nombre), lo revisa tal como se verá en la ficha y lo envía a moderación.
- **Precondiciones:** El local ya está en el mapa. Se llega desde el menú («Soy de un negocio»), desde «¿Es tu local? Cuenta cómo es tu equipo» en la ficha (con el local ya elegido, `/business/<local>`) o desde Contacto.
- **Poscondiciones:** Queda una solicitud de tipo «Equipo» en la cola de moderación. Nada cambia en la ficha hasta que Moderación confirme con el negocio que quien envía lo representa.

**Flujo principal**

1. **Representante** abre `/business`.
2. **Paso 1 · Antes de empezar.** Lee las tres garantías: *tú eliges cuánto contar*, *nadie aparece sin su permiso* y *puedes cambiarlo o retirarlo cuando quieras (borrado en un máximo de 7 días)*. Elige el local y pulsa «Empezar».
3. **Paso 2 · Qué mostrar.** Elige uno de tres niveles, cada uno con un ejemplo de cómo se verá:
   - **Solo cifras** (más privado; recomendado para empezar).
   - **Áreas y tipos** (intermedio): las cifras y, además, en qué áreas trabajan y qué tipos de discapacidad hay, sin identificar a nadie.
   - **Historias con nombre** (solo con el permiso de cada persona).
4. **Paso 3 · Los datos.** Indica cuántas personas hay en el equipo y cuántas tienen discapacidad. En los niveles intermedio y completo, elige áreas y tipos de discapacidad, y en el completo añade las historias ([CU-17](#cu-17--dar-el-consentimiento-de-una-historia)).
5. **Paso 4 · Revisión.** Ve la vista previa ([CU-16](#cu-16--previsualizar-la-ficha)), escribe un correo de contacto (obligatorio, privado) y marca que es responsable del negocio y que la información es correcta.
6. **Representante** pulsa «Enviar a revisión». **Sistema** ejecuta [CU-14](colaborar.md#cu-14--enviar-una-solicitud-a-moderación).
7. **Sistema** muestra «¡Gracias!»: se revisará y se contactará con el negocio para confirmarla; al estar verificada, aparecerá en la ficha. Ofrece «Volver al mapa» y «Contar el equipo de otro local».

**Flujos alternativos y excepciones**

- **2a.** No elige local: «Elige tu local para poder continuar.» Si no está en la lista, el enlace «Propónlo primero» lleva a CU-10.
- **3a.** No elige nivel: «Elige una opción para poder continuar.»
- **4a.** El total es menor que 1: «Escribe cuántas personas hay en el equipo (al menos 1).»
- **4b.** Las personas con discapacidad son menos de 1 o más que el total: «…al menos 1 y no más que el total.»
- **4c.** **Equipo de menos de 5 personas:** el Sistema avisa («En equipos pequeños, dar detalles puede hacer reconocible a una persona…») y envía y muestra **solo la cifra**, aunque se hubiera elegido otro nivel.
- **5a.** El correo no es válido o falta la casilla de responsabilidad: no se envía y se indica qué falta.
- **6a.** Falla el envío: aviso con posibilidad de reintentar; lo escrito se conserva.

**Reglas y requisitos especiales**

- **El negocio siempre da el último sí.** Nunca se publica la ficha ni las historias sin su confirmación (`CLAUDE.md`).
- **Áreas y tipos de discapacidad se eligen por separado, sin cruzarlos**, para que nadie pueda reconocerse («una persona sorda en cocina»). Áreas: cocina, sala, barra, obrador y reparto. Tipos: auditiva, visual, física, intelectual, salud mental, autismo y otra.
- El umbral de **5 personas** es provisional (`04_DISENO_UI.md`, F3).
- Lo que se envía y lo que se ve en la vista previa es **lo mismo** (`buildTeam`).
- El correo de contacto es privado: Moderación lo usa para confirmar que quien envía es del negocio, sin cuentas, y para avisar cuando esté publicado.
- En el buzón de prueba, de las historias solo se guarda **cuántas hay**: nunca nombres ni textos.
- Este formulario **no guarda borrador**: si se cierra la pestaña, se pierde lo escrito.

**Relaciones:** incluye CU-16 y CU-14. Extendido por CU-17 (nivel «Historias con nombre»). Lo recoge Moderación en CU-22 y, una vez aprobado, lo ve el Visitante en CU-08.

**Implementación:** `/business`, `/business/[slug]` · `BusinessForm` · `TeamBlock` · `submitBusinessTeam` · `lib/team.ts` (`isSmallTeam`) · tipo `BusinessTeamInput`.

**Observaciones**

- Con el servidor, esta será **la primera vez que la web reciba datos personales de terceros** (nombres e historias). Antes de activar ese envío hacen falta la revisión legal, el plazo real de conservación y las medidas de seguridad (`08_PRIVACIDAD_LEGAL.md`).
- Cualquiera puede enviar el formulario diciendo ser del negocio; la defensa es la confirmación por un canal oficial en CU-22. Conviene definir cómo (P9) antes de abrir al público.
- El paso 3 no deja enviar a quien elija «Historias con nombre» sin completar al menos una historia; si el negocio no quiere dar ninguna, debe volver y elegir otro nivel.

---

## CU-16 · Previsualizar la ficha

- **Actores:** Representante del negocio.
- **Resumen:** Antes de enviar, el negocio ve exactamente cómo aparecerá su equipo en la ficha pública.
- **Precondiciones:** Está en el paso 4 de CU-15, con los datos de los pasos anteriores.
- **Poscondiciones:** El negocio sabe qué se publicaría; puede volver atrás a cambiarlo.

**Flujo principal**

1. **Sistema** muestra «Así se verá:» y el bloque «El equipo detrás de cada plato» con los datos introducidos y el nivel que corresponde.
2. **Representante** lo revisa y, si algo no es lo que quería, pulsa «Atrás» y lo cambia.

**Flujos alternativos y excepciones**

- **1a.** Equipo de menos de 5 personas: la vista previa muestra solo la cifra, como se publicará.

**Reglas y requisitos especiales**

- Es **el mismo componente** que usa la ficha pública (`TeamBlock`), no una copia: lo que se ve aquí no puede diferir de lo que se publica.
- Se calcula con los mismos datos que se envían.

**Relaciones:** incluido en CU-15. Reutiliza lo mismo que muestra CU-08.

**Implementación:** `BusinessForm` (paso 4) · `TeamBlock`.

**Observaciones:** `04_DISENO_UI.md` (F3) describe una «vista previa fiel de la ficha»; hoy la vista previa muestra solo el bloque del equipo, no la ficha entera. Es suficiente para lo que se decide aquí, pero la descripción del diseño y la pantalla no coinciden.

---

## CU-17 · Dar el consentimiento de una historia

- **Actores:** Representante del negocio (en nombre de la persona, o con su representante legal).
- **Resumen:** En el nivel «Historias con nombre», cada persona que quiere contar la suya da **su propio permiso**; sin él, la historia no se puede enviar.
- **Precondiciones:** En CU-15 se eligió el nivel «Historias con nombre» y el equipo tiene 5 personas o más.
- **Poscondiciones:** Cada historia incluida lleva su permiso marcado y a quién corresponde darlo.

**Flujo principal**

1. **Sistema** muestra una persona vacía y el texto «Solo para quien quiera contarla. Cada persona da su propio permiso y decide qué quiere compartir: no hace falta mencionar diagnósticos. Máximo 3.»
2. **Representante** escribe el nombre o seudónimo, el puesto y la historia con las palabras de la persona.
3. Elige **quién da el permiso**: la propia persona o su representante legal.
4. **Sistema** muestra el texto de consentimiento que corresponde a esa opción (en primera persona, o como representante legal): es voluntario, se puede cambiar de opinión cuando se quiera y, a petición, se borra en un máximo de 7 días.
5. **Representante** marca la casilla de permiso.
6. Si hay más personas, pulsa «+ Añadir otra persona» (hasta 3) y repite.

**Flujos alternativos y excepciones**

- **6a.** Quita una persona con «Quitar» (siempre queda al menos una).
- **5a.** Al continuar, una historia a la que le falte nombre, puesto, texto o permiso bloquea el paso: «Completa el nombre, el puesto y la historia, y marca el permiso, para continuar.»
- **6b.** Si el negocio no quiere dar historias, vuelve al paso de nivel y elige otro.

**Reglas y requisitos especiales**

- **Una historia sin permiso marcado no se envía** (`04_DISENO_UI.md`, F3).
- El consentimiento es **por persona**, nunca del negocio en bloque.
- El texto de consentimiento es **provisional**: se muestra la nota «Texto de consentimiento provisional: debe revisarlo un profesional antes de publicarse.»
- La persona puede retirar su historia cuando quiera mediante CU-13 («Una historia»).
- Moderación comprueba que **cada** historia trae su consentimiento (CU-22), sin ver nombres ni textos.
- La ficha pública acompaña las historias con la nota «Historia compartida con el consentimiento de la persona, que puede retirarlo cuando quiera.» (CU-08).

**Relaciones:** extiende CU-15 con la condición «nivel *Historias con nombre*».

**Implementación:** `BusinessForm` (paso 3) · tipos `BusinessStoryInput`, `ConsentBy` (`self`, `legal_representative`).

**Observaciones:** el consentimiento queda como una casilla marcada; no hay forma de acreditar después, de manera verificable, **quién** lo dio. Es una de las preguntas a plantear en la revisión legal (qué constancia hace falta).
