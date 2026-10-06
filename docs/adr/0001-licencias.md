# ADR 0001 · Licencias

- **Estado:** aceptada (pendiente de revisión legal antes del lanzamiento público)
- **Fecha:** 2026-10-06
- **Resuelve:** P2

## Contexto

HeartEats es un proyecto abierto y sin ánimo de lucro. Hay que licenciar por separado código, base de datos, documentación y contenido personal (historias y fotos del equipo), que está sujeto a RGPD.

## Decisión

| Qué | Licencia |
|---|---|
| Código | **AGPL-3.0** |
| Base de datos de negocios (nombre, dirección, cocina, verificación, cifras agregadas) | **ODbL 1.0** |
| Documentación (`docs/`) | **CC BY-SA 4.0** |
| Historias, nombres y fotos de personas | **Fuera de la licencia abierta.** Todos los derechos reservados; se muestran en HeartEats solo con consentimiento explícito y revocable |

## Motivos

- AGPL cubre el caso de aplicación web: quien ofrezca una versión modificada como servicio debe publicar sus cambios.
- ODbL está pensada para bases de datos y es la de OpenStreetMap, lo que evita conflictos al combinar datos.
- Datos personales de discapacidad (art. 9 RGPD) no pueden ser redistribuibles bajo licencia abierta si el consentimiento es revocable.

## Consecuencias

- Cada dependencia nueva debe tener licencia compatible con AGPL-3.0.
- Exportaciones de datos abiertos deben excluir `Team.stories`.
- Al aceptar contribuciones externas se exigirá DCO (`Signed-off-by`).
- La licencia no protege la marca "HeartEats" (ver P8) ni sustituye a la política de privacidad y los términos de uso.
- Revisión por un profesional o entidad del sector antes del lanzamiento.
