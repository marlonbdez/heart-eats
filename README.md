# HeartEats

Mapa colaborativo y de código abierto para descubrir y apoyar restaurantes y negocios gastronómicos locales que apuestan por la **inclusión laboral de personas con discapacidad**. Lanzamiento en Madrid, pensado para ser internacional.

**Estado:** frontend completo con datos de ejemplo y un backend simulado; el backend real está pendiente de decisiones (ver [`docs/05_ROADMAP.md`](docs/05_ROADMAP.md)). Publicado en [hearteats.org](https://hearteats.org).

## Documentación

Empieza por el índice en [`docs/README.md`](docs/README.md) y la hoja de ruta [`docs/05_ROADMAP.md`](docs/05_ROADMAP.md). El contexto original está en [`docs/00_HANDOFF.md`](docs/00_HANDOFF.md). Las reglas de trabajo están en [`CLAUDE.md`](CLAUDE.md).

## Desarrollo local

Requiere Node.js 20.9 o superior (se usa la 24, LTS).

```bash
cd web
npm install
npm run dev        # http://localhost:3000, con recarga al guardar
```

Otros comandos (desde `web/`):

```bash
npm run typecheck  # comprueba tipos
npm run lint       # ESLint
npm run build      # genera la web estática en web/out
npx serve out      # sirve lo generado, tal como se verá en producción
npx playwright install chromium   # solo la primera vez
npm run test:e2e   # prueba de humo en un navegador (requiere `npm run build` antes)
```

## Integración continua

Cada pull request y cada push a `main` ejecutan en GitHub Actions (`.github/workflows/ci.yml`): lint, tipos, build y una prueba de humo en un navegador con pruebas de extremo a extremo (flujos, diseño móvil) y de accesibilidad automática (axe, WCAG 2.2 AA).

## Despliegue

El frontend se publica en Netlify (`netlify.toml`): cada merge a `main` actualiza producción y cada pull request genera una vista previa propia.

## Estructura

- `docs/` — especificaciones, decisiones (ADR) y diseño
- `web/` — frontend (Next.js, export estático)
- `server/` — API (Node + Express + MongoDB)
- `shared/` — tipos y constantes compartidos

## Licencia

- Código: [AGPL-3.0](LICENSE)
- Base de datos de negocios: ODbL 1.0
- Documentación: CC BY-SA 4.0
- Historias, nombres y fotos de personas: no incluidos en la licencia abierta

Detalle y motivos en [`docs/adr/0001-licencias.md`](docs/adr/0001-licencias.md).
