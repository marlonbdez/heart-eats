# HeartEats — reglas de trabajo

Mapa abierto y sin ánimo de lucro de negocios de hostelería de Madrid que emplean a personas con discapacidad. Estado y siguiente paso: `docs/05_ROADMAP.md` (manda sobre `docs/00_HANDOFF.md`, que es el contexto original). Índice de documentos: `docs/README.md`.

## Cómo se trabaja con Marlon

- Se avanza **funcionalidad a funcionalidad**, con PRs pequeñas que se puedan revisar desde el móvil.
- Marlon quiere tu criterio: da una recomendación, no un catálogo de opciones. Antes de empezar algo nuevo, propón y espera su confirmación.
- Responde en español. Código y variables en inglés; documentación en español.
- **Móvil primero, siempre**: toda pantalla se comprueba a 320–390 px antes de darla por buena.
- **Presupuesto**: Railway (5 $/mes de mínimo, servidor siempre despierto) más ~10 €/mes de margen para el resto, usado con austeridad (`docs/06_COSTES.md`). Estático y planes gratuitos mientras se pueda.
- **La web no lleva datos fijos**: los locales y las categorías se piden a la API desde el navegador (`web/src/lib/data/` y `NEXT_PUBLIC_API_URL`). Si no hay nada publicado, no se pinta nada y la pantalla lo dice con calma. Las pruebas e2e responden a la API con sus propios datos (`web/e2e/fixtures`). Propuestas, correcciones y retiradas ya se envían a la API; el equipo del negocio, las fotos y la moderación siguen simulados hasta sus PRs (`web/src/lib/features.ts` apaga lo que aún no tiene servidor).
- Estilo: código limpio, simple y estándar; que se lea como el que ya hay. Tono sereno en los textos. Mapa sobrio: pin clásico de un color, sin corazón (el logo solo es marca).
- Nunca nombres sitios o empresas de terceros en producto, docs o repo.
- **Accesibilidad**: WCAG 2.2 AA es criterio de aceptación.

## Textos e idiomas

- Todo texto va en `web/messages/es.json` **y** `en.json` a la vez, con las mismas claves.
- Reglas ICU de next-intl: evita apóstrofos en las cadenas de `t()`. `ContentPage` usa `t.raw()`.
- Las URLs son solo en inglés en todos los idiomas (`/es/propose`, `/en/propose`; ADR 0003).
- El inglés necesita revisión nativa antes de abrir al público.

## Git

- Rama por funcionalidad (`feature/…`, `fix/…`, `docs/…`) y PR contra `main`. Nunca se hace push a `main`.
- Si una rama entra en conflicto, se fusiona `main` en ella; no se hace force-push.
- No commitear el `package-lock.json` de la raíz (el bueno es `web/package-lock.json`).
- Commits convencionales, en español, p. ej. `feat(web): …`.
- Después de abrir una PR no se sondea el CI; se mira su estado cuando haga falta.

## Desarrollo y pruebas

Desde `web/`: `npm run dev`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run test:e2e` (ver `README.md`).

- Las pruebas e2e (Playwright, perfil Pixel 7) corren contra `out/`: **hay que hacer `npm run build` antes**. En local, con Chrome instalado: `PW_CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:e2e`.
- `web/e2e/a11y.spec.ts` ejecuta axe en todas las páginas (ES/EN, claro/oscuro, 360 px) y en los estados interactivos. Toda página o estado nuevo debe entrar ahí. axe no sustituye las pruebas con personas.
- Cada cambio de interfaz lleva su prueba e2e.
- **El CI corre en Linux con una fuente más ancha que la del Mac de Marlon.** A 320 px, un diseño que cabe en local puede solaparse allí. Si tocas el diseño móvil, comprueba también con una fuente ancha (p. ej. Verdana).
- Capturas: `npx serve out -l 4567 --no-clipboard` y un script con Playwright; al terminar, `pkill -f "serve out -l 4567"`.

## Privacidad y legal

- **Nunca escribas el correo personal de Marlon** en el repo. Solo existe `contact@hearteats.org`, que reenvía a él (`docs/09_CORREO.md`). Es solo de recepción.
- `localStorage` se usa en un solo sitio: el borrador de «Proponer un local» (`draft.ts`, 7 días, sin email ni web). La única cookie es `he_session` (moderación, httpOnly, la fija el servidor). Todo está reflejado en `/cookies`; si se guarda algo más en el navegador o se añade una cookie o analítica, se actualiza esa página en la misma PR.
- Los textos de consentimiento y los plazos de conservación son **provisionales** hasta la revisión legal (`docs/08_PRIVACIDAD_LEGAL.md`). Cualquier recogida de datos nueva debe anotarse allí.
- El negocio siempre da el último sí antes de publicar su ficha o la historia de su equipo.

## Decisiones ya tomadas (no reabrir sin motivo)

Licencias AGPL-3.0 / ODbL / CC BY-SA (ADR 0001) · MapLibre + OpenFreeMap (0002) · ES/EN con URLs en inglés (0003) · logo del corazón mordido (0004) · sin PWA por ahora · correo con reenvío gratuito.
