// Misma normalización que usa el buscador de la web (web/src/lib/search.ts):
// minúsculas y sin acentos, para que «lavapies» encuentre «Lavapiés».
export const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

export const escapeRegex = (s: string) =>
  s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
