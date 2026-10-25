import { describe, expect, it } from 'vitest';
import { timezoneOf } from '../src/services/timezone.js';

describe('timezoneOf', () => {
  it('da la zona del punto', () => {
    expect(timezoneOf(40.4168, -3.7038)).toBe('Europe/Madrid');
    expect(timezoneOf(35.68, 139.69)).toBe('Asia/Tokyo');
  });

  it('distingue dos zonas del mismo país', () => {
    expect(timezoneOf(28.12, -15.43)).toBe('Atlantic/Canary');
    expect(timezoneOf(41.39, 2.17)).toBe('Europe/Madrid');
  });

  it('no falla con coordenadas fuera de rango', () => {
    expect(timezoneOf(91, 0)).toBeUndefined();
    expect(timezoneOf(Number.NaN, 0)).toBeUndefined();
  });
});
