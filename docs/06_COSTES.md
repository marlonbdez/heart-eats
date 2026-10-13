# 06 · Costes y límites de planes gratuitos

> **Estado:** borrador v0.2 · 2026-10-13. Presupuesto del proyecto: **como máximo ~10 €/mes en total**. Las cifras de abajo salen de búsquedas en fuentes secundarias (guías y foros), no de las páginas oficiales de precios. **Hay que verificarlas al contratar cada servicio** y anotar aquí la fecha.

## Resumen

| Servicio | Para qué | Plan | Coste |
|---|---|---|---|
| Dominio `hearteats.org` | Dirección | Registro anual (Namecheap) | ~12–15 €/año |
| Netlify | Web estática, DNS | Gratuito | 0 € |
| Render | API (ADR 0005) | Gratuito en beta; Starter al abrir | 0 € → ~7 $/mes |
| MongoDB Atlas | Base de datos | M0 | 0 € |
| Cloudflare R2 | Fotos y copias | Gratuito | 0 € |
| Resend | Enlaces y avisos por correo (ADR 0007) | Gratuito | 0 € |
| ImprovMX | Recibir `contact@hearteats.org` | Gratuito | 0 € |
| OpenFreeMap | Mapa (ADR 0002) | Público, sin clave | 0 € |
| Nominatim | Direcciones (ADR 0006) | Instancia pública | 0 € |
| GitHub | Código y CI | Gratuito | 0 € |

- **Beta privada:** ~1–1,3 €/mes (solo el dominio).
- **Abierto al público con Render Starter:** ~8–9 €/mes (7 $ + dominio), dentro del presupuesto. Margen pequeño: cualquier otro servicio de pago obliga a decidir qué se cede.

## Límites a vigilar

| Servicio | Límite que importa | Qué pasa si se supera | Cómo se vigila |
|---|---|---|---|
| Render (gratis) | Se duerme tras ~15 min sin tráfico; la primera petición tarda del orden de un minuto | Mala experiencia, no coste | Estado de carga en la web; plan B y Starter (ADR 0005) |
| Netlify (gratis) | 300 créditos al mes y un tope duro: un despliegue de producción cuesta 15; el ancho de banda también gasta | Se pausan los sitios del equipo hasta el siguiente ciclo | Pocos despliegues (la web no se recompila al publicar datos); el contador del panel de Netlify |
| Atlas M0 | 512 MB de datos; no hay copias automáticas; verificar si pausa clústeres inactivos | Las escrituras fallan al llenarse | `mongodump` semanal a R2 (ADR 0005); sobra para cientos de locales |
| R2 | 10 GB de almacenamiento, 1 M de operaciones de escritura y 10 M de lectura al mes; salida gratis | Se paga por encima (céntimos) | Fotos reducidas (< 1 MB), cuarentena que se limpia; copias que rotan a 4 semanas |
| Resend | 3.000 correos al mes y 100 al día; un dominio | El envío se pausa, no se factura | Muy por debajo: solo enlaces de moderación y avisos |
| Nominatim | 1 petición por segundo, `User-Agent` identificado, resultados guardados | Bloqueo de la IP | Cola en el servidor; una consulta por propuesta nueva |
| ImprovMX | 500 correos reenviados al día | Se pierden los que pasen | `09_CORREO.md` |

## Qué verificar antes de contratar

1. **Render:** precio vigente de Starter, regiones (Fráncfort) y dominios propios en el plan gratuito.
2. **Atlas:** conexiones máximas y política de pausa de M0, y que la región UE esté disponible en el plan gratuito.
3. **Cloudflare:** si pide tarjeta para activar R2 y dónde se guardan los datos (jurisdicción UE).
4. **Resend:** región de envío y de almacenamiento (UE), y que el subdominio `mail.hearteats.org` no choque con los registros de ImprovMX.
5. **Netlify:** cuánto cuesta el ancho de banda en créditos con la nueva lectura desde el navegador (cada visita descarga la web, no los datos).
6. **Conversión:** los precios en dólares fluctúan; reservar margen sobre los 10 €.

## Si el presupuesto se queda corto

En orden: Render Starter solo cuando haya tráfico real → copia JSON de locales en R2 para que las lecturas no dependan de la API (ADR 0005) → pasar la API a Cloudflare Workers (reabriría la pila, ADR 0005) → pedir apoyo (donaciones, `05_ROADMAP.md`, fase 5).
