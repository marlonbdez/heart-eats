# HeartEats

Mapa colaborativo y de código abierto para descubrir y apoyar restaurantes y negocios gastronómicos locales que apuestan por la **inclusión laboral de personas con discapacidad**. Lanzamiento en Madrid, pensado para ser internacional.

**Estado:** frontend completo y backend (`server/`) casi completo; la web ya lee los locales de la API y los envíos y la moderación se conectan por partes (ver [`docs/05_ROADMAP.md`](docs/05_ROADMAP.md)). Publicado en [hearteats.org](https://hearteats.org).

## Documentación

Empieza por el índice en [`docs/README.md`](docs/README.md) y la hoja de ruta [`docs/05_ROADMAP.md`](docs/05_ROADMAP.md). El contexto original está en [`docs/00_HANDOFF.md`](docs/00_HANDOFF.md). Las reglas de trabajo están en [`CLAUDE.md`](CLAUDE.md).

## Desarrollo local

Requiere Node.js 20.9 o superior (se usa la 24, LTS).

```bash
cd web
npm install
npm run dev        # http://localhost:3000, con recarga al guardar
```

La web pide los locales a la API (`http://localhost:3001` por defecto; cámbialo con `NEXT_PUBLIC_API_URL` al compilar). Sin el servidor en marcha verás el aviso de que no se han podido cargar los datos; con la base de datos vacía, que todavía no hay locales. Las pruebas e2e no necesitan servidor: responden con sus propios datos.

Servidor (desde `server/`, requiere Node.js 22 o superior; ver [`server/README.md`](server/README.md)):

```bash
cd server
npm install
cp .env.example .env
npm run dev        # http://localhost:3001/api/v1/health
npm test
```

### Con Docker (todo con un comando)

Alternativa a instalar Node y MongoDB: levanta MongoDB, la API y la web con recarga al guardar. Requiere Docker con Compose.

```bash
docker compose up --build            # web :3000, API :3001, MongoDB :27017 (solo desde tu equipo)
docker compose run --rm seed         # carga los locales [DEMO] (la primera vez)
docker compose down                  # para todo; los datos de MongoDB se conservan
docker compose down -v               # para todo y borra también los datos
```

- Los archivos se montan desde tu carpeta: editas con tu editor de siempre y los cambios se recargan solos.
- Si cambias `package.json` de `web/` o `server/`, reconstruye con `docker compose up --build --renew-anon-volumes` para reinstalar las dependencias.
- Las variables de `docker-compose.yml` tienen prioridad sobre el `.env` del servidor, así que no hace falta crearlo.
- Es solo para desarrollo. La web se publica en Netlify y la API se construye con `server/Dockerfile` (último destino, `production`).

Otros comandos de la web (desde `web/`):

```bash
npm run typecheck  # comprueba tipos
npm run lint       # ESLint
npm run build      # genera la web estática en web/out
npx serve out      # sirve lo generado, tal como se verá en producción
npx playwright install chromium   # solo la primera vez
npm run test:e2e   # prueba de humo en un navegador (requiere `npm run build` antes)
```

## Integración continua

Cada pull request y cada push a `main` ejecutan en GitHub Actions (`.github/workflows/ci.yml`): lint, tipos, build y una prueba de humo en un navegador con pruebas de extremo a extremo (flujos, diseño móvil) y de accesibilidad automática (axe, WCAG 2.2 AA) para la web; y lint, tipos, pruebas y build para el servidor.

## Despliegue

El frontend se publica en Netlify (`netlify.toml`): cada merge a `main` actualiza producción y cada pull request genera una vista previa propia. `NEXT_PUBLIC_API_URL` se fija en `netlify.toml`. El servidor todavía no se despliega (ver [`docs/adr/0005-hosting-del-backend.md`](docs/adr/0005-hosting-del-backend.md), propuesta en la PR de documentación del backend).

## Estructura

- `docs/` — especificaciones, decisiones (ADR) y diseño
- `web/` — frontend (Next.js, export estático)
- `server/` — API (Node + Express + MongoDB)
- `shared/` — tipos y constantes compartidos
- `docker-compose.yml` — entorno de desarrollo local (MongoDB, API y web)

## Licencia

- Código: [AGPL-3.0](LICENSE)
- Documentación: CC BY-SA 4.0
- Datos de HeartEats, fotos e historias de personas: todos los derechos reservados; se ven en la web y no se ofrecen para descarga ni reutilización
- El mapa usa datos de OpenStreetMap, con su propia licencia y atribución

Detalle y motivos en [`docs/adr/0009-licencias-simplificadas.md`](docs/adr/0009-licencias-simplificadas.md). ¿Quieres ayudar? Mira [`CONTRIBUTING.md`](CONTRIBUTING.md): hay una forma para casi todo el mundo, y cada cambio de código lo revisa y lo aprueba el responsable del proyecto.
