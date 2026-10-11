# 09 · Correo del dominio

> Estado a 2026-10-11. Solo recibe: no se puede responder como `contact@hearteats.org` (hace falta un plan de pago o una configuración extra).

## Cómo está montado

- **Dirección pública:** `contact@hearteats.org`, visible en `/contact` y `/privacy`.
- **Reenvío:** [ImprovMX](https://improvmx.com), plan gratuito (1 dominio, 25 alias, 500 correos reenviados al día, sin envío, registro de 7 días). El alias `contact` reenvía a un correo personal del responsable (no se publica cuál).
- **DNS en Netlify** (el dominio está registrado en Namecheap, pero Netlify gestiona sus registros). Se añadieron tres registros, sin tocar los de la web:

| Tipo | Nombre | Valor | Prioridad |
|---|---|---|---|
| MX | `@` | `mx1.improvmx.com` | 10 |
| MX | `@` | `mx2.improvmx.com` | 20 |
| TXT | `@` | `v=spf1 include:spf.improvmx.com ~all` | — |

- **No** está activada la extensión «Email» de Netlify (es para enviar correos desde la web, no hace falta).
- Probado el 2026-10-11 con un correo desde otra cuenta.

## Qué hay que saber

- **Spam:** la dirección es pública, recibirá. No hay filtro propio; el del correo personal basta por ahora. Si molesta, se cambia el alias sin tocar el DNS.
- **Responder:** desde el correo personal se vería esa dirección. Si se quiere responder como `contact@`, o hay más de una persona, pasar a un buzón real (≈ 4–7 €/mes) o al plan de pago de ImprovMX. Solo cambian los registros DNS; las páginas no se tocan.
- **Continuidad:** si el responsable cambia (p. ej., al constituir la asociación, P6), se cambia el destino del alias en ImprovMX.
- **Datos personales:** los correos que llegan son datos personales. Plazos de conservación y tratamiento: ver `08_PRIVACIDAD_LEGAL.md`.
