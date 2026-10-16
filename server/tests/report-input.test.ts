import { Types } from 'mongoose';
import { describe, expect, it } from 'vitest';
import { Suggestion } from '../src/models/suggestion.js';
import { correctionSchema } from '../src/services/correction-input.js';
import { removalSchema } from '../src/services/removal-input.js';

const correction = {
  restaurantSlug: 'casa-lola',
  kind: 'address',
  details: 'Ahora está en la calle Mayor 7',
};
const removal = {
  restaurantSlug: 'casa-lola',
  what: 'story',
  contactEmail: 'Ana@Example.org',
};

describe('correctionSchema', () => {
  it('acepta lo mínimo y rellena el idioma', () => {
    expect(correctionSchema.parse(correction).locale).toBe('es');
  });

  it('el correo y el enlace son opcionales y se normalizan', () => {
    const result = correctionSchema.parse({
      ...correction,
      contactEmail: 'Ana@Example.org',
      evidenceUrl: 'https://example.org/a',
    });
    expect(result.contactEmail).toBe('ana@example.org');
  });

  it.each([
    ['slug con mayúsculas', { restaurantSlug: 'Casa Lola' }],
    ['slug vacío', { restaurantSlug: '' }],
    ['tipo desconocido', { kind: 'mood' }],
    ['sin explicación', { details: '   ' }],
    ['explicación muy larga', { details: 'a'.repeat(1001) }],
    ['enlace que no es web', { evidenceUrl: 'javascript:alert(1)' }],
    ['correo inválido', { contactEmail: 'no' }],
  ])('rechaza %s', (_caso, over) => {
    expect(correctionSchema.safeParse({ ...correction, ...over }).success).toBe(
      false,
    );
  });
});

describe('removalSchema', () => {
  it('acepta una retirada con correo y deja los detalles opcionales', () => {
    const result = removalSchema.parse(removal);
    expect(result.contactEmail).toBe('ana@example.org');
    expect(result.details).toBeUndefined();
  });

  it('exige el correo, para poder confirmar quién pide la retirada', () => {
    const { contactEmail, ...sinCorreo } = removal;
    void contactEmail;
    expect(removalSchema.safeParse(sinCorreo).success).toBe(false);
    expect(
      removalSchema.safeParse({ ...removal, contactEmail: '' }).success,
    ).toBe(false);
  });

  it.each([
    ['qué se retira desconocido', { what: 'everything' }],
    ['slug inválido', { restaurantSlug: '../etc' }],
    ['detalles muy largos', { details: 'a'.repeat(1001) }],
  ])('rechaza %s', (_caso, over) => {
    expect(removalSchema.safeParse({ ...removal, ...over }).success).toBe(
      false,
    );
  });
});

describe('Suggestion', () => {
  const base = { payload: {}, locale: 'es' };

  it('un local nuevo no necesita local de destino', async () => {
    await expect(
      new Suggestion({ ...base, type: 'new' }).validate(),
    ).resolves.toBeUndefined();
  });

  it.each(['edit', 'team', 'removal'])(
    'una solicitud de tipo %s exige el local de destino',
    async (type) => {
      await expect(
        new Suggestion({ ...base, type }).validate(),
      ).rejects.toThrow(/targetRestaurantId/);
      await expect(
        new Suggestion({
          ...base,
          type,
          targetRestaurantId: new Types.ObjectId(),
        }).validate(),
      ).resolves.toBeUndefined();
    },
  );
});
