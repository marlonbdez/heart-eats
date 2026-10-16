import { closeExpiredRequests } from './close-expired.js';
import { purgeOldContactEmails, purgeRevokedStories } from './retention.js';

const HOUR = 60 * 60_000;

const tasks = [
  ['Solicitudes cerradas sin respuesta', closeExpiredRequests],
  ['Historias retiradas vaciadas', purgeRevokedStories],
  ['Correos borrados por antigüedad', purgeOldContactEmails],
] as const;

// Una pasada de mantenimiento. Cada tarea falla por su cuenta: si una da error
// no impide a las demás.
export async function runMaintenance(now = new Date()) {
  for (const [label, task] of tasks) {
    try {
      const n = await task(now);
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
export function startMaintenanceJob(intervalMs = HOUR) {
  void runMaintenance();
  const timer = setInterval(() => void runMaintenance(), intervalMs);
  timer.unref();
  return () => clearInterval(timer);
}
