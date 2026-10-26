// Validaciones sencillas de los formularios. El servidor volverá a validar.
export const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

// Un enlace seguro (https), como el de la carta de un local.
export const isHttpsUrl = (v: string) => isHttpUrl(v) && /^https:/i.test(v);

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Un texto que parece una calle o una ciudad: algo más que un par de signos,
// con al menos una letra.
export const isPlaceText = (v: string, min: number) =>
  v.trim().length >= min && /\p{L}/u.test(v);
