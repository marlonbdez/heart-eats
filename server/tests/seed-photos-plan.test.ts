import { describe, expect, it } from 'vitest';
import { planPhotos, usablePhotos } from '../seed/photos-plan.js';

const id = (n: number) =>
  `0b8e3a52-5a43-4b8a-9d5e-${String(n).padStart(12, '0')}`;
const photo = (n: number) => `${id(n)}.webp`;
const thumb = (n: number) => `${id(n)}-thumb.webp`;

describe('usablePhotos', () => {
  it('solo da fotos con su miniatura, ordenadas, sin las miniaturas', () => {
    const files = [thumb(2), photo(2), photo(1), thumb(1), photo(3)];
    // La 3 no tiene miniatura: no vale.
    expect(usablePhotos(files)).toEqual([photo(1), photo(2)]);
  });

  it('descarta lo que ya usa algo real y lo que no es una foto', () => {
    const files = [photo(1), thumb(1), photo(2), thumb(2), 'basura.txt'];
    expect(usablePhotos(files, new Set([photo(2)]))).toEqual([photo(1)]);
  });

  it('sin nada, nada', () => {
    expect(usablePhotos([])).toEqual([]);
  });
});

describe('planPhotos', () => {
  const pool = [1, 2, 3, 4, 5, 6, 7].map(photo);

  it('da una foto al primero, dos al segundo… cinco al quinto, y vuelta a empezar', () => {
    const plan = planPhotos(['a', 'b', 'c', 'd', 'e', 'f'], pool);
    expect([...plan.values()].map((files) => files.length)).toEqual([
      1, 2, 3, 4, 5, 1,
    ]);
  });

  it('sigue por donde acabó el anterior y da la vuelta al fondo', () => {
    const plan = planPhotos(['a', 'b', 'c'], pool);
    expect(plan.get('a')).toEqual([photo(1)]);
    expect(plan.get('b')).toEqual([photo(2), photo(3)]);
    expect(plan.get('c')).toEqual([photo(4), photo(5), photo(6)]);
    expect(planPhotos(['a', 'b', 'c', 'd'], pool).get('d')).toEqual([
      photo(7),
      photo(1),
      photo(2),
      photo(3),
    ]);
  });

  it('nunca repite una foto dentro de un local, aunque haya pocas', () => {
    const plan = planPhotos(['a', 'b', 'c', 'd', 'e'], [photo(1), photo(2)]);
    for (const files of plan.values()) {
      expect(new Set(files).size).toBe(files.length);
      expect(files.length).toBeLessThanOrEqual(2);
    }
  });

  it('es determinista y sin fotos no reparte nada', () => {
    const slugs = ['a', 'b', 'c', 'd'];
    expect([...planPhotos(slugs, pool)]).toEqual([...planPhotos(slugs, pool)]);
    expect(planPhotos(slugs, []).size).toBe(0);
  });
});
