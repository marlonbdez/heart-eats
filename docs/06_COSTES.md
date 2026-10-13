# 06 · Costes y límites de los planes

> **Estado:** borrador v0.3 · 2026-10-13. **Presupuesto del proyecto:** Render de pago (plan Starter, ~7 $/mes, servidor siempre despierto) **más ~10 €/mes de margen** para todo lo demás, usado con austeridad. Las cifras de abajo salen de búsquedas en fuentes secundarias (guías y foros), no de las páginas oficiales de precios. **Hay que verificarlas al contratar cada servicio** y anotar aquí la fecha.

## Resumen

| Servicio | Para qué | Plan | Coste |
|---|---|---|---|
| Dominio `hearteats.org` | Dirección | Registro anual (Namecheap) | ~12–15 €/año |
| Netlify | Web estática, DNS | Plan heredado de Marlon (❓ verificar límites) | 0 € |
| Render | API (ADR 0005) | Starter, siempre despierto | ~7 $/mes |
| MongoDB Atlas | Base de datos | M0 | 0 € |
| Cloudflare R2 | Fotos y copias | Gratuito | 0 € |
| Resend | Enlaces y avisos por correo (ADR 0007) | Gratuito | 0 € |
| ImprovMX | Recibir `contact@hearteats.org` | Gratuito | 0 € |
| OpenFreeMap | Mapa (ADR 0002) | Público, sin clave | 0 € |
| Nominatim | Direcciones (ADR 0006) | Instancia pública | 0 € |
| GitHub | Código y CI | Gratuito | 0 € |

- **Gasto fijo previsto:** ~8–9 €/mes (7 $ de Render + dominio). El resto del margen (~8–10 €/mes) queda **sin asignar**.
- **Cómo gastar el margen, en este orden y solo cuando haga falta:** (1) copias automáticas y más garantía en la base de datos (plan de pago de Atlas, ❓ precio); (2) un aviso gratuito de caída (monitorización externa gratuita); (3) un buzón real para responder como `contact@` (`09_CORREO.md`, ≈ 4–7 €/mes).

## Límites a vigilar

| Servicio | Límite que importa | Qué pasa si se supera | Cómo se vigila |
|---|---|---|---|
| Render Starter | Memoria (512 MB) y CPU compartida; un servicio | Lentitud o reinicios con mucho tráfico | Registros y métricas del panel; subir de plan solo con datos reales |
| Netlify | Plan heredado: Marlon cree que no limita los despliegues. Si fuera el plan gratuito actual: 300 créditos al mes (15 por despliegue de producción; el ancho de banda también gasta) | Con créditos agotados, los sitios se pausan | ❓ Comprobar en el panel qué límites tiene realmente. El diseño no depende de ello: la web no se recompila al publicar datos |
| Atlas M0 | 512 MB de datos; no hay copias automáticas; verificar si pausa clústeres inactivos | Las escrituras fallan al llenarse | `mongodump` semanal a R2 (ADR 0005); sobra para cientos de locales |
| R2 | 10 GB de almacenamiento, 1 M de operaciones de escritura y 10 M de lectura al mes; salida gratis | Se paga por encima (céntimos) | Fotos reducidas (< 1 MB), cuarentena que se limpia; copias que rotan a 4 semanas |
| Resend | 3.000 correos al mes y 100 al día; un dominio | El envío se pausa, no se factura | Muy por debajo: solo enlaces de moderación y avisos |
| Nominatim | 1 petición por segundo, `User-Agent` identificado, resultados guardados | Bloqueo de la IP | Cola en el servidor; una consulta por propuesta nueva |
| ImprovMX | 500 correos reenviados al día | Se pierden los que pasen | `09_CORREO.md` |

## Qué verificar antes de contratar

1. **Render:** precio vigente de Starter (se factura en dólares), región de Fráncfort y dominio propio (`api.hearteats.org`).
2. **Atlas:** conexiones máximas y política de pausa de M0, que la región UE esté disponible y el precio de un plan con copias automáticas.
3. **Cloudflare:** si pide tarjeta para activar R2 y dónde se guardan los datos (jurisdicción UE).
4. **Resend:** región de envío y de almacenamiento (UE), y que el subdominio `mail.hearteats.org` no choque con los registros de ImprovMX.
5. **Netlify:** qué incluye exactamente el plan heredado (despliegues, ancho de banda, funciones) y cuánto ancho de banda gasta la web.
6. **Conversión:** los precios en dólares fluctúan; contar con un pequeño margen sobre los 7 $.

## Si el presupuesto se queda corto

En orden: no activar nada del margen sin necesidad → CDN delante de la API para aguantar más tráfico sin subir de plan (ADR 0005) → pedir apoyo (donaciones, `05_ROADMAP.md`, fase 5).
