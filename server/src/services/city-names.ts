import type { Geocoder } from './geocoder.js';

// Idiomas de la web (web/messages) para los que se guarda el nombre de la ciudad.
export const CITY_NAME_LOCALES = ['es', 'en'] as const;

// El nombre de la ciudad en cada idioma. Es un añadido: si el servicio no
// responde o no la conoce, la ficha se publica igual y la web usa `city`.
export async function cityNamesFor(
  geocoder: Geocoder | undefined,
  city: string,
  country: string,
): Promise<Record<string, string> | undefined> {
  if (!geocoder) return undefined;
  try {
    const names = await geocoder.cityNames(
      { city, country },
      CITY_NAME_LOCALES,
    );
    return Object.keys(names).length > 0 ? names : undefined;
  } catch (err) {
    console.error(
      'No se pudo obtener el nombre de la ciudad:',
      err instanceof Error ? err.message : err,
    );
    return undefined;
  }
}
