# ADR 0002 · Mapa: MapLibre GL + OpenFreeMap

- **Estado:** aceptada
- **Fecha:** 2026-10-06
- **Resuelve:** P3 (proveedor de teselas). Modifica §4 y §12 del handoff: se usa MapLibre GL en lugar de Leaflet.

## Contexto

HeartEats es software libre sin ánimo de lucro y sin presupuesto: no podemos depender de planes con cuotas, claves de API ni facturación. El handoff preveía Leaflet con teselas de un proveedor externo (MapTiler, Stadia…) y una posible migración a MapLibre GL más adelante. Los proveedores con plan gratuito exigen registro, clave y vigilar cuotas.

## Decisión

- **Librería:** MapLibre GL JS (licencia BSD-3-Clause, compatible con AGPL-3.0).
- **Teselas y estilos:** instancia pública de [OpenFreeMap](https://openfreemap.org): sin clave, sin registro y, según su web, sin límites de uso; uso comercial permitido con atribución (MapLibre la añade sola).
- **Estilos:** `positron` en modo claro y `dark` en modo oscuro (`https://tiles.openfreemap.org/styles/<estilo>`).
- La URL del estilo vive en un único módulo de configuración (`web/src/lib/map-config.ts`).

## Motivos

- Coste cero y sin cuentas externas que mantener.
- Teselas vectoriales: zoom fluido, modo oscuro y estilo ajustable a nuestra paleta.
- Evita una migración posterior de Leaflet a MapLibre.
- Clustering incluido en MapLibre, sin plugins.

## Riesgos y plan B

- **OpenFreeMap se sostiene con donaciones y sus términos lo ofrecen "tal cual", sin garantía de continuidad.** Si dejara de funcionar o cambiara sus condiciones, se cambia la URL del estilo por:
  1. **Protomaps** (PMTiles autoalojado en un almacenamiento estático; coste casi nulo), o
  2. un proveedor con plan gratuito y clave.
  Las pantallas no cambian.
- MapLibre usa WebGL y dibuja el fondo en un lienzo, menos accesible que HTML. Mitigación: marcadores como botones del DOM con etiqueta, controles de zoom con teclado y **vista de lista equivalente** (requisito ya fijado en el diseño).
- Si el proyecto crece, apoyar a OpenFreeMap con una donación.

## Consecuencias

- La atribución (OpenFreeMap, OpenMapTiles, OpenStreetMap) debe permanecer visible en el mapa.
- Los datos de OpenStreetMap implican respetar ODbL (ver ADR 0001).
- Hay que comprobar en el navegador (WebGL) el comportamiento en móviles antiguos y ofrecer alternativa si falla.
