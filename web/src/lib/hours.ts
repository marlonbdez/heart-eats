import type { OpeningHours } from './types';

export interface HoursGroup {
  days: number[]; // días consecutivos (lunes primero), con el mismo horario
  range: { open: string; close: string } | null; // null = cerrado
}

const MONDAY_FIRST = [1, 2, 3, 4, 5, 6, 0];

// Agrupa días consecutivos con el mismo horario: "Lunes a viernes 8:00–20:00".
export function groupHours(hours: OpeningHours[]): HoursGroup[] {
  const groups: HoursGroup[] = [];
  for (const day of MONDAY_FIRST) {
    const h = hours.find((x) => x.day === day);
    const range = h ? { open: h.open, close: h.close } : null;
    const last = groups[groups.length - 1];
    if (
      last &&
      last.range?.open === range?.open &&
      last.range?.close === range?.close
    ) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], range });
    }
  }
  return groups;
}
