import { describe, expect, it } from 'vitest';
import { ApiError } from '../src/errors.js';
import {
  GEOJSON_MAX_POINTS,
  LIST_DEFAULT_LIMIT,
  buildFilter,
  decodeCursor,
  encodeCursor,
  parseListQuery,
} from '../src/services/restaurant-query.js';

const fails = (raw: unknown) => {
  try {
    parseListQuery(raw);
  } catch (err) {
    return err as ApiError;
  }
  throw new Error('debía fallar');
};

describe('cursor', () => {
  it('ida y vuelta', () => {
    expect(decodeCursor(encodeCursor(150))).toBe(150);
  });

  it('rechaza lo que no es un cursor', () => {
    expect(decodeCursor('basura')).toBeNull();
    expect(
      decodeCursor(Buffer.from('{"o":-1}').toString('base64url')),
    ).toBeNull();
    expect(
      decodeCursor(Buffer.from('{"o":"x"}').toString('base64url')),
    ).toBeNull();
  });
});

describe('parseListQuery', () => {
  it('exige alguna zona: nunca se piden todos los locales', () => {
    const err = fails({});
    expect(err.status).toBe(400);
    expect(err.code).toBe('zone_required');
    expect(fails({ food: 'pizza', q: 'masa' }).code).toBe('zone_required');
  });

  it('con una ciudad basta, y aplica los valores por defecto', () => {
    expect(parseListQuery({ city: 'Madrid' })).toEqual({
      city: 'Madrid',
      limit: LIST_DEFAULT_LIMIT,
      offset: 0,
    });
  });

  it('lee bbox, near, país en mayúsculas, q y food', () => {
    const q = parseListQuery({
      bbox: '-3.8,40.3,-3.6,40.5',
      country: 'es',
      q: ' lavapiés ',
      food: 'pizza,tapas',
      limit: '10',
    });
    expect(q.bbox).toEqual({
      west: -3.8,
      south: 40.3,
      east: -3.6,
      north: 40.5,
    });
    expect(q.country).toBe('ES');
    expect(q.q).toBe('lavapiés');
    expect(q.food).toEqual(['pizza', 'tapas']);
    expect(q.limit).toBe(10);
    expect(parseListQuery({ near: '40.41,-3.70' }).near).toEqual({
      lat: 40.41,
      lng: -3.7,
    });
  });

  it('food acepta también el parámetro repetido', () => {
    expect(
      parseListQuery({ city: 'x', food: ['pizza', 'tapas,sushi'] }).food,
    ).toEqual(['pizza', 'tapas', 'sushi']);
  });

  it('rechaza bbox y near mal formados con 422', () => {
    for (const raw of [
      { bbox: '1,2,3' },
      { bbox: 'a,b,c,d' },
      { bbox: '-3,50,-2,40' }, // sur > norte
      { bbox: '-200,0,0,10' },
      { near: '95,0' },
      { near: '40' },
    ]) {
      const err = fails(raw);
      expect(err.status).toBe(422);
      expect(err.code).toBe('validation_failed');
    }
  });

  it('no admite bbox y near a la vez', () => {
    const err = fails({ bbox: '-3,40,-2,41', near: '40,-3' });
    expect(err.status).toBe(400);
    expect(err.code).toBe('invalid_zone');
  });

  it('limita el tamaño de página y valida el país y el cursor', () => {
    expect(fails({ city: 'x', limit: '101' }).status).toBe(422);
    expect(fails({ city: 'x', limit: '0' }).status).toBe(422);
    expect(fails({ city: 'x', country: 'ESP' }).status).toBe(422);
    expect(fails({ city: 'x', cursor: 'basura' }).status).toBe(422);
    expect(parseListQuery({ city: 'x', cursor: encodeCursor(40) }).offset).toBe(
      40,
    );
  });

  it('no deja pasar claves de comida raras', () => {
    expect(fails({ city: 'x', food: '$ne' }).status).toBe(422);
  });

  it('el mapa admite hasta 1.000 puntos', () => {
    expect(GEOJSON_MAX_POINTS).toBe(1000);
  });
});

describe('buildFilter', () => {
  const base = { limit: 50, offset: 0 };

  it('siempre limita a lo publicado y verificado', () => {
    const filter = buildFilter({ ...base, city: 'Madrid' });
    expect(filter.status).toBe('published');
    expect(filter['verification.level']).toEqual({
      $in: ['community', 'admin'],
    });
  });

  it('la ciudad y la búsqueda ignoran mayúsculas y acentos', () => {
    const filter = buildFilter({ ...base, city: 'MÁLAGA', q: 'Lavapiés (c.)' });
    expect(filter.cityKey).toBe('malaga');
    expect(filter.searchText).toEqual({ $regex: 'lavapies \\(c\\.\\)' });
  });

  it('bbox normal: rangos de longitud y latitud', () => {
    const filter = buildFilter({
      ...base,
      bbox: { west: -3.8, south: 40.3, east: -3.6, north: 40.5 },
    });
    expect(filter['location.coordinates.0']).toEqual({
      $gte: -3.8,
      $lte: -3.6,
    });
    expect(filter['location.coordinates.1']).toEqual({
      $gte: 40.3,
      $lte: 40.5,
    });
    expect(filter).not.toHaveProperty('$or');
  });

  it('bbox que cruza el antimeridiano: dos tramos', () => {
    const filter = buildFilter({
      ...base,
      bbox: { west: 179, south: -20, east: -179, north: -10 },
    });
    expect(filter.$or).toEqual([
      { 'location.coordinates.0': { $gte: 179 } },
      { 'location.coordinates.0': { $lte: -179 } },
    ]);
    expect(filter).not.toHaveProperty('location.coordinates.0');
  });

  it('near usa la distancia esférica con [lng, lat]', () => {
    const filter = buildFilter({ ...base, near: { lat: 40.41, lng: -3.7 } });
    expect(filter.location).toEqual({
      $nearSphere: { $geometry: { type: 'Point', coordinates: [-3.7, 40.41] } },
    });
  });

  it('country y food', () => {
    const filter = buildFilter({ ...base, country: 'ES', food: ['pizza'] });
    expect(filter['address.country']).toBe('ES');
    expect(filter.foodTags).toEqual({ $in: ['pizza'] });
  });
});
