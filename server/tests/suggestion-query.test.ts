import { describe, expect, it } from 'vitest';
import type { SuggestionRecord } from '../src/models/suggestion.js';
import { maskEmail } from '../src/services/mask-email.js';
import {
  toModerationItem,
  type TargetRestaurant,
} from '../src/services/moderation-item.js';
import {
  decodeQueueCursor,
  encodeQueueCursor,
  parseQueueQuery,
  restaurantScopeFilter,
  scopeFilter,
  statusesOf,
} from '../src/services/suggestion-query.js';

const ID = '66f0a1b2c3d4e5f607182930';

describe('maskEmail', () => {
  it('deja la inicial y el dominio', () => {
    expect(maskEmail('ana@example.org')).toBe('a***@example.org');
  });
  it('no inventa nada si no hay correo válido', () => {
    expect(maskEmail(undefined)).toBeUndefined();
    expect(maskEmail('')).toBeUndefined();
    expect(maskEmail('sin-arroba')).toBeUndefined();
  });
});

describe('parseQueueQuery', () => {
  it('por defecto: pendientes, 20', () => {
    expect(parseQueueQuery({})).toEqual({ status: 'pending', limit: 20 });
  });
  it('lee estado, tipo y límite', () => {
    expect(
      parseQueueQuery({ status: 'resolved', type: 'edit', limit: '5' }),
    ).toEqual({ status: 'resolved', type: 'edit', limit: 5 });
  });
  it('rechaza valores fuera de rango o desconocidos', () => {
    for (const q of [
      { status: 'approved' },
      { type: 'otro' },
      { limit: '0' },
      { limit: '51' },
      { limit: 'x' },
    ]) {
      expect(() => parseQueueQuery(q), JSON.stringify(q)).toThrow();
    }
  });
  it('el cursor va y vuelve, y uno roto da 422', () => {
    const at = new Date('2026-10-01T10:00:00Z');
    const cursor = encodeQueueCursor({ at, id: ID });
    expect(decodeQueueCursor(cursor)).toEqual({ at, id: ID });
    expect(parseQueueQuery({ cursor }).cursor).toEqual({ at, id: ID });
    for (const bad of ['zzz', encodeQueueCursor({ at, id: 'no-es-id' })]) {
      expect(() => parseQueueQuery({ cursor: bad })).toThrow(/cursor/);
    }
  });
  it('«resolved» cubre aprobadas y rechazadas', () => {
    expect(statusesOf('resolved')).toEqual(['approved', 'rejected']);
    expect(statusesOf('info_requested')).toEqual(['info_requested']);
  });
});

describe('ámbito', () => {
  const madrid = { country: 'ES', city: 'Madrid' };
  it('una ciudad: propuestas de esa ciudad y solicitudes de sus locales', () => {
    expect(scopeFilter([madrid], ['x'])).toEqual({
      $or: [
        { type: 'new', cityKey: { $in: ['madrid'] } },
        { type: { $ne: 'new' }, targetRestaurantId: { $in: ['x'] } },
      ],
    });
    expect(restaurantScopeFilter([madrid])).toEqual({
      $or: [{ 'address.country': 'ES', cityKey: 'madrid' }],
    });
  });
  it('un país sin ciudad: todas las propuestas', () => {
    expect(scopeFilter([{ country: 'ES' }], [])).toMatchObject({
      $or: [{ type: 'new' }, expect.anything()],
    });
    expect(restaurantScopeFilter([{ country: 'ES' }])).toEqual({
      $or: [{ 'address.country': 'ES' }],
    });
  });
  it('todas las regiones: sin límite de país ni de ciudad', () => {
    expect(restaurantScopeFilter([{ country: '*' }])).toEqual({ $or: [{}] });
    expect(scopeFilter([{ country: '*' }], [])).toMatchObject({
      $or: [{ type: 'new' }, expect.anything()],
    });
  });
  it('sin ámbito no ve nada', () => {
    expect(scopeFilter([], [])).toEqual({ _id: { $in: [] } });
  });
});

describe('toModerationItem', () => {
  const base = {
    _id: ID,
    status: 'pending',
    evidence: ['https://example.org/a'],
    contactEmail: 'ana@example.org',
    locale: 'en',
    warnings: [{ kind: 'chain' }],
    createdAt: new Date('2026-10-01T10:00:00Z'),
  };
  const target = {
    _id: 't',
    slug: 'demo-uno',
    name: '[DEMO] Uno',
    address: { street: 'Calle 1', city: 'Madrid', neighborhood: 'Lavapiés' },
  } as unknown as TargetRestaurant;

  it('un local nuevo', () => {
    const item = toModerationItem({
      ...base,
      type: 'new',
      payload: {
        name: 'Casa Lola',
        street: 'Calle Mayor 5',
        city: 'Madrid',
        postalCode: '28013',
        foodTags: ['tapas'],
        dishes: [{ name: 'Tortilla', description: 'De patata' }],
        howKnown: 'Trabaja una amiga',
      },
    } as unknown as SuggestionRecord);
    expect(item).toEqual({
      id: ID,
      type: 'new',
      status: 'pending',
      createdAt: '2026-10-01T10:00:00.000Z',
      locale: 'en',
      name: 'Casa Lola',
      neighborhood: 'Madrid',
      address: 'Calle Mayor 5, 28013, Madrid',
      contactMasked: 'a***@example.org',
      warnings: [{ kind: 'chain' }],
      evidenceUrl: 'https://example.org/a',
      foodTags: ['tapas'],
      dishes: ['Tortilla'],
      howKnown: 'Trabaja una amiga',
    });
    expect(JSON.stringify(item)).not.toContain('ana@example.org');
  });

  it('una corrección de dirección enseña el dato anterior', () => {
    const item = toModerationItem(
      {
        ...base,
        type: 'edit',
        payload: { kind: 'address', details: 'Calle Mayor 7' },
      } as unknown as SuggestionRecord,
      target,
    );
    expect(item).toMatchObject({
      name: '[DEMO] Uno',
      neighborhood: 'Lavapiés',
      address: 'Calle 1, Madrid',
      restaurantSlug: 'demo-uno',
      correction: {
        kind: 'address',
        before: 'Calle 1',
        after: 'Calle Mayor 7',
      },
    });
  });

  it('otra corrección no inventa un «antes»', () => {
    const item = toModerationItem(
      {
        ...base,
        type: 'edit',
        payload: { kind: 'hours', details: 'Cierra los lunes' },
      } as unknown as SuggestionRecord,
      target,
    );
    expect(item.correction?.before).toBeUndefined();
  });

  it('una retirada', () => {
    const item = toModerationItem(
      {
        ...base,
        type: 'removal',
        payload: { what: 'story', details: 'Quiero retirarla' },
      } as unknown as SuggestionRecord,
      target,
    );
    expect(item.removal).toEqual({
      what: 'story',
      details: 'Quiero retirarla',
    });
  });

  it('si el local ya no existe, la solicitud se ve igualmente', () => {
    const item = toModerationItem({
      ...base,
      type: 'removal',
      payload: { what: 'listing' },
    } as unknown as SuggestionRecord);
    expect(item).toMatchObject({ name: '', restaurantSlug: undefined });
  });
});
