// Dibujo de los marcadores del mapa: el corazón del logo, con su mordisco y
// unas pepitas, pero de un solo color (lo pone el CSS) para que se vea bien a
// 28-44 px y el estado «seleccionado» se note. Mismo trazado que LogoMark.
const HEART_PATH =
  'M12 21C5 16 2 12.5 2 8.5 2 5.5 4.3 3.5 7 3.5c2 0 3.8 1.1 5 3 1.2-1.9 3-3 5-3 2.7 0 5 2 5 5 0 4-3 7.5-10 12.5z';

// `id` debe ser único en la página: la máscara hace el mordisco. Los colores
// de la máscara y de las pepitas van como atributos para que el CSS del
// marcador (fill/stroke del svg) no los cambie.
export function markerSvg(id: string): string {
  const mask = `bite-${id}`;
  return `<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true" focusable="false"><mask id="${mask}"><rect width="24" height="24" fill="#fff" stroke="none"/><circle cx="20.6" cy="5" r="2.9" fill="#000" stroke="none"/><circle cx="17.7" cy="2.3" r="2.5" fill="#000" stroke="none"/><circle cx="22.2" cy="8.8" r="2.3" fill="#000" stroke="none"/></mask><path mask="url(#${mask})" d="${HEART_PATH}"/><g fill="rgb(60 25 10 / .7)" stroke="none"><circle cx="7.5" cy="8.1" r="1.3"/><circle cx="12.1" cy="11.6" r="1.3"/><circle cx="7.9" cy="14.3" r="1.1"/><circle cx="14.8" cy="8" r="1.1"/></g></svg>`;
}
