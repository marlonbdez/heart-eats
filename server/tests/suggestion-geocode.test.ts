import { describe, expect, it } from 'vitest';
import { withDistances } from '../src/services/suggestion-geocode.js';

describe('withDistances', () => {
  it('añade la distancia al aviso que ya nombra ese local', () => {
    expect(
      withDistances(
        [{ kind: 'noEvidence' }, { kind: 'duplicate', other: 'Casa Lola' }],
        [{ name: 'Casa Lola', meters: 12.6 }],
      ),
    ).toEqual([
      { kind: 'noEvidence' },
      { kind: 'duplicate', other: 'Casa Lola', meters: 13 },
    ]);
  });

  it('crea un aviso para un local cercano que no estaba', () => {
    expect(withDistances([], [{ name: 'Bar Pepe', meters: 30 }])).toEqual([
      { kind: 'duplicate', other: 'Bar Pepe', meters: 30 },
    ]);
  });

  it('sin locales cerca no cambia nada', () => {
    const warnings = [{ kind: 'chain' } as const];
    expect(withDistances(warnings, [])).toEqual(warnings);
  });
});
