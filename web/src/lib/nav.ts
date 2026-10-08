export interface NavLink {
  href: string;
  key: string; // clave en messages: menu.links.<key>
}

export interface NavGroup {
  key: string; // clave en messages: menu.groups.<key>
  links: NavLink[];
}

export const navGroups: NavGroup[] = [
  {
    key: 'navigate',
    links: [
      { href: '/', key: 'map' },
      { href: '/list', key: 'list' },
    ],
  },
  {
    key: 'collaborate',
    links: [
      { href: '/propose', key: 'propose' },
      { href: '/correct', key: 'correct' },
      { href: '/business', key: 'business' },
    ],
  },
  {
    key: 'about',
    links: [
      { href: '/about', key: 'what' },
      { href: '/verification', key: 'verify' },
      { href: '/privacy', key: 'privacy' },
      { href: '/contact', key: 'contact' },
    ],
  },
];

// Rutas del menú que ya tienen pantalla propia. El resto las sirve la página
// "llega pronto" (una ruta real siempre tiene prioridad).
// Las URLs van en inglés en todos los idiomas (ADR 0003).
const builtRoutes = [
  'list',
  'propose',
  'correct',
  'business',
  'about',
  'verification',
];

export const pendingRoutes = navGroups
  .flatMap((g) => g.links.map((link) => link.href.slice(1)))
  .filter((slug) => slug !== '' && !builtRoutes.includes(slug));
