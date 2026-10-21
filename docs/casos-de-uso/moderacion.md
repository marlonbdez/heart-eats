# Moderación · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md). Proceso completo: [`../07_VERIFICACION.md`](../07_VERIFICACION.md).
>
> Es la **puerta de salida** de todo lo que llega por Colaborar y Negocio. Hoy es un prototipo (`/moderation`): la cola mezcla 4 solicitudes de ejemplo con lo enviado desde el mismo navegador, **las decisiones no se guardan** y se entra desde el menú ☰ hasta resolver P5. En móvil se ve la cola o el detalle, uno a uno.

## CU-18 · Consultar la cola de solicitudes
- **Quién:** Moderador/a.
- **Pasos:** abre `/moderation` → ve las «Pendientes» con tipo (nuevo local, corrección, equipo o retirada), local, zona y antigüedad → toca una para revisarla (CU-19). La pestaña «Resueltas» muestra las ya decididas.
- **Reglas:** la tarjeta lleva ⚠ si el filtro automático detectó posible duplicado, cadena o falta de pruebas; el correo siempre sale enmascarado.

## CU-19 · Revisar una solicitud *(abstracto)*
- **Quién:** Moderador/a. Se concreta en CU-20 a CU-23.
- **Pasos:** el detalle muestra qué se pide, quién y cuándo, los avisos, el contenido del tipo y sus **comprobaciones** (casillas que marca la persona moderadora) → después decide con CU-24, CU-25 o CU-26.
- **Reglas:** nada se aprueba sin las comprobaciones de su tipo; no se guardan al salir. Un solo detalle sirve para los cuatro tipos.

## CU-20 · Revisar la propuesta de un local
- **Quién:** Moderador/a. Especializa CU-19.
- **Comprobaciones:** el local existe; es independiente, no una gran cadena; hay pruebas de que su equipo es inclusivo; el negocio ha confirmado que quiere aparecer; y, si hay fotos, que son del plato o del local, sin caras reconocibles, y con permiso.
- **Reglas:** el contacto con el negocio ocurre **fuera de la web**, por correo o teléfono del dominio oficial. Si falta algo, no aprueba: pide información o rechaza.

## CU-21 · Revisar una corrección
- **Quién:** Moderador/a. Especializa CU-19.
- **Comprobación:** el cambio es correcto. Ve el dato «Antes» y «Después» (hoy, solo en la dirección) y puede abrir la ficha para contrastar.
- **Qué aplica:** lo que quien aprueba escribe ya comprobado: nombre, dirección, pin (latitud y longitud), el horario completo de la semana (sustituye al de la ficha; un día en blanco es un día cerrado) o el cierre definitivo. Lo que se deja en blanco no se toca.

## CU-22 · Revisar el equipo de un negocio
- **Quién:** Moderador/a. Especializa CU-19.
- **Comprobaciones:** quien envía representa al negocio (confirmado por canal oficial); las cifras son coherentes; cada historia trae su consentimiento.
- **Reglas:** nunca se ven nombres ni textos de historias, solo cuántas hay. Si hay fotos, se añade la comprobación «sin caras reconocibles ni datos personales, y hay permiso» (también en CU-20); el prototipo no las muestra.
- **Observación:** por eso no se puede juzgar el contenido de las historias. Con servidor habrá que decidir cómo se revisa antes de publicar.

## CU-23 · Revisar una petición de retirada
- **Quién:** Moderador/a. Especializa CU-19.
- **Comprobación:** por el correo, quien lo pide es la persona o su representante. Sin eso no se retira nada.
- **Reglas:** el correo solo lo ve Moderación y se borra al terminar; si no responde, se rechaza.

## CU-24 · Aprobar y publicar
- **Quién:** Moderador/a. Extiende CU-19; incluye CU-27.
- **Pasos:** marca las comprobaciones → en un local nuevo, elige el nivel (🟢 o 🟡) y el método (visita, llamada, documentación o confirmado por el negocio) → pulsa el botón (según el tipo: «Aprobar y publicar», «Aprobar cambio», «Aprobar y publicar el equipo» o «Retirar ahora»).
- **Si no:** si faltan comprobaciones o el nivel y el método, no se aprueba y se avisa.
- **Reglas:** nada se publica sin comprobaciones ni sin el sí del negocio; hoy la decisión es simulada.

## CU-25 · Rechazar con motivo
- **Quién:** Moderador/a. Extiende CU-19; incluye CU-27.
- **Pasos:** «Rechazar» → elige el motivo (no independiente, sin pruebas, duplicado, fuera de zona u otro) y, si quiere, una nota → «Confirmar rechazo».
- **Reglas:** el motivo es obligatorio.
- **Observación:** la lista es la misma para todos los tipos y algunos no encajan (p. ej. en una retirada).

## CU-26 · Pedir más información
- **Quién:** Moderador/a. Extiende CU-19; incluye CU-27.
- **Pasos:** «Pedir más información» → escribe qué necesita saber → «Enviar petición». La solicitud pasa a «Info pedida».
- **Reglas:** la nota es obligatoria; hoy no se envía ningún correo.
- **Decidido:** con servidor, la solicitud espera la respuesta 30 días y vuelve a Pendiente si responde; sin correo de quien propuso no se puede pedir (ver [`../11_FLUJO_Y_DOMINIO.md`](../11_FLUJO_Y_DOMINIO.md)). Hoy cierra la solicitud.

## CU-27 · Registrar la acción en la auditoría
- **Quién:** interno. Incluido en CU-24, CU-25 y CU-26.
- **Pasos:** tras cada decisión se añade una línea al registro de la solicitud (qué se hizo, sobre qué y con qué nivel, método o motivo).
- **Observación:** hoy es una línea en pantalla, sin persona ni hora, y se pierde al recargar. Con servidor será persistente (`AuditLog`) y no editable. Un administrador la consulta en `/moderation`, sección «Registro» (quién, cuándo y qué cambió; nunca nombres ni historias).

## CU-27b · Ver lo retirado pendiente de borrar y restaurar una ficha
- **Quién:** Administrador/a.
- **Pasos:** en `/moderation`, sección «Retiradas», ve las fichas y las historias retiradas con el día en que se borrarán (21 días tras la retirada). En una ficha, «Restaurar» y confirmar la devuelve al mapa y detiene el plazo; queda una línea `restore` en el registro.
- **Observación:** las historias no se restauran (retirarlas es retirar el consentimiento) y de ellas solo se muestra el local y la posición. Una ficha que el trabajo horario ya borró no se puede devolver: la pantalla avisa y la quita de la lista.

## CU-33 · Autenticarse (enlace mágico) — *pendiente*
- **Quién:** Moderador/a. Depende de P5 y P9.
- **Previsto:** indica su correo → recibe un enlace de un solo uso → al abrirlo entra en la cola.
- **Reglas previstas:** quien no esté autorizado recibe la misma respuesta, sin revelar quién modera; límite de enlaces pedidos; al existir, se oculta «Moderar propuestas (demo)» del menú.

## CU-34 · Revisar fichas sin actualizar — *pendiente*
- **Quién:** Moderador/a. Previsto en `07_VERIFICACION.md`.
- **Previsto:** lista las fichas con más de 12 meses sin verificar → vuelve a comprobar cada una → actualiza la fecha, la corrige o la retira.
- **Hoy:** solo se **marcan** como «Pendiente de revisión»; nada las trata. Es trabajo recurrente, no una cola de entrada.
