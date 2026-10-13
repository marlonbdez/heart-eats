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

## Motivos

- Cero coste y cero cuentas.
- El volumen está muy por debajo del límite; geocodificar en moderación en vez de al enviar evita que cualquiera pueda gastar peticiones con el formulario.
- Los datos de OpenStreetMap ya son parte del proyecto (ODbL, ADR 0001).

## Plan B

Si la instancia pública limita o cae, o el proyecto crece: Photon o el geocodificador de un proveedor con plan gratuito, o una instancia propia. El cambio queda en un único módulo del servidor.

## Consecuencias

- La propuesta de un local nuevo no lleva coordenadas; las pone el servidor.
- Hay que documentar el `User-Agent` y el contacto en la configuración del servidor, sin claves.
