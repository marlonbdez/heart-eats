# Cómo ayudar a HeartEats

HeartEats es de código abierto y sin ánimo de lucro, y se construye mejor entre muchas personas. No hace falta saber programar. Si tu forma de ayudar no está aquí, escríbenos a `contact@hearteats.org`.

## Formas de ayudar

1. **Programar.** Mira el código, abre una incidencia o propón un cambio (más abajo).
2. **Diseñar y cuidar la accesibilidad.** Cuéntanos qué se hace difícil con un lector de pantalla, con el teclado, con letra grande o en un móvil pequeño, y cómo lo mejorarías. Aspiramos a cumplir WCAG 2.2 AA, pero ninguna prueba automática sustituye a una persona.
3. **Moderar y verificar locales.** Cada local lo revisa una persona antes de publicarse. Si te gusta comprobar las cosas con cuidado, escríbenos. Quien modera entra por invitación y decide solo en su zona.
4. **Traducir y revisar textos.** Estamos en español e inglés y queremos que suenen naturales; el inglés aún necesita revisión nativa. No abrimos más idiomas hasta que alguien nativo los pueda revisar.
5. **Proponer locales y corregir datos.** Desde la propia web, sin cuenta: [proponer un local](https://hearteats.org/es/propose) o [corregir un dato](https://hearteats.org/es/correct).

## Proponer un cambio de código

- Haz tu propia copia (*fork*) del repositorio y abre una PR contra `staging` (la rama de pruebas; `main` es la de producción y solo la actualiza el responsable). Nadie de fuera puede fusionar nada: **cada PR la revisa y la aprueba el responsable del proyecto** antes de entrar, con calma y con ganas de que salga bien.
- Antes de empezar algo grande, abre una incidencia y lo hablamos: así no trabajas en vano.
- Lee [`CLAUDE.md`](CLAUDE.md), que recoge las reglas de trabajo (móvil primero, accesibilidad, textos en ES y EN, una prueba e2e por cambio de interfaz).
- Ramas: `feature/…`, `fix/…`, `docs/…`.
- Commits convencionales recomendados, firmados con `git commit -s` (DCO): así confirmas que tu aportación puede publicarse bajo AGPL-3.0.
- Cada PR enlaza su incidencia y actualiza la documentación si cambia algo relevante.
- Documentación en español; código y variables en inglés.
- Cuida el trato: seguimos el [código de conducta](CODE_OF_CONDUCT.md), con un lenguaje respetuoso y no paternalista hacia las personas con discapacidad.

## Licencias

- **Código:** AGPL-3.0. Puedes usarlo y mejorarlo; quien ofrezca una versión modificada como servicio debe compartir sus cambios.
- **Documentación:** CC BY-SA 4.0.
- **Datos, fotos e historias de personas:** todos los derechos reservados. Se ven en la web y no se ofrecen para descarga ni reutilización. Por favor, no extraigas los datos en masa.

Detalle en [`docs/adr/0009-licencias-simplificadas.md`](docs/adr/0009-licencias-simplificadas.md).
