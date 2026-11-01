import { describe, expect, it, vi } from 'vitest';
import {
  isSafeForDemoData,
  requireSafeDatabase,
} from '../seed/database-guard.js';

describe('isSafeForDemoData', () => {
  it.each([
    'mongodb://127.0.0.1:27017/hearteats',
    'mongodb://localhost/hearteats',
    'mongodb+srv://api:clave@cluster.mongodb.net/hearteats_staging?retryWrites=true',
  ])('deja cargar en %s', (uri) => {
    expect(isSafeForDemoData(uri)).toBe(true);
  });

  it.each([
    'mongodb+srv://api:clave@cluster.mongodb.net/hearteats_production?retryWrites=true',
    'mongodb+srv://api:clave@cluster.mongodb.net/hearteats',
    'mongodb+srv://api:clave@cluster.mongodb.net/?retryWrites=true',
    'mongodb://a:1,b:2/hearteats',
    'no es una dirección',
  ])('se niega en %s', (uri) => {
    expect(isSafeForDemoData(uri)).toBe(false);
  });
});

describe('requireSafeDatabase', () => {
  const production = 'mongodb+srv://u:p@c.mongodb.net/hearteats_production';

  it('sale con error en una base que no es local ni de staging', () => {
    const exit = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('exit');
    }) as never);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => requireSafeDatabase(production, [])).toThrow('exit');
    expect(exit).toHaveBeenCalledWith(1);
    expect(error.mock.calls[0]![0]).toContain('--production');
    exit.mockRestore();
    error.mockRestore();
  });

  it('con --production a propósito, sigue', () => {
    expect(() =>
      requireSafeDatabase(production, ['--production']),
    ).not.toThrow();
  });
});
