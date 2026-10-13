# 06 · Costes y límites de los planes

> **Estado:** borrador v0.3 · 2026-10-13. **Presupuesto del proyecto:** Railway (plan Hobby, 5 $/mes de mínimo, servidor siempre despierto) **más ~10 €/mes de margen** para todo lo demás, usado con austeridad. Las cifras de abajo salen de búsquedas en fuentes secundarias (guías y foros), no de las páginas oficiales de precios. **Hay que verificarlas al contratar cada servicio** y anotar aquí la fecha.

## Resumen

| Servicio | Para qué | Plan | Coste |
|---|---|---|---|
| Dominio `hearteats.org` | Dirección | Registro anual (Namecheap) | ~12–15 €/año |
| Netlify | Web estática, DNS | Plan heredado | 0 € |
| Railway | API (ADR 0005) | Hobby, siempre despierto | 5 $/mes de mínimo (crédito de uso incluido) |
| MongoDB Atlas | Base de datos | M0 | 0 € |
| Cloudflare R2 | Fotos y copias | Gratuito | 0 € |
| Resend | Enlaces y avisos por correo (ADR 0007) | Gratuito | 0 € |
| ImprovMX | Recibir `contact@hearteats.org` | Gratuito | 0 € |
| OpenFreeMap | Mapa (ADR 0002) | Público, sin clave | 0 € |
| Nominatim | Direcciones (ADR 0006) | Instancia pública | 0 € |
| GitHub | Código y CI | Gratuito | 0 € |

- **Gasto fijo previsto:** ~6–7 €/mes (5 $ de Railway + dominio), si el uso se queda dentro del crédito. El resto del margen (~8–10 €/mes) queda **sin asignar**.
- **Cómo gastar el margen, en este orden y solo cuando haga falta:** (1) copias automáticas y más garantía en la base de datos (plan de pago de Atlas, ❓ precio); (2) un aviso gratuito de caída (monitorización externa gratuita); (3) un buzón real para responder como `contact@` (`09_CORREO.md`, ≈ 4–7 €/mes).

## Límites a vigilar

| Servicio | Límite que importa | Qué pasa si se supera | Cómo se vigila |
|---|---|---|---|
| Railway Hobby | Los 5 $ de crédito de uso; hasta 48 vCPU / 48 GB y 5 réplicas por servicio; historial de registros de 7 días | Se factura el uso por encima de los 5 $; no hace falta cambiar de plan para crecer | Límite de uso fijado en el panel; métricas del panel; revisar la factura el primer mes |
| Netlify | Sin límite de despliegues asumido (plan heredado) | Si algún día hay un límite, se decide entonces: pagar o cambiar de proveedor | Despliegue en cada merge a `main` y vista previa en cada PR, sin racionarlos |
| Atlas M0 | 512 MB de datos; no hay copias automáticas; verificar si pausa clústeres inactivos | Las escrituras fallan al llenarse | `mongodump` semanal a R2 (ADR 0005); sobra para cientos de locales |
| R2 | 10 GB de almacenamiento, 1 M de operaciones de escritura y 10 M de lectura al mes; salida gratis | Se paga por encima (céntimos) | Fotos reducidas (< 1 MB), cuarentena que se limpia; copias que rotan a 4 semanas |
| Resend | 3.000 correos al mes y 100 al día; un dominio | El envío se pausa, no se factura | Muy por debajo: solo enlaces de moderación y avisos |
| Nominatim | 1 petición por segundo, `User-Agent` identificado, resultados guardados | Bloqueo de la IP | Cola en el servidor; una consulta por propuesta nueva |
| ImprovMX | 500 correos reenviados al día | Se pierden los que pasen | `09_CORREO.md` |

## Qué verificar antes de contratar

1. **Railway:** las tarifas de uso por GB de memoria y por vCPU (de ellas sale si cabemos en los 5 $), que haya región en la UE y el dominio propio (`api.hearteats.org`). Se factura en dólares.
2. **Atlas:** conexiones máximas y política de pausa de M0, que la región UE esté disponible y el precio de un plan con copias automáticas.
3. **Cloudflare:** si pide tarjeta para activar R2 y dónde se guardan los datos (jurisdicción UE).
4. **Resend:** región de envío y de almacenamiento (UE), y que el subdominio `mail.hearteats.org` no choque con los registros de ImprovMX.
5. **Netlify:** si aparece algún límite (despliegues, ancho de banda), anotarlo aquí y decidir entonces.
6. **Conversión:** los precios en dólares fluctúan; contar con un pequeño margen sobre los 5 $.

## Si el presupuesto se queda corto

En orden: no activar nada del margen sin necesidad → CDN delante de la API para aguantar más tráfico sin subir de plan (ADR 0005) → pedir apoyo (donaciones, `05_ROADMAP.md`, fase 5).
