import { describe, expect, it } from 'vitest';
import { proposalSchema } from '../src/services/proposal-input.js';
import { matchesChain } from '../src/services/suggestion-warnings.js';

const valid = {
  name: 'Casa Lola',
  city: 'Madrid',
  foodTags: ['pizza'],
  dishes: [],
  independent: true,
};

describe('proposalSchema', () => {
  it('acepta lo mínimo y rellena el idioma', () => {
    const result = proposalSchema.parse(valid);
    expect(result.locale).toBe('es');
  });

  it('recorta espacios, pasa el correo a minúsculas y quita etiquetas repetidas', () => {
    const result = proposalSchema.parse({
      ...valid,
      name: '  Casa Lola ',
      contactEmail: 'Ana@Example.org',
      foodTags: ['pizza', 'pizza', 'other'],
    });
    expect(result.name).toBe('Casa Lola');
    expect(result.contactEmail).toBe('ana@example.org');
    expect(result.foodTags).toEqual(['pizza', 'other']);
  });

  it('acepta una propuesta sin comida, como el formulario de la web', () => {
    expect(proposalSchema.safeParse({ ...valid, foodTags: [] }).success).toBe(
      true,
    );
  });

  it.each([
    ['nombre muy corto', { name: 'A' }],
    ['sin ciudad', { city: '  ' }],
    ['comida desconocida', { foodTags: ['nope'] }],
    [
      'más de 3 platos',
      { dishes: [1, 2, 3, 4].map((n) => ({ name: `P${n}` })) },
    ],
    ['plato sin nombre', { dishes: [{ name: '' }] }],
    ['enlace que no es web', { evidenceUrl: 'javascript:alert(1)' }],
    ['enlace con espacios', { evidenceUrl: 'https://example.org/a b' }],
    ['correo inválido', { contactEmail: 'no-es-un-correo' }],
    ['idioma desconocido', { locale: 'fr' }],
    ['independent como texto', { independent: 'sí' }],
  ])('rechaza %s', (_caso, over) => {
    expect(proposalSchema.safeParse({ ...valid, ...over }).success).toBe(false);
  });

  it('descarta campos que no conoce, como datos de personas del equipo', () => {
    const result = proposalSchema.parse({
      ...valid,
      team: [{ displayName: 'Ana', storyText: 'una historia' }],
      stories: ['x'],
    });
    expect(result).not.toHaveProperty('team');
    expect(result).not.toHaveProperty('stories');
  });
});

describe('matchesChain', () => {
  const chains = ['burger palace', 'cafe central'];

  it('detecta el nombre sin acentos ni mayúsculas, como palabra completa', () => {
    expect(matchesChain('Café  Central Madrid', chains)).toBe(true);
    expect(matchesChain('BURGER PALACE', chains)).toBe(true);
  });

  it('no se activa con parte de una palabra ni sin lista', () => {
    expect(matchesChain('Cafeteria Centralita', chains)).toBe(false);
    expect(matchesChain('Burger Palace', [])).toBe(false);
  });
});
