# HeartEats

Mapa colaborativo y de código abierto para descubrir y apoyar restaurantes y negocios gastronómicos locales que apuestan por la **inclusión laboral de personas con discapacidad**. Lanzamiento en Madrid, pensado para ser internacional.

**Estado:** Fase 0 (definición y diseño). El frontend se construye con datos de ejemplo (mocks); aún no hay backend.

## Documentación

Empieza por [`docs/00_HANDOFF.md`](docs/00_HANDOFF.md) y el índice en [`docs/README.md`](docs/README.md).

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
```

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
