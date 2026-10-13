import type { TeamRecord } from '../models/team.js';
import type { PublicTeam } from '../types.js';

// Por debajo de este tamaño, dar detalles puede hacer reconocible a una
// persona. ❓ Umbral provisional (docs/01_ESPECIFICACION_DATOS.md §2.2). Es el
// mismo que usa la web (web/src/lib/team.ts).
export const SMALL_TEAM_THRESHOLD = 5;

// Lo que se puede publicar del equipo de un local. Las reglas viven aquí, en el
// servidor, y no en la web: lo que no se debe ver no sale de la API.
// - Sin confirmación del negocio, solo la cifra (nivel mínimo).
// - En equipos pequeños, solo la cifra.
// - Según el nivel: medio añade áreas y tipos; completo, las historias.
// - Una historia retirada o sin consentimiento registrado nunca se sirve.
export function publicTeam(
  team: TeamRecord | null | undefined,
  ownerConfirmedAt: Date | undefined,
): PublicTeam | undefined {
  if (!team) return undefined;

  const { totalStaff, staffWithDisability } = team.summary;
  const summary = { totalStaff, staffWithDisability };

  const onlyNumbers =
    !ownerConfirmedAt ||
    totalStaff < SMALL_TEAM_THRESHOLD ||
    team.visibilityLevel === 'minimal';
  if (onlyNumbers) return { level: 'minimal', summary };

  const result: PublicTeam = {
    level: team.visibilityLevel,
    summary,
    ...(team.areas?.length ? { areas: team.areas } : {}),
    ...(team.disabilityTypes?.length
      ? { disabilityTypes: team.disabilityTypes }
      : {}),
  };

  if (team.visibilityLevel === 'full') {
    const stories = (team.stories ?? [])
      .filter((s) => s.consentRecordedAt && !s.revokedAt)
      .map(({ displayName, role, storyText, photoUrl }) => ({
        displayName,
        role,
        storyText,
        ...(photoUrl ? { photoUrl } : {}),
      }));
    if (stories.length) result.stories = stories;
  }

  return result;
}
