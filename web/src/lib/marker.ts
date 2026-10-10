// Marcador del mapa: un pin clásico (gota con un punto), de un solo color que
// pone el CSS (`.marker svg`: relleno, borde blanco y sombra), para que se vea
// bien a 28-44 px y el estado «seleccionado» se note. El punto lleva su color
// como atributo para que el CSS del marcador no lo cambie. Es sobrio a
// propósito: el corazón queda para el logo.
export const MARKER_SVG =
  '<svg viewBox="0 0 24 24" width="36" height="36" aria-hidden="true" focusable="false"><path d="M12 22.5C12 22.5 19 16.2 19 10a7 7 0 0 0-14 0c0 6.2 7 12.5 7 12.5z"/><circle cx="12" cy="10" r="2.6" fill="#fff" stroke="none"/></svg>';
