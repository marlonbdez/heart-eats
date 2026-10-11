# Paquete Descubrir · fichas

> Diagrama y catálogo: [`../10_CASOS_DE_USO.md` §5.1](../10_CASOS_DE_USO.md). Cómo leer una ficha: [README](README.md).

Todos los CU de este paquete son de **lectura**: no piden cuenta, no envían nada y no guardan datos de la persona. La excepción es CU-05, que usa su ubicación solo en memoria.

---

## CU-01 · Explorar el mapa

- **Actores:** Visitante (principal); Servicio de mapas (secundario).
- **Resumen:** El Visitante ve sobre un mapa de Madrid los locales publicados. Al tocar un marcador aparece una tarjeta con el plato estrella, el local, el sello «Equipo inclusivo» y la insignia de verificación.
- **Precondiciones:** Ninguna. No hace falta cuenta ni dar la ubicación.
- **Poscondiciones:** Se muestra el mapa con un marcador por cada local que cumple la búsqueda y los filtros. Si se tocó un marcador, queda abierta su tarjeta y el marcador resaltado.

**Flujo principal**

1. **Visitante** abre la web (`/`).
2. **Sistema** crea el mapa centrado en Madrid, con el estilo claro u oscuro según el sistema del dispositivo.
3. **Sistema** coloca un marcador (pin clásico, igual para todos) por cada local que cumple la búsqueda y los filtros activos.
4. **Visitante** toca un marcador.
5. **Sistema** resalta el marcador, abre la tarjeta de vista previa, desplaza el mapa lo justo si la tarjeta lo tapa y lleva el foco a la tarjeta.
6. **Visitante** toca «Ver local →» en la tarjeta y pasa a [CU-06](#cu-06--consultar-la-ficha-de-un-local).

**Flujos alternativos y excepciones**

- **2a.** El mapa no se puede crear en este dispositivo: se muestra un aviso («Parece que el mapa no se puede mostrar…») con un enlace a la lista ([CU-02](#cu-02--ver-la-lista-de-locales)).
- **3a.** No hay locales que cumplan la búsqueda: se muestra «No hemos encontrado locales con esa búsqueda», con «Quitar filtros» y «Proponer un local» ([CU-10](../10_CASOS_DE_USO.md)).
- **5a.** Hay búsqueda o filtros activos: el mapa se encuadra sobre los resultados; sin ellos, vuelve a la vista inicial.
- **6a.** El Visitante cierra la tarjeta con «×», con Esc o tocando el fondo del mapa. Con «×» o Esc, el foco vuelve al marcador.
- **6b.** El local seleccionado deja de estar entre los resultados (cambió la búsqueda): la tarjeta se cierra sola.

**Reglas y requisitos especiales**

- El marcador es uniforme; la verificación va en la tarjeta, no en el mapa (decisión de diseño n.º 2).
- Los marcadores son botones con nombre accesible («<local>, ver vista previa»), operables con teclado.
- El mapa nunca es la única vía: toda función tiene alternativa en lista (principio de diseño n.º 5).
- No se pide la ubicación al cargar (decisión n.º 3).
- Los movimientos del mapa respetan `prefers-reduced-motion`.
- El tamaño de la tarjeta y la posición de los controles se comprueban a 320–390 px, también con tipografía ancha.

**Relaciones:** extendido por CU-03, CU-04 y CU-05. Conduce a CU-06. Alternativa: CU-02.

**Implementación:** `/` · `Discover`, `MapView` (se carga bajo demanda con `MapLoader`), `RestaurantCard` · `getRestaurants` · estilos en `lib/map-config.ts`.

**Observaciones:** el documento original del MVP preveía agrupar marcadores (clustering). Hoy no se hace; con pocos locales no se nota, pero habrá que decidirlo antes de tener cientos.

---

## CU-02 · Ver la lista de locales

- **Actores:** Visitante.
- **Resumen:** El Visitante ve los mismos locales que en el mapa, como una lista de tarjetas. Es la alternativa accesible al mapa y la que se usa si el mapa no carga.
- **Precondiciones:** Ninguna.
- **Poscondiciones:** Se muestra la lista con el número de resultados anunciado a los lectores de pantalla.

**Flujo principal**

1. **Visitante** abre `/list`, o pulsa «Lista» en el conmutador Mapa / Lista.
2. **Sistema** muestra cuántos locales hay («Ningún local», «1 local», «N locales») y una lista de tarjetas, cada una con plato estrella, local, sello, insignia y enlace a la ficha.
3. **Visitante** toca «Ver local →» y pasa a [CU-06](#cu-06--consultar-la-ficha-de-un-local).

**Flujos alternativos y excepciones**

- **1a.** Viene del mapa con una búsqueda: el conmutador lleva la búsqueda y los filtros (`?q=…&food=…`), así que la lista muestra lo mismo.
- **2a.** No hay resultados: el mismo estado vacío que en CU-01 (paso 3a).
- **2b.** Con la ubicación compartida (CU-05), la lista va ordenada por cercanía y cada tarjeta muestra la distancia.

**Reglas y requisitos especiales**

- La tarjeta es el mismo componente que en el mapa, para que no haya dos versiones de lo mismo.
- El número de resultados se anuncia con `role="status"` cada vez que cambia.
- Sin ubicación, el orden es el de los datos.
- Las dos vistas son **rutas distintas**, no un estado interno: cada una se puede compartir y recargar.

**Relaciones:** extendido por CU-03, CU-04 y CU-05. Conduce a CU-06. Alternativa de CU-01.

**Implementación:** `/list` · `Discover`, `ViewSwitch`, `RestaurantCard`.

---

## CU-03 · Buscar sitios

- **Actores:** Visitante.
- **Resumen:** El Visitante escribe un texto y ve solo los locales cuyo nombre, barrio, ciudad o código postal lo contienen. Se busca sin distinguir mayúsculas ni tildes.
- **Precondiciones:** Está en el mapa o en la lista.
- **Poscondiciones:** Los resultados (marcadores o tarjetas) y el contador reflejan la búsqueda; la búsqueda queda en la dirección de la página.

**Flujo principal**

1. **Visitante** escribe en el buscador («Local, barrio o código postal»).
2. **Sistema** filtra con cada pulsación y combina el texto con los filtros de comida activos: el local debe cumplir el texto **y** alguna de las comidas elegidas.
3. **Sistema** actualiza marcadores o tarjetas y el contador de resultados.
4. **Sistema** escribe la búsqueda en la URL (`?q=…`) sin recargar y sin añadir pasos al historial, para poder compartirla o recargarla.

**Flujos alternativos y excepciones**

- **2a.** Lo escrito (dos letras o más) parece una categoría de comida: el Sistema ofrece hasta tres atajos «Filtrar por Pizza». Si el Visitante elige uno, se activa el filtro y se vacía el texto ([CU-04](#cu-04--filtrar-por-tipo-de-comida)).
- **3a.** No hay resultados y tampoco sugerencias: estado vacío con «Quitar filtros» y «Proponer un local».
- **4a.** El Visitante pulsa «×» en el campo: el texto se borra y vuelven todos los locales.
- **4b.** Al abrir una dirección con `?q=…`, el Sistema lee la búsqueda y la aplica.

**Reglas y requisitos especiales**

- El buscador busca **sitios**; la comida se filtra con las categorías (decisión de diseño n.º 13).
- La búsqueda de direcciones exactas queda fuera del MVP: requiere geocodificación (P4).
- Pulsar Intro no recarga la página.
- El campo tiene etiqueta visible para lectores de pantalla y botón de borrar con nombre accesible.
- El texto buscado no sale del dispositivo: se filtra en el cliente con `matchesQuery` (`lib/search.ts`), el mismo criterio que aplicará la API.

**Relaciones:** extiende CU-01 y CU-02. Puede activar CU-04.

**Implementación:** `SearchBar`, `Discover` · `lib/search.ts` (`matchesQuery`, `matchFoodTags`).

---

## CU-04 · Filtrar por tipo de comida

- **Actores:** Visitante.
- **Resumen:** El Visitante elige una o varias categorías de comida (pizza, café, tapas…) y ve solo los locales que ofrecen alguna de ellas.
- **Precondiciones:** Está en el mapa o en la lista.
- **Poscondiciones:** Los resultados reflejan las categorías activas; quedan en la URL (`?food=…`).

**Flujo principal**

1. **Visitante** pulsa una categoría de la fila de iconos.
2. **Sistema** la marca como activa y muestra los locales que tienen esa categoría.
3. **Visitante** pulsa otra: las activas se combinan con «o» (pizza **o** café).
4. **Visitante** vuelve a pulsar una activa para quitarla.

**Flujos alternativos y excepciones**

- **2a.** Ningún local cumple: estado vacío con «Quitar filtros», que borra a la vez el texto y las categorías.
- **2b.** Al abrir una dirección con `?food=…`, se activan las categorías conocidas y se ignoran las que no existen.

**Reglas y requisitos especiales**

- Se filtra por **comida**, nunca por tipo de discapacidad: todos los locales del mapa tienen equipo inclusivo y la discapacidad no es una categoría de búsqueda (decisión de diseño n.º 9).
- Categorías actuales: pizza, hamburguesas, sushi, italiana, café, postres, tapas, menú del día, panadería y vegetariano.
- Cada categoría es un botón con `aria-pressed`, con icono **y** texto: la información no depende solo del color.
- La etiqueta de cada categoría vive en `messages/<idioma>.json` (`foodTags.<clave>`).

**Relaciones:** extiende CU-01 y CU-02. Puede ser activado desde CU-03.

**Implementación:** `FoodFilters`, `Discover` · `getFoodTags` · `lib/search.ts`.

---

## CU-05 · Ordenar por cercanía

- **Actores:** Visitante (principal); Geolocalización del dispositivo (secundario).
- **Resumen:** El Visitante pulsa «Cerca de mí», comparte su ubicación y los locales pasan a ordenarse por distancia, que se muestra en tarjetas y fichas.
- **Precondiciones:** El navegador permite geolocalización. La ubicación **solo se pide tras pulsar el botón**, nunca al cargar.
- **Poscondiciones:** Con éxito, la posición queda en memoria mientras dura la visita (sobrevive al cambio mapa ↔ lista) y los resultados van ordenados por cercanía. No se guarda ni se envía.

**Flujo principal**

1. **Visitante** pulsa «Cerca de mí».
2. **Sistema** pasa a «pidiendo» (botón desactivado) y muestra un aviso con lo que hará con la ubicación.
3. **Geolocalización** pide permiso al Visitante y, si lo da, devuelve la posición (espera máxima de 10 s).
4. **Sistema** comprueba que la posición está dentro de la zona de cobertura (hoy, 60 km alrededor de Madrid).
5. **Sistema** ordena los locales por distancia y muestra la distancia en cada tarjeta y en la ficha («350 m», «1,2 km»).
6. **Sistema** (en el mapa) centra la vista en la persona con zoom 14 y coloca un punto «Tu ubicación».
7. El botón queda pulsado (`aria-pressed`). **Visitante** puede pulsarlo de nuevo para desactivarlo.

**Flujos alternativos y excepciones**

- **3a.** El navegador no tiene geolocalización: aviso «No hemos podido obtener tu ubicación. Seguimos en Madrid.»
- **3b.** El Visitante deniega el permiso: aviso «No tenemos permiso para usar tu ubicación…», con la indicación de cómo activarlo en el navegador.
- **3c.** Falla o se agota el tiempo: mismo aviso que 3a.
- **4a.** La posición está fuera de la zona: aviso «Aún no hay locales cerca de ti. Seguimos en Madrid.» No se ordena ni se guarda la posición.
- **7a.** Al desactivar, la posición se descarta y se vuelve al orden normal.

**Reglas y requisitos especiales**

- Privacidad: la ubicación vive solo en memoria; no va a `localStorage` ni a ningún servidor (`08_PRIVACIDAD_LEGAL.md`).
- La distancia es en línea recta, no por calles.
- Se redondea a 10 m y nunca se muestra menos de 10 m.
- Los avisos se anuncian con `role="status"`.
- En móvil a 320 px, el conmutador y «Cerca de mí» caben en la fila también con tipografías anchas.

**Relaciones:** extiende CU-01 y CU-02. Su resultado (la distancia) se ve también en CU-06.

**Implementación:** `NearMeButton`, `NearMeNotice`, `LocationProvider` (en el layout), `Distance` · `lib/geo.ts` (`distanceMeters`, `isInCoverage`, `sortByDistance`) · `lib/map-config.ts` (`coverage`).

---

## CU-06 · Consultar la ficha de un local

- **Actores:** Visitante.
- **Resumen:** El Visitante ve todo lo que se sabe de un local: sus platos estrella, cómo llegar, el equipo que hay detrás, el horario y quién y cuándo lo verificó.
- **Precondiciones:** El local existe y está publicado (tiene su dirección `/place/<slug>`).
- **Poscondiciones:** Se muestra la ficha completa en el idioma activo.

**Flujo principal**

1. **Visitante** llega desde una tarjeta (CU-01, CU-02) o con un enlace directo.
2. **Sistema** muestra, por este orden: foto (o ilustración neutra), nombre, tipo de negocio y dirección, distancia si hay ubicación, sello «Equipo inclusivo» y descripción.
3. **Sistema** muestra los platos estrella (de 1 a 3), con nombre y descripción corta.
4. **Sistema** muestra las acciones ([CU-07](#cu-07--llegar-al-local-o-contactarlo)), el equipo ([CU-08](#cu-08--consultar-el-equipo-del-local)) y el horario.
5. **Sistema** muestra la verificación ([CU-09](#cu-09--consultar-la-verificación-del-local)), después del contenido gastronómico.
6. **Sistema** ofrece al final «Sugerir una corrección» (CU-12) y «¿Es tu local? Cuenta cómo es tu equipo» (CU-15), ambos con este local ya elegido.

**Flujos alternativos y excepciones**

- **1a.** La dirección no corresponde a ningún local: página «No encontramos esta página» (bilingüe, porque en ese punto no hay idioma fijado).
- **2a.** El local no tiene foto: se muestra una ilustración con texto alternativo.
- **2b.** No hay descripción en el idioma activo: se usa la de español.
- **4a.** El local no tiene horario: el bloque no aparece. Los días con el mismo horario se agrupan («lunes a viernes»).
- **6a.** **Visitante** pulsa «Volver» y regresa al mapa.

**Reglas y requisitos especiales**

- Una foto por ficha en el MVP, aportada por el negocio o con su permiso (decisión de diseño n.º 4).
- La verificación va después del contenido gastronómico: transparente, pero sin protagonismo (decisión n.º 11).
- Todos los textos salen en el idioma activo; los datos propios del local (nombre, platos) no se traducen.
- Los datos actuales son de ejemplo (`isDemo`).

**Relaciones:** incluye CU-09. Extendido por CU-07 y CU-08. Conduce a CU-12, CU-15 y CU-29.

**Implementación:** `/place/[slug]` · `RestaurantDetail`, `HoursBlock`, `TeamBlock` · `getRestaurant` · `lib/hours.ts`, `lib/team.ts`.

**Observaciones**

- «Volver» lleva siempre al mapa inicial (`/`): no recuerda si se venía de la lista ni la búsqueda. Mejora pequeña y candidata a PR propia.
- La ficha no enlaza a «Pedir una retirada» ([CU-13](../10_CASOS_DE_USO.md)); solo se llega desde el menú, Contacto y Privacidad. `04_DISENO_UI.md` (F6) ya lo describe así.
- El modelo de datos tiene correo e Instagram del local, pero la ficha solo muestra teléfono y web.

---

## CU-07 · Llegar al local o contactarlo

- **Actores:** Visitante (principal); Servicio de mapas (secundario).
- **Resumen:** Desde la ficha, el Visitante pide indicaciones para llegar, llama al local o abre su web.
- **Precondiciones:** Tiene abierta la ficha (CU-06).
- **Poscondiciones:** El Visitante sale de HeartEats hacia el servicio de mapas, el teléfono o la web del local.

**Flujo principal**

1. **Visitante** pulsa «Cómo llegar».
2. **Sistema** abre en una pestaña nueva las indicaciones del servicio de mapas con el local como destino.

**Flujos alternativos y excepciones**

- **1a.** El Visitante pulsa «Llamar»: el dispositivo abre la llamada (`tel:`). Solo aparece si el local tiene teléfono.
- **1b.** El Visitante pulsa «Web»: se abre la web del local en pestaña nueva. Solo aparece si el local tiene web.

**Reglas y requisitos especiales**

- «Cómo llegar» es la acción principal y siempre está.
- Solo se envía el **destino**; la ubicación de la persona no se comparte desde HeartEats (el servicio de mapas la pedirá por su cuenta).
- Los enlaces externos se abren con `rel="noopener noreferrer"`.

**Relaciones:** extiende CU-06.

**Implementación:** `RestaurantDetail` (bloque de acciones).

---

## CU-08 · Consultar el equipo del local

- **Actores:** Visitante.
- **Resumen:** El Visitante ve «El equipo detrás de cada plato», con el nivel de detalle que el propio negocio eligió: solo cifras, áreas y tipos, o historias con nombre.
- **Precondiciones:** La ficha tiene datos del equipo.
- **Poscondiciones:** Se muestra el bloque en el nivel que corresponde.

**Flujo principal**

1. **Sistema** decide el nivel con el que se muestra el equipo (ver reglas).
2. **Sistema** muestra siempre la cifra: «**N de M personas** del equipo tienen discapacidad».
3. En el nivel *áreas y tipos*, añade las áreas de trabajo y, aparte, los tipos de discapacidad.
4. En el nivel *historias*, añade cada historia con nombre, puesto y texto, y la nota «Historia compartida con el consentimiento de la persona, que puede retirarlo cuando quiera.»

**Flujos alternativos y excepciones**

- **1a.** La ficha no tiene datos del equipo: el bloque no aparece.
- **1b.** El negocio todavía no ha confirmado que quiere aparecer: solo se muestra la cifra, aunque haya más datos.
- **1c.** Equipo de menos de 5 personas: solo la cifra, aunque el negocio haya elegido otro nivel.
- **4a.** Una historia sin foto muestra la inicial del nombre.

**Reglas y requisitos especiales**

- **Nivel mostrado** = lo que el negocio eligió, con dos límites: sin confirmación del negocio, solo la cifra; en equipos pequeños, solo la cifra (`effectiveTeamLevel`).
- El umbral de 5 personas es **provisional** (`04_DISENO_UI.md`, F3).
- Áreas y tipos de discapacidad se cuentan **por separado, sin cruzarlos**, para que nadie pueda reconocerse («una persona sorda en cocina»).
- Los nombres y las historias solo aparecen con el consentimiento de cada persona (CU-17).
- La inicial o foto del avatar es decorativa (`aria-hidden`); el nombre va en el texto.
- Lenguaje digno: sin pena, sin «inspiración».

**Relaciones:** extiende CU-06. Su contenido lo define el negocio en CU-15 y lo aprueba Moderación (CU-22). El mismo componente se usa en la vista previa de CU-16.

**Implementación:** `TeamBlock` · `lib/team.ts` (`effectiveTeamLevel`, `isSmallTeam`) · tipos `Team` en `lib/types.ts`.

---

## CU-09 · Consultar la verificación del local

- **Actores:** Visitante.
- **Resumen:** El Visitante ve quién comprobó el local, con qué método y cuándo, para saber hasta qué punto fiarse.
- **Precondiciones:** Tiene a la vista una tarjeta o una ficha.
- **Poscondiciones:** Conoce el nivel, el método y la fecha de la última verificación.

**Flujo principal**

1. **Sistema** muestra la insignia: 🟢 «Verificado» o 🟡 «Confirmado».
2. **Sistema** añade el método (visita, llamada, documentación o confirmación del propio negocio) y la fecha de la última verificación.
3. **Sistema** (en la ficha) ofrece el enlace «¿Cómo verificamos?».
4. **Visitante** lo sigue y pasa a [CU-29](informacion.md#cu-29--consultar-cómo-se-verifica).

**Flujos alternativos y excepciones**

- **2a.** La ficha está marcada como pendiente de revisión: se añade «Pendiente de revisión» a la insignia.

**Reglas y requisitos especiales**

- La insignia siempre lleva **texto**; el color y el emoji nunca son la única información.
- La tarjeta muestra mes y año; la ficha, la fecha completa.
- En el MVP solo se publican fichas 🟢 o 🟡. El nivel ⚪ «sin verificar» es interno (`07_VERIFICACION.md`).
- La marca «pendiente de revisión» viene en el dato (`needsReview`); la web no la calcula. Con el servidor, la fijará la regla de los 12 meses.

**Relaciones:** incluido en CU-06. También se ve en las tarjetas de CU-01 y CU-02. Conduce a CU-29.

**Implementación:** `VerificationBadge` (tarjeta), bloque de verificación en `RestaurantDetail` (ficha).

**Observaciones:** hoy nada trata las fichas marcadas como pendientes; ver CU-34 en el catálogo.
