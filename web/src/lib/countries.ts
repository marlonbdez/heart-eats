import { countryCodes } from './country-views';

// Los países que se pueden elegir al proponer un local, con su nombre en el
// idioma de la web y ordenados como se ordena en ese idioma.
export function countryOptions(locale: string) {
  const names = new Intl.DisplayNames([locale], { type: 'region' });
  const nameOf = (code: string) => {
    try {
      return names.of(code) ?? code;
    } catch {
      return code;
    }
  };
  return countryCodes
    .map((code) => ({ code, name: nameOf(code) }))
    .sort((a, b) => a.name.localeCompare(b.name, locale));
}

// El nombre de un país en el idioma de la web; si no lo conoce, el código.
export function countryName(code: string, locale: string) {
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

// Cómo se escribe el código postal en los países más habituales. En el resto se
// acepta cualquier código razonable: el servidor y Moderación lo comprueban.
const POSTAL: Record<string, RegExp> = {
  ES: /^\d{5}$/,
  FR: /^\d{5}$/,
  DE: /^\d{5}$/,
  IT: /^\d{5}$/,
  MX: /^\d{5}$/,
  CU: /^\d{5}$/,
  US: /^\d{5}(-\d{4})?$/,
  PT: /^\d{4}-\d{3}$/,
  GB: /^[A-Za-z]{1,2}\d[A-Za-z\d]? ?\d[A-Za-z]{2}$/,
  NL: /^\d{4} ?[A-Za-z]{2}$/,
  BE: /^\d{4}$/,
  AT: /^\d{4}$/,
  CH: /^\d{4}$/,
  AR: /^([A-Za-z]\d{4}[A-Za-z]{3}|\d{4})$/,
  CO: /^\d{6}$/,
  CL: /^\d{7}$/,
  BR: /^\d{5}-?\d{3}$/,
};
const GENERIC_POSTAL = /^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/;

export const isPostalCode = (value: string, country: string) =>
  (POSTAL[country] ?? GENERIC_POSTAL).test(value);
