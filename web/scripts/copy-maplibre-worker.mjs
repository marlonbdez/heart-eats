// MapLibre carga su worker como módulo y este importa "maplibre-gl-shared.mjs"
// por nombre. Next le añade un hash al publicar los archivos y el import se
// rompe ("Worker failed to load"). Servimos ambos archivos con su nombre
// original desde public/maplibre y se lo indicamos con setWorkerUrl().
import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', 'maplibre-gl', 'dist');
const to = join(root, 'public', 'maplibre');

mkdirSync(to, { recursive: true });
for (const file of ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']) {
  copyFileSync(join(from, file), join(to, file));
}
