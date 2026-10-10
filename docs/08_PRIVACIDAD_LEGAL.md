# Privacidad, legal y ética

> **Estado:** borrador v0.1 para revisión · Fase 0. Base: §11 de `00_HANDOFF.md`, `01_ESPECIFICACION_DATOS.md`, `07_VERIFICACION.md` y ADR 0001 y 0002.
>
> **Este texto no es asesoramiento legal.** Debe revisarlo un profesional (o una entidad del sector) antes del lanzamiento público. Los puntos marcados con ❓ son decisiones o datos que faltan.

## Licencias

Ver [ADR 0001](adr/0001-licencias.md). Punto clave: las historias, nombres y fotos de personas quedan fuera de la licencia abierta de los datos y de cualquier exportación pública.

## Principios

1. **Lo mínimo posible.** Solo se recoge lo imprescindible para mantener el mapa. Sin cuentas para leer, sin cookies propias, sin analítica.
2. **Las personas del equipo no son un dato más.** La discapacidad es una categoría especial de datos personales (art. 9 RGPD). Por defecto la ficha habla del equipo de forma agregada; cualquier dato que identifique a una persona exige su consentimiento explícito, informado, libre y revocable.
3. **El negocio siempre tiene la última palabra** sobre cuánto se cuenta de su equipo.
4. **Retirar es fácil y rápido.** Una historia, una foto o una ficha entera se pueden retirar cuando se quiera.
5. **Lenguaje claro y respetuoso**, sin paternalismo. Los textos públicos se co-diseñan con personas y entidades del sector.

## Texto público: «Privacidad y datos» (borrador)

> Este es el texto que irá en la pantalla «Privacidad y datos» (`/privacy`). Está escrito en español llano y con tono sosegado, para quien no es jurista; el rigor jurídico no se toca al suavizar el estilo. Cuando se apruebe se traduce al inglés (ADR 0003).

### En pocas palabras

- Puedes usar HeartEats sin darnos ningún dato: no hay cuentas, no usamos cookies propias y no medimos tu actividad.
- Si propones un local o sugieres una corrección, nos cuentas lo que quieras sobre el **local**. Tu correo es opcional, es privado y solo lo usamos por si necesitamos preguntarte algo.
- **No publicamos ni guardamos nombres o datos de salud de personas** sin su permiso expreso. Si alguien los escribe en una propuesta, los dejamos fuera al revisarla.
- Si el negocio decide contar la historia de su equipo, lo hace él, y cada persona da su consentimiento. Puede retirarlo cuando quiera, sin dar explicaciones.

### Quién es responsable de los datos

❓ **[Pendiente: P6.]** Mientras no exista una asociación, el responsable sería la persona que impulsa el proyecto: _Marlon Bermúdez, con correo [❓ correo de contacto]_. Cuando se constituya la asociación, este apartado cambia. Hay que decidir qué datos de contacto se hacen públicos (la normativa exige identificar al responsable).

### Qué datos tratamos y para qué

| Cuándo                                 | Qué datos                                                                                          | Para qué                                                                  | Cuánto tiempo                                                                                                          |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Usas la web                            | Ninguno nuestro. El servidor y el mapa ven tu dirección IP al servirte la página (ver «Terceros»)  | Que la web funcione                                                       | Lo que conserve cada proveedor en sus registros ❓                                                                     |
| Pulsas «Cerca de mí»                   | Tu ubicación, **solo en tu dispositivo**                                                           | Ordenar los locales por distancia                                         | No se envía ni se guarda. Se pide solo cuando pulsas el botón                                                          |
| Propones un local                      | Los datos del local, cómo lo conoces, un enlace (opcional) y tu correo (opcional)                  | Revisar la propuesta y, si cumple el criterio, publicarla                 | La propuesta, hasta resolverla. El correo se borra al resolverla o a los ❓ meses                                      |
| Sugieres una corrección                | Qué hay que corregir, tu explicación, un enlace (opcional) y tu correo (opcional)                  | Revisar el aviso y, si es correcto, actualizar la ficha                   | Igual que la propuesta                                                                                                 |
| Eres moderador/a ❓ (cuando exista F5) | Tu correo y el ámbito que moderas                                                                  | Que puedas entrar y revisar propuestas                                    | Mientras seas moderador/a                                                                                              |
| Evitar mensajes no deseados            | ❓ Un contador temporal por dirección IP (límite de envíos)                                        | Evitar envíos masivos. El campo oculto del formulario no guarda nada tuyo | ❓ Horas, no se guarda                                                                                                 |
| El negocio cuenta su equipo (F3)       | Cifras del equipo; en el nivel máximo, nombre o seudónimo, puesto, historia y foto de cada persona | Mostrar la ficha con el nivel de detalle que el negocio elija             | Mientras el negocio y la persona lo mantengan. Si se retira, se oculta al momento y se borra en un máximo de ❓ 7 días |

**Base para tratar tus datos.** Tu correo y lo que escribes en los formularios los tratamos porque tú nos los das al enviar (tu consentimiento). Los datos de una persona del equipo, solo con el consentimiento explícito de esa persona. ❓ Un profesional debe confirmar las bases legales de cada fila.

### Las personas del equipo

Este apartado es el que más nos importa, así que lo contamos con palabras sencillas:

