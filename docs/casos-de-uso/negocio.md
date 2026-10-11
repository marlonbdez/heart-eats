# Negocio · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md). Es el flujo más delicado: la primera vez que se pide información sobre **personas**. Todo texto legal es **provisional** hasta la revisión legal (`08_PRIVACIDAD_LEGAL.md`).

## CU-15 · Contar el equipo del negocio
- **Quién:** Representante del negocio.
- **Pasos:** `/business` en 4 pasos: **antes de empezar** (las tres garantías y elegir el local) → **qué mostrar** (solo cifras, áreas y tipos, o historias con nombre) → **los datos** (personas en el equipo y con discapacidad, áreas, tipos) → **revisión** (vista previa, correo obligatorio y casilla de responsabilidad). Termina en «¡Gracias!».
- **Si no:** con menos de 5 personas se avisa y solo se envía y muestra la cifra.
- **Reglas:** el negocio siempre da el último sí; áreas y tipos se eligen por separado, sin cruzarlos; no guarda borrador; en el buzón de prueba solo se guarda cuántas historias hay.
- **Observaciones:** con servidor será la primera vez que se reciban nombres e historias de terceros (hace falta revisión legal, plazos reales y seguridad). Cualquiera puede decir que es del negocio; la defensa es la confirmación por canal oficial (P9).

## CU-16 · Previsualizar la ficha
- **Quién:** Representante. Incluido en CU-15.
- **Pasos:** en el último paso ve «Así se verá» con el bloque del equipo → si algo no le gusta, vuelve atrás.
- **Reglas:** es el mismo componente que la ficha pública (`TeamBlock`), con los mismos datos que se envían.
- **Observación:** muestra solo el bloque del equipo, no la ficha entera como describe el diseño.

## CU-17 · Dar el consentimiento de una historia
- **Quién:** Representante, en nombre de la persona o con su representante legal. Extiende CU-15.
- **Pasos:** escribe nombre o seudónimo, puesto y la historia con las palabras de la persona → elige quién da el permiso (la persona o su representante legal) → marca la casilla → puede añadir hasta 3 personas.
- **Reglas:** una historia sin permiso no se envía; el consentimiento es por persona, nunca del negocio en bloque; se puede retirar con CU-13; Moderación comprueba que cada historia trae el suyo (CU-22).
- **Observación:** el consentimiento es una casilla, sin constancia verificable de quién lo dio.
