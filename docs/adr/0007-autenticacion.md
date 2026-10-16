# ADR 0007 · Autenticación

- **Estado:** propuesta (se acepta al fusionar la PR)
- **Fecha:** 2026-10-13
- **Resuelve:** P5 (autenticación).

## Contexto

Leer el mapa no requiere cuenta, y proponer, corregir, contar el equipo o pedir una retirada tampoco (principio de mínimo dato, `08_PRIVACIDAD_LEGAL.md`). Solo Moderación necesita identificarse. Además, «Info pedida» exige que quien propuso pueda responder sin cuenta (`11_FLUJO_Y_DOMINIO.md`).

## Decisión

### Moderación: enlace mágico

1. La persona escribe su correo en la entrada de moderación. El servidor responde **siempre igual** (`202`), exista o no, para no revelar quién modera.
2. Si el correo corresponde a un usuario dado de alta (ADR 0008), se genera un token aleatorio de un solo uso (32 bytes), se guarda solo su hash y caduca a los **15 minutos**. Se envía un enlace `https://hearteats.org/<idioma>/moderation/login#token=…`. El token va en el **fragmento** (`#`) para que no llegue a registros ni a cabeceras `Referer`.
3. La página intercambia el token por una sesión (`POST /auth/session`). El servidor guarda la sesión en Mongo y devuelve la cookie `he_session`: `HttpOnly`, `Secure`, `SameSite=Strict`, sobre `api.hearteats.org`. Caduca a los **7 días** sin actividad.
4. Cierre de sesión (`POST /auth/logout`) y revocación inmediata por un administrador (se borran sus sesiones).
5. Sin contraseñas ni login social.

Protecciones: límite de solicitudes por correo y por IP, comprobación de `Origin` y de cabecera personalizada en las escrituras, y cada inicio de sesión queda en el registro de auditoría.

### Quien envía: sin cuenta

- Los envíos son anónimos, con un correo opcional y privado. Sin correo no se puede pedir información.
- Para responder a «Info pedida», el correo lleva un enlace con un **token firmado** (HMAC con secreto del servidor) que identifica la solicitud, caduca con el plazo de 30 días (más 3 de margen) y se invalida al usarlo. No es una sesión: solo permite añadir una respuesta a esa solicitud.

### Envío de correo

El servidor envía los enlaces con **Resend** (plan gratuito: 3.000 correos al mes y 100 al día, un dominio). Se envía desde un subdominio (`mail.hearteats.org`) con sus propios registros SPF y DKIM, así **no se tocan los registros de ImprovMX** (`09_CORREO.md`). `Reply-To: contact@hearteats.org`, que sí recibe. Si Resend deja de convenir, Brevo es el plan B.

## Consecuencias

- El menú deja de enseñar «Moderar propuestas (demo)» al integrar la web con el servidor; `/moderation` pide entrar.
- Resend pasa a ser un tercero que ve correos de moderación y de quien responde a una petición de información: se añade a «Terceros» en `/privacy` y a `08_PRIVACIDAD_LEGAL.md`. Región de la UE si el plan gratuito lo permite.
- Hace falta `api.hearteats.org` y los registros DNS de `mail.hearteats.org` (Netlify DNS).
- La cookie de sesión es imprescindible para una función que pide la propia persona; se refleja igualmente en `/cookies`, que hoy dice que no hay cookies.
