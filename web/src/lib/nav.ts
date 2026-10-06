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
      { href: '/lista', key: 'list' },
    ],
  },
  {
    key: 'collaborate',
    links: [
      { href: '/proponer', key: 'propose' },
      { href: '/corregir', key: 'correct' },
      { href: '/negocios', key: 'business' },
    ],
  },
  {
    key: 'about',
    links: [
      { href: '/sobre', key: 'what' },
      { href: '/verificacion', key: 'verify' },
      { href: '/privacidad', key: 'privacy' },
      { href: '/contacto', key: 'contact' },
    ],
  },
];

// Rutas del menú que aún no tienen pantalla propia: las sirve la página
// "llega pronto" hasta que se construyan (una ruta real tiene prioridad).
// Las rutas son iguales en todos los idiomas.
// Rutas del menú que ya tienen pantalla propia.
const builtRoutes = ['lista'];

export const pendingRoutes = navGroups
  .flatMap((g) => g.links.map((link) => link.href.slice(1)))
  .filter((slug) => slug !== '' && !builtRoutes.includes(slug));