- **Una propuesta de otra persona no incluye datos de las personas del equipo.** Si alguien escribe nombres o datos de salud, los dejamos fuera al revisarla.
- **Solo el negocio puede contar la historia de su equipo**, y nunca con detalle sin que lo sepa. Hasta que el negocio lo confirme, solo mostramos información pública y verificable.
- **Cada persona decide por sí misma** si aparece, con qué nombre (puede ser un seudónimo) y con qué foto. Si corresponde, lo decide su representante legal.
- **Una historia sin consentimiento registrado no se guarda.**
- **Se puede retirar en cualquier momento y sin dar explicaciones**, escribiendo a ❓ [correo]. La historia deja de mostrarse al instante y los datos se borran en un máximo de ❓ 7 días.
- **En equipos pequeños** (❓ menos de 5 personas) cuidamos que nadie pueda reconocerse: no publicamos cifras por tipo de discapacidad ni por puesto cuando podrían identificar a alguien, y damos solo cifras generales.
- Las historias, nombres y fotos **no están bajo licencia abierta** y nunca se incluyen en las exportaciones de datos abiertos.

### Terceros que intervienen

- **Alojamiento de la web.** ❓ [Proveedor, p. ej. Netlify; confirmar y enlazar su política.] Registra la dirección IP de quien visita la web, como cualquier servidor.
- **Mapa.** Las teselas y estilos del mapa las sirve OpenFreeMap. Al abrir el mapa, tu navegador se las pide directamente y ellos ven tu dirección IP. No les enviamos nada más.
- **Backend y base de datos.** ❓ [P1: proveedor y país del servidor. Si está fuera del Espacio Económico Europeo, hay que indicarlo.]
- Ninguno de ellos recibe tus propuestas ni tu correo ❓ _(salvo el proveedor que aloje el backend)_. No vendemos ni cedemos datos a nadie.

### Datos abiertos

La base de datos de negocios se publica bajo licencia ODbL (nombre, dirección, tipo de cocina, nivel de verificación y cifras agregadas). **No incluye** historias, nombres, fotos, correos ni datos de quien propone o corrige.

### Tus derechos

Puedes pedirnos **acceder** a tus datos, **rectificarlos**, **suprimirlos**, **limitar** su uso, **oponerte** a él o recibirlos en un formato portable. Si nos diste tu consentimiento, puedes **retirarlo** cuando quieras, y eso no afecta a lo ya tratado. Escríbenos a ❓ [correo] y te responderemos en un plazo máximo de un mes.

Si alguna vez sientes que no hemos cuidado bien tus datos, puedes reclamar ante la **Agencia Española de Protección de Datos** (aepd.es). Antes de eso, nos encantará poder aclararlo contigo.

### Seguridad

Los datos se guardan en servidores con acceso restringido y conexión cifrada. El correo de quien propone o corrige solo lo ve el equipo de moderación. ❓ Concretar con el backend (P1, P5).

### Cambios en este texto

Si cambia algo importante, lo actualizaremos aquí y cambiaremos la fecha. ❓ Fecha de la versión: [al publicar].

## Qué cambia en la web con este texto

Para que el texto sea cierto, el código tiene que cumplir esto. Hoy se cumple todo salvo lo que depende del backend:

- ✅ Sin cookies ni analítica en la web.
- ⚠️ Excepción temporal del prototipo: tras enviar un formulario, `web/src/lib/data/outbox.ts` guarda en el `localStorage` del propio navegador un resumen (sin correo entero, sin nombres ni textos de historias) para mostrarlo en `/moderation`. No sale del dispositivo, se puede borrar desde esa pantalla y desaparece cuando exista el servidor. Revisar si hay que avisarlo antes de abrir al público (junto a la política de cookies).
- ✅ La ubicación solo se pide tras pulsar «Cerca de mí» y se queda en el dispositivo.
- ✅ Los formularios avisan de no escribir nombres ni datos de salud, y enlazan a esta política.
- ⏳ El envío de propuestas y correcciones está **simulado**: hasta que exista el backend no se guarda nada, y el plazo de borrado del correo y el límite por IP no se pueden implementar.
- ✅ F3 (consentimientos del equipo) existe como prototipo con envío simulado. Sus textos de consentimiento son **provisionales**: no deben publicarse sin revisión profesional y sin esta política.
- ✅ `/privacy` y `/contact` existen en la web (ES y EN) como **borrador**: llevan el texto de arriba adaptado a lista (sin tabla, para el móvil), un aviso de borrador y, en Contacto, sin correo todavía (los datos pendientes de P6 y del correo se completan después). La revisión legal y la revisión del inglés siguen pendientes.
- ⏳ Si se añade analítica, hay que actualizar este texto antes (la opción prevista es Plausible o Umami autoalojado, o ninguna).
- ⏳ Una página de **aviso legal** y la política de **cookies** (hoy basta con decir que no se usan) deben acompañar a esta antes del lanzamiento.

## Decisiones pendientes

| #   | Decisión                                                                           | Propuesta                                               |
| --- | ---------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | ❓ Quién figura como responsable y qué correo de contacto se publica (P6)          | Marlon a título personal hasta que exista la asociación |
| 2   | ❓ Plazo de borrado tras retirar una historia                                      | 7 días                                                  |
| 3   | ❓ Umbral de equipo pequeño                                                        | Menos de 5 personas                                     |
| 4   | ❓ Cuánto se guarda el correo de quien propone o corrige                           | Hasta resolver la propuesta, y como máximo 6 meses      |
| 5   | ❓ Proveedor y país del hosting y de la base de datos (P1)                         | Dentro del Espacio Económico Europeo si es posible      |
| 6   | ❓ Si se usa analítica                                                             | Ninguna al inicio                                       |
| 7   | ❓ Revisión legal y revisión por una entidad del sector, antes de abrir al público | Obligatoria (handoff §11.9)                             |
