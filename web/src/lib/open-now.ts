import type { OpeningHours } from './types';

export type OpenStatus =
  | { state: 'open'; closes: string; soon: boolean }
  | {
      state: 'closed';
      // Cuándo vuelve a abrir: hoy, mañana o un día de la semana (0 = domingo).
      opens?: { when: 'today' | 'tomorrow' | 'day'; day: number; time: string };
    };

const SOON_MINUTES = 60;
const DAY_MINUTES = 24 * 60;
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const minutes = (hhmm: string) => {
  const [h = 0, m = 0] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

// Día de la semana (0 = domingo) y minutos desde las 00:00 en esa zona horaria.
function localTime(now: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return {
    day: WEEKDAYS.indexOf(get('weekday')),
    at: Number(get('hour')) * 60 + Number(get('minute')),
  };
}

// Si el local está abierto ahora, leyendo el horario en la zona del local (y no
// en la de quien mira). Un cierre igual o anterior a la apertura es del día
// siguiente (de 20:00 a 02:00, o hasta las 00:00). Sin zona horaria no se
// adivina: devuelve null.
export function openStatus(
  hours: OpeningHours[],
  timeZone: string | undefined,
  now: Date,
): OpenStatus | null {
  if (!timeZone || hours.length === 0) return null;
  let here;
  try {
    here = localTime(now, timeZone);
  } catch {
    return null; // zona que este navegador no conoce
  }
  if (here.day < 0 || Number.isNaN(here.at)) return null;

  const on = (day: number) => hours.find((h) => h.day === day);
  const range = (h: OpeningHours) => {
    const open = minutes(h.open);
    const close = minutes(h.close);
    return { open, close: close <= open ? close + DAY_MINUTES : close };
  };

  // Abierto por el turno de hoy, o por el de ayer si pasó de medianoche.
  const today = on(here.day);
  if (today) {
    const { open, close } = range(today);
    if (here.at >= open && here.at < close) {
      return {
        state: 'open',
        closes: today.close,
        soon: close - here.at <= SOON_MINUTES,
      };
    }
  }
  const yesterday = on((here.day + 6) % 7);
  if (yesterday) {
    const { close } = range(yesterday);
    if (close > DAY_MINUTES && here.at < close - DAY_MINUTES) {
      return {
        state: 'open',
        closes: yesterday.close,
        soon: close - DAY_MINUTES - here.at <= SOON_MINUTES,
      };
    }
  }

  // Cerrado: la próxima apertura en los siete días que vienen.
  for (let ahead = 0; ahead < 7; ahead++) {
    const day = (here.day + ahead) % 7;
    const h = on(day);
    if (!h || (ahead === 0 && minutes(h.open) <= here.at)) continue;
    return {
      state: 'closed',
      opens: {
        when: ahead === 0 ? 'today' : ahead === 1 ? 'tomorrow' : 'day',
        day,
        time: h.open,
      },
    };
  }
  return { state: 'closed' };
}
