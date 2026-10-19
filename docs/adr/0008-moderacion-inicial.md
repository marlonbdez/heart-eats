# ADR 0008 · Moderación inicial y ascenso

- **Estado:** propuesta (se acepta al fusionar la PR)
- **Fecha:** 2026-10-13
- **Resuelve:** P9 (quién modera Madrid al inicio y cómo se asciende).

## Contexto

Nada se publica sin revisión humana y sin el sí del negocio (`07_VERIFICACION.md`). Los primeros 15–20 locales los verifica Marlon. Moderar implica ver correos de quien propone y, en el futuro, historias de personas del equipo.

## Decisión

- **Al inicio modera una sola persona:** Marlon, con rol `admin` y ámbito Madrid.
- **Roles** (`User.role`): `moderator` (decide solicitudes de su ámbito) y `admin` (ve y decide en todas las regiones, y además da de alta y de baja a moderadores y ve el registro de auditoría completo). Ámbito (`moderationScope`): lista de `{country, city?}`.
- **Alta:** solo la crea un `admin`, por invitación: escribe el correo y el ámbito, y la persona entra por enlace mágico (ADR 0007). No hay autoalta.
- **Qué decide un moderador:** locales nuevos y correcciones. **Equipo y retiradas** (los que tocan a personas) los decide un `admin` hasta pasar la revisión legal y fijar cómo se revisan las historias (`casos-de-uso/moderacion.md`, CU-22).
- **Criterio de ascenso (propuesta):** se invita a quien haya revisado junto a un admin un puñado de solicitudes (en torno a 10), conozca la guía de verificación (`07_VERIFICACION.md`) y acepte por escrito la confidencialidad de los correos. En expansión a otras ciudades, la invitación pasa primero por asociaciones locales.
- **Baja:** un `admin` desactiva al moderador; sus sesiones se cierran al momento y sus acciones siguen en la auditoría.
- **Plazo objetivo de respuesta a una propuesta:** 14 días. Quien propuso tiene 30 días para responder a «Info pedida»: damos más tiempo del que nos damos.

## Consecuencias

- El servidor guarda `role` y `moderationScope` y las comprueba en cada decisión (`403` fuera de ámbito o de rol).
- Todo lo que decide una persona queda en `AuditLog` con su identificador.
- Cierra las preguntas abiertas 1 y 2 de `07_VERIFICACION.md`.
- Revisable al sumar el primer moderador real; el número exacto de revisiones previas no es un compromiso.
