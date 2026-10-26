import { MAX_PHOTOS } from '../src/models/restaurant.js';
import { publicFilePattern, thumbOf } from '../src/services/photo-keys.js';

// Fotos que reparte cada local de ejemplo, como mucho.
const MAX_PER_PLACE = Math.min(5, MAX_PHOTOS);

// De los nombres que hay en `p/` (fotos y miniaturas), las fotos que se pueden
// poner en un local de ejemplo: con su miniatura y sin estar ya en la ficha de
// un local real ni en la historia de una persona del equipo (`taken`).
export function usablePhotos(
  files: readonly string[],
  taken: ReadonlySet<string> = new Set(),
): string[] {
  const all = new Set(files);
  return files
    .filter(
      (file) =>
        publicFilePattern.test(file) &&
        file !== thumbOf(file) &&
        all.has(thumbOf(file)) &&
        !taken.has(file),
    )
    .sort();
}

// Reparte las fotos entre los locales, en el orden dado: el primero recibe una,
// el segundo dos… hasta cinco, y vuelta a empezar; cada uno sigue por donde
// acabó el anterior. Con pocas fotos se repiten entre locales, nunca dentro de
// uno. Es determinista: la misma entrada da siempre el mismo reparto.
export function planPhotos(
  slugs: readonly string[],
  pool: readonly string[],
): Map<string, string[]> {
  const plan = new Map<string, string[]>();
  if (pool.length === 0) return plan;
  let next = 0;
  slugs.forEach((slug, index) => {
    const count = Math.min((index % MAX_PER_PLACE) + 1, pool.length);
    plan.set(
      slug,
      Array.from({ length: count }, (_, k) => pool[(next + k) % pool.length]!),
    );
    next = (next + count) % pool.length;
  });
  return plan;
}
