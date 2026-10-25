export interface NavLink {
  href: string;
  key: string; // clave en messages: menu.links.<key>
  // Solo se muestra en pantallas anchas o estrechas (donde lista y mapa se ven
  // a la vez, 900 px como en Discover, basta una entrada).
  only?: 'wide' | 'narrow';
}

export interface NavGroup {
  key: string; // clave en messages: menu.groups.<key>
  links: NavLink[];
}

export const navGroups: NavGroup[] = [
  {
    key: 'navigate',
    links: [
      { href: '/', key: 'explore', only: 'wide' },
      { href: '/', key: 'list', only: 'narrow' },
      { href: '/map', key: 'map', only: 'narrow' },
    ],
  },
  {
    key: 'participate',
    links: [
      { href: '/propose', key: 'propose' },
      { href: '/correct', key: 'correct' },
      { href: '/removal', key: 'removal' },
      { href: '/business', key: 'business' },
      { href: '/contribute', key: 'contribute' },
    ],
  },
  {
    key: 'about',
    links: [
      { href: '/about', key: 'what' },
      { href: '/verification', key: 'verify' },
      { href: '/privacy', key: 'privacy' },
      { href: '/cookies', key: 'cookies' },
      { href: '/legal', key: 'legal' },
      { href: '/contact', key: 'contact' },
    ],
  },
];

// Con lista y mapa a la vez, la portada y el mapa son la misma pantalla.
const EXPLORE_PATHS = ['/', '/map', '/list'];

export const isCurrent = (link: NavLink, pathname: string) =>
  link.key === 'explore'
    ? EXPLORE_PATHS.includes(pathname)
    : pathname === link.href;
