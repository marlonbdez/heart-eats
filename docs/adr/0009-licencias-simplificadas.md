# ADR 0009 · Licencias, en pocas palabras

- **Estado:** aceptada (pendiente de revisión legal antes del lanzamiento público)
- **Fecha:** 2026-10-22
- **Sustituye a:** [ADR 0001](0001-licencias.md), en lo que toca a los datos

## Contexto

La ADR 0001 decía que la base de datos de negocios se publicaría bajo ODbL, pero no existe ninguna descarga pública ni queremos ofrecerla: los datos se ven en la web y no se exponen de otra forma. Decir otra cosa en la web y en los documentos era prometer algo que no hacemos. Esta ADR lo deja simple y fiel a lo que hacemos.

## Decisión

| Qué | Regla |
|---|---|
| **Código** | **AGPL-3.0.** Cualquiera puede verlo, usarlo y proponer mejoras. Quien ofrezca una versión modificada como servicio debe compartir sus cambios. Todo cambio entra por una PR que aprueba el responsable del proyecto |
| **Documentación** (`docs/`) | **CC BY-SA 4.0** |
| **Datos de HeartEats** (locales, fichas, categorías, verificación, cifras) y **fotos de locales y platos** | **Todos los derechos reservados.** Se muestran en la web; no se ofrecen para descarga ni reutilización, y no se permite extraerlos en masa |
| **Personas** (historias, nombres y fotos) | **Todos los derechos reservados.** Solo se muestran en HeartEats, con permiso explícito y revocable. Nunca se ofrecen para descarga ni reutilización |
| **OpenStreetMap** (mapa y geocodificación) | Mantiene su propia licencia (ODbL) y su atribución, siempre visible en el mapa |

## Motivos

- **Simplicidad y verdad:** decimos lo que hacemos. No hay exportación de datos abiertos, así que no la prometemos.
- **Código abierto sin perder el control:** AGPL permite colaborar y evita que alguien haga una copia cerrada y comercial; copiar y reutilizar el código, dentro de esa licencia, no se puede ni se quiere impedir. Que el responsable apruebe cada PR no depende de la licencia, sino de GitHub (`CODEOWNERS` y protección de `main`).
- **Datos:** la base de datos de HeartEats está protegida por el derecho del fabricante de bases de datos de la UE y por los derechos de autor de lo que se envía con permiso. La API que usa la web es pública (la web la consulta desde el navegador), así que no se puede impedir técnicamente que alguien la lea: se pone por escrito en el aviso legal y se limitan los envíos y las lecturas abusivas.
- **OpenStreetMap:** la obligación de compartir de la ODbL solo se activa si publicamos una base de datos derivada. Como no la publicamos, basta con la atribución. ❓ Se confirma en la revisión legal.
- **Personas:** los datos de discapacidad (art. 9 RGPD) no pueden ser redistribuibles si el consentimiento es revocable.

## Consecuencias

- Cada dependencia nueva debe tener licencia compatible con AGPL-3.0.
- Las contribuciones externas llevan DCO (`Signed-off-by`): quien contribuye confirma que su aportación puede publicarse bajo AGPL-3.0.
- Si algún día se abren datos (por ejemplo, una descarga de los locales), será una decisión nueva con su propia ADR, y nunca incluirá a las personas.
- La licencia no protege la marca «HeartEats» (ver P8) ni sustituye a la política de privacidad y los términos de uso.
- Revisión por un profesional o entidad del sector antes del lanzamiento.
