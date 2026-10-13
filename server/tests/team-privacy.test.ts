import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import type { TeamRecord } from '../src/models/team.js';
import { publicTeam } from '../src/services/team-privacy.js';

const confirmed = new Date('2026-09-01T00:00:00Z');

const story = (
  over: Partial<NonNullable<TeamRecord['stories']>[number]> = {},
) => ({
  displayName: 'Persona de ejemplo',
  role: 'Cocina',
  storyText: 'Texto de ejemplo.',
  consentRecordedAt: new Date('2026-09-01T00:00:00Z'),
  consentBy: 'self' as const,
  ...over,
});

const team = (over: Partial<TeamRecord> = {}): TeamRecord => ({
  _id: new Types.ObjectId(),
  restaurantId: new Types.ObjectId(),
  visibilityLevel: 'full',
  summary: { totalStaff: 9, staffWithDisability: 3 },
  areas: ['kitchen'],
  disabilityTypes: ['hearing_impairment'],
  stories: [story()],
  ...over,
});

describe('publicTeam', () => {
  it('sin equipo, no hay bloque', () => {
    expect(publicTeam(null, confirmed)).toBeUndefined();
    expect(publicTeam(undefined, confirmed)).toBeUndefined();
  });

  it('sin confirmación del negocio, solo las cifras', () => {
    expect(publicTeam(team(), undefined)).toEqual({
      level: 'minimal',
      summary: { totalStaff: 9, staffWithDisability: 3 },
    });
  });

  it('en un equipo pequeño, solo las cifras aunque el nivel sea completo', () => {
    const result = publicTeam(
      team({ summary: { totalStaff: 4, staffWithDisability: 1 } }),
      confirmed,
    );
    expect(result).toEqual({
      level: 'minimal',
      summary: { totalStaff: 4, staffWithDisability: 1 },
    });
  });

  it('el umbral es de 5 personas: con 5 ya se detalla', () => {
    const result = publicTeam(
      team({
        visibilityLevel: 'medium',
        summary: { totalStaff: 5, staffWithDisability: 2 },
      }),
      confirmed,
    );
    expect(result?.level).toBe('medium');
  });

  it('nivel mínimo: nunca áreas, tipos ni historias', () => {
    const result = publicTeam(team({ visibilityLevel: 'minimal' }), confirmed);
    expect(result).toEqual({
      level: 'minimal',
      summary: { totalStaff: 9, staffWithDisability: 3 },
    });
  });

  it('nivel medio: áreas y tipos, pero no historias', () => {
    const result = publicTeam(team({ visibilityLevel: 'medium' }), confirmed);
    expect(result).toEqual({
      level: 'medium',
      summary: { totalStaff: 9, staffWithDisability: 3 },
      areas: ['kitchen'],
      disabilityTypes: ['hearing_impairment'],
    });
    expect(result).not.toHaveProperty('stories');
  });

  it('nivel completo: añade las historias, sin datos de consentimiento', () => {
    const result = publicTeam(team(), confirmed);
    expect(result?.level).toBe('full');
    expect(result?.stories).toEqual([
      {
        displayName: 'Persona de ejemplo',
        role: 'Cocina',
        storyText: 'Texto de ejemplo.',
      },
    ]);
  });

  it('una historia retirada nunca se sirve', () => {
    const result = publicTeam(
      team({
        stories: [
          story({ displayName: 'Retirada', revokedAt: new Date('2026-10-01') }),
          story({ displayName: 'Vigente' }),
        ],
      }),
      confirmed,
    );
    expect(result?.stories?.map((s) => s.displayName)).toEqual(['Vigente']);
    expect(JSON.stringify(result)).not.toContain('Retirada');
  });

  it('si todas las historias están retiradas, no queda el campo', () => {
    const result = publicTeam(
      team({ stories: [story({ revokedAt: new Date('2026-10-01') })] }),
      confirmed,
    );
    expect(result).not.toHaveProperty('stories');
  });

  it('incluye la foto solo si la historia la tiene', () => {
    const result = publicTeam(
      team({ stories: [story({ photoUrl: 'https://example.org/p.webp' })] }),
      confirmed,
    );
    expect(result?.stories?.[0]?.photoUrl).toBe('https://example.org/p.webp');
  });
});
