# ADR 0006 · Geocodificación

- **Estado:** propuesta (se acepta al fusionar la PR)
- **Fecha:** 2026-10-13
- **Resuelve:** P4 (de dirección a coordenadas).

## Contexto

Quien propone un local escribe calle, código postal y ciudad; el mapa necesita coordenadas. Solo hace falta geocodificar locales nuevos que entran en moderación: serán decenas, no miles. No queremos claves, cuotas ni dependencias externas en el formulario público (ADR 0002, presupuesto).

## Decisión

- **Servicio:** Nominatim (instancia pública de OpenStreetMap), llamado **desde el servidor**, nunca desde el navegador ni mientras se escribe en el formulario (sin autocompletado).
- **Cuándo:** la primera vez que Moderación abre una propuesta de local nuevo. El resultado se guarda en la solicitud y no se vuelve a pedir. De él salen el pin que se enseña y el aviso de duplicado por distancia. La persona que modera puede **colocar el pin a mano** si la dirección no se resuelve o el resultado no convence; al aprobar, vale esa posición.
- **Condiciones de uso:** una petición por segundo como máximo (cola en el servidor), `User-Agent` que identifica el proyecto y un contacto, resultados guardados (no se repite la misma consulta) y atribución a OpenStreetMap, que el mapa ya muestra.
- **Fallo:** si Nominatim no responde, la solicitud sigue siendo revisable sin pin y la decisión «aprobar» pide colocarlo a mano.

**Pin de quien propone (2026-10-19):** la propuesta lleva país y, si la persona lo coloca en un mapa, también el pin. Ese pin sustituye a la geocodificación (ya no hace falta consultar a Nominatim ni tener calle); sin él, la dirección se busca dentro del país. Moderación sigue pudiendo moverlo. El mapa no consulta ningún servicio de direcciones: sigue sin haber autocompletado.

## Motivos

- Cero coste y cero cuentas.
- El volumen está muy por debajo del límite; geocodificar en moderación en vez de al enviar evita que cualquiera pueda gastar peticiones con el formulario.
- Los datos de OpenStreetMap ya son parte del proyecto (con su licencia y su atribución, ADR 0009).

## Plan B

Si la instancia pública limita o cae, o el proyecto crece: Photon o el geocodificador de un proveedor con plan gratuito, o una instancia propia. El cambio queda en un único módulo del servidor.

**Nombre de la ciudad por idioma (2026-10-18):** al publicar un local (o al corregir su ciudad), el servidor pregunta a Nominatim cómo se llama la ciudad en cada idioma de la web (una petición por idioma, por la misma cola de 1 por segundo) y lo guarda en `address.cityNames` (`{ es, en }`). Es un añadido: si falla o no la conoce, se publica igual y la web usa `address.city`, que va como se escribe allí. La ciudad escrita por quien propone sigue siendo la que forma la zona (`cityKey`), así que una misma ciudad escrita de dos maneras son dos zonas; se arregla corrigiendo la ficha.

## Consecuencias

- La propuesta de un local nuevo no lleva coordenadas; las pone el servidor.
- Hay que documentar el `User-Agent` y el contacto en la configuración del servidor, sin claves.
