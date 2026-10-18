import { closeExpiredRequests } from './close-expired.js';
import type { PhotoStore } from './photo-store.js';
import { purgeOldContactEmails, purgeRevokedStories } from './retention.js';
import { purgeUnusedUploads } from './uploads.js';

const HOUR = 60 * 60_000;

type Task = (now: Date, store?: PhotoStore) => Promise<number>;

const tasks: readonly (readonly [string, Task])[] = [
  // Sin almacén no hay fotos en cuarentena que borrar al cerrarlas.
  ['Solicitudes cerradas sin respuesta', closeExpiredRequests],
  ['Historias retiradas vaciadas', purgeRevokedStories],
  ['Correos borrados por antigüedad', purgeOldContactEmails],
  // Sin almacén no hay fotos que borrar.
  [
    'Fotos sin usar borradas',
    (now, store) =>
      store ? purgeUnusedUploads(store, now) : Promise.resolve(0),
  ],
];

// Una pasada de mantenimiento. Cada tarea falla por su cuenta: si una da error
// no impide a las demás.
export async function runMaintenance(now = new Date(), store?: PhotoStore) {
  for (const [label, task] of tasks) {
    try {
      const n = await task(now, store);
      if (n > 0) console.log(`${label}: ${n}`);
    } catch (err) {
      console.error(
        `Fallo en el mantenimiento (${label}):`,
        err instanceof Error ? err.message : err,
      );
    }
  }
}

// Repasa los plazos al arrancar y cada hora. El temporizador no mantiene vivo
// el proceso. Devuelve la función que lo detiene.
export function startMaintenanceJob(store?: PhotoStore, intervalMs = HOUR) {
  void runMaintenance(new Date(), store);
  const timer = setInterval(
    () => void runMaintenance(new Date(), store),
    intervalMs,
  );
  timer.unref();
  return () => clearInterval(timer);
}
