// Validaciones sencillas de los formularios. El servidor volverá a validar.
export const isHttpUrl = (v: string) => {
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:';
  } catch {
    return false;
  }
};

export const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

// Un texto que parece una calle o una ciudad: algo más que un par de signos,
// con al menos una letra.
export const isPlaceText = (v: string, min: number) =>
  v.trim().length >= min && /\p{L}/u.test(v);
