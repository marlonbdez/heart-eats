import type { Restaurant, TeamLevel } from './types';

// Por debajo de este tamaño, dar detalles puede hacer reconocible a una
// persona. ❓ Umbral provisional (docs/04_DISENO_UI.md, F3).
export const SMALL_TEAM_THRESHOLD = 5;

// En equipos pequeños, solo la cifra: no se detallan áreas ni historias.
export function isSmallTeam(totalStaff: number): boolean {
  return totalStaff < SMALL_TEAM_THRESHOLD;
}

// Nivel con el que se muestra el equipo, o null si no se muestra.
// - Sin `team`, no hay bloque.
// - Sin confirmación del negocio, solo la cifra (nivel mínimo).
// - En equipos pequeños, solo la cifra.
export function effectiveTeamLevel(r: Restaurant): TeamLevel | null {
  if (!r.team) return null;
  if (!r.ownerConfirmedAt) return 'minimal';
  if (isSmallTeam(r.team.summary.totalStaff)) return 'minimal';
  return r.team.level;
}
