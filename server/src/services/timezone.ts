import tzLookup from '@photostructure/tz-lookup';

// La zona horaria (IANA, p. ej. «Europe/Madrid») de un punto. No se guarda: sale
// de las coordenadas del pin y se corrige sola si el pin cambia. Sirve para que
// el horario de un local se lea en su hora y no en la de quien mira.
export function timezoneOf(lat: number, lng: number): string | undefined {
  try {
    return tzLookup(lat, lng);
  } catch {
    return undefined;
  }
}
