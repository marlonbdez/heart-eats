# Colaborar · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md). Los tres formularios comparten patrón: sin cuenta, por pasos con barra de progreso, validación al pulsar «Continuar», campo trampa invisible (si llega relleno, se descarta en silencio) y aviso de no escribir nombres ni datos de salud. Nada se publica ni cambia hasta que Moderación lo revisa.

## CU-10 · Proponer un local
- **Quién:** Colaborador/a.
- **Pasos:** `/propose` en 4 pasos: **local** (nombre obligatorio; dirección, ciudad, código postal y comida opcionales) → **platos** (hasta 3) → **equipo** (cómo lo conoce, un enlace, si es independiente) → **enviar** (correo opcional y privado). Termina en «¡Gracias por proponerlo!».
- **Si no:** falta el nombre, o un enlace o correo no válido, y se avisa; si falla el envío, lo escrito se conserva.
- **Reglas:** solo el nombre es obligatorio, a propósito; nunca se publica sin verificación y sin el sí del negocio; se rechazan grandes cadenas.
- **Decidido:** los platos son opcionales; sin ellos, la ficha no muestra el bloque.

## CU-11 · Gestionar el borrador de la propuesta
- **Quién:** Colaborador/a. Extiende CU-10.
- **Pasos:** mientras escribe, se guarda en su dispositivo → al volver, se recupera con el aviso «Hemos recuperado el borrador…» y «Empezar de cero» → se borra al enviar.
- **Reglas:** caduca a los 7 días; nunca incluye el correo; si no hay almacenamiento el formulario funciona igual. Solo existe para proponer. Hay que reflejarlo en la política de cookies y almacenamiento.

## CU-12 · Sugerir una corrección
- **Quién:** Colaborador/a.
- **Pasos:** desde la ficha → **qué corregir** (dirección, horario, cerrado, equipo u otra cosa) → **detalles** (obligatorio, enlace opcional) → **enviar**. Termina en «¡Gracias por avisarnos!».
- **Si no:** sin local (`/correct` a secas), se explica que el aviso se envía desde la ficha.
- **Reglas:** la ficha no cambia hasta que se apruebe; la prueba ayuda pero no es obligatoria.

## CU-13 · Pedir una retirada
- **Quién:** Visitante (el negocio o la persona cuyos datos aparecen).
- **Pasos:** `/removal` en 3 pasos: **qué retirar** (historia, foto, ficha entera u otro dato personal) → **dónde** (el local) → **enviar** con correo obligatorio.
- **Reglas:** sin cuenta y sin dar explicaciones; el correo es obligatorio para confirmar la identidad antes de retirar nada, y se borra al terminar. El plazo de 7 días hay que cumplirlo con un proceso real.
- **Observación:** solo se puede pedir sobre locales publicados, y la ficha no enlaza aquí.

## CU-14 · Enviar una solicitud a moderación
- **Quién:** interno. Lo usan CU-10, CU-12, CU-13 y CU-15.
- **Pasos:** recibe los datos validados → descarta el envío si el campo trampa está relleno → enmascara el correo (`m***@dominio`) → deja la solicitud en la cola como Pendiente.
- **Reglas:** hoy es **simulado** (buzón de prueba del navegador, máximo 20, sin correo entero ni nombres ni historias); con servidor mantendrá la misma firma, y aquí irán el límite de envíos y la revalidación.
