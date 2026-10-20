# Descubrir · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md`](../10_CASOS_DE_USO.md). Todos son de **lectura**: sin cuenta y sin guardar datos de la persona. CU-05 usa la ubicación solo en memoria.

## CU-01 · Explorar el mapa
- **Quién:** Visitante; Servicio de mapas.
- **Pasos:** abre `/` → ve un marcador por local → toca uno y aparece su tarjeta → «Ver local →» lleva a CU-06.
- **Si no:** si el mapa no carga, se ofrece la lista (CU-02). Sin resultados, aparece «Quitar filtros» y «Proponer un local».
- **Reglas:** pin igual para todos (la verificación va en la tarjeta); marcadores operables con teclado; la ubicación no se pide al cargar.
- **Observación:** no se agrupan marcadores (clustering); habrá que decidirlo con cientos de locales.

## CU-02 · Ver la lista de locales
- **Quién:** Visitante.
- **Pasos:** abre la portada `/` (que es la lista; `/list` es un alias) → ve la frase que explica qué es, el número de locales y una tarjeta por cada uno (foto, nombre, barrio, plato estrella) → tocar la tarjeta lleva a CU-06. El botón «Mapa» lleva al mapa (`/map`); desde 900 px se ven lista y mapa a la vez.
- **Reglas:** es la alternativa accesible al mapa; la tarjeta es el mismo componente; mapa y lista son rutas distintas (salvo desde 900 px) y se pueden compartir.

## CU-03 · Buscar sitios
- **Quién:** Visitante. Extiende CU-01 y CU-02.
- **Pasos:** escribe en el buscador → se filtra por nombre, barrio, ciudad o código postal (sin mayúsculas ni tildes) → la búsqueda queda en la URL (`?q=`).
- **Si no:** si lo escrito parece una comida, ofrece «Filtrar por Pizza» (CU-04).
- **Reglas:** busca sitios, no comida; no busca direcciones exactas (hace falta P4); el texto no sale del dispositivo.

## CU-04 · Filtrar por tipo de comida
- **Quién:** Visitante. Extiende CU-01 y CU-02.
- **Pasos:** pulsa una o varias categorías → se muestran los locales que tengan alguna (combinan con «o») → vuelve a pulsar para quitarla.
- **Reglas:** nunca se filtra por discapacidad; cada categoría lleva icono y texto; quedan en la URL (`?food=`).

## CU-05 · Ordenar por cercanía
- **Quién:** Visitante; Geolocalización. Extiende CU-01 y CU-02.
- **Pasos:** pulsa «Cerca de mí» → el navegador pide permiso → se ordena por distancia y se muestra en tarjetas y fichas → pulsar de nuevo la descarta.
- **Si no:** sin permiso, sin geolocalización, con error o fuera de la zona (60 km de Madrid) hay un aviso y se sigue en Madrid.
- **Reglas:** solo se pide tras pulsar; la posición vive en memoria, nunca se guarda ni se envía; la distancia es en línea recta.

## CU-06 · Consultar la ficha de un local
- **Quién:** Visitante. Incluye CU-09.
- **Pasos:** llega desde una tarjeta o un enlace → ve foto, nombre, dirección y sello → platos estrella (1 a 3) → acciones (CU-07), equipo (CU-08), horario y verificación (CU-09) → «Volver» regresa al mapa o a la lista de donde se venía, con su búsqueda → al final, «Sugerir una corrección» y «¿Es tu local?».
- **Si no:** si la dirección no existe, aparece «No encontramos esta página».
- **Reglas:** una foto por ficha, aportada por el negocio; la verificación va después del contenido gastronómico; los datos actuales son de ejemplo.
- **Observación:** la ficha no enlaza a «Pedir una retirada».

## CU-07 · Llegar al local o contactarlo
- **Quién:** Visitante; Servicio de mapas. Extiende CU-06.
- **Pasos:** «Cómo llegar» abre las indicaciones en una pestaña nueva. «Llamar» y «Web» aparecen solo si el local tiene teléfono o web.
- **Reglas:** solo se envía el destino, no la ubicación de la persona.

## CU-08 · Consultar el equipo del local
- **Quién:** Visitante. Extiende CU-06.
- **Pasos:** ve siempre la cifra («N de M personas») → según el nivel elegido por el negocio, añade áreas y tipos, o historias con nombre.
- **Reglas:** sin confirmación del negocio, o con menos de 5 personas (provisional), solo la cifra; áreas y tipos se cuentan por separado para que nadie sea reconocible; nombres e historias solo con consentimiento (CU-17); lenguaje digno, sin pena.

## CU-09 · Consultar la verificación del local
- **Quién:** Visitante. Incluido en CU-06.
- **Pasos:** ve la insignia (🟢 Verificado o 🟡 Confirmado), el método y la fecha → el enlace «¿Cómo verificamos?» lleva a CU-29.
- **Reglas:** la insignia siempre lleva texto; en el MVP solo se publican 🟢 o 🟡; si la ficha tiene la marca de revisión se añade «Pendiente de revisión».
- **Observación:** nada trata todavía las fichas pendientes (CU-34).
