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
      { href: '/', key: 'list' },
      { href: '/map', key: 'map' },
    ],
  },
  {
    key: 'collaborate',
    links: [
      { href: '/propose', key: 'propose' },
      { href: '/correct', key: 'correct' },
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
      { href: '/removal', key: 'removal' },
      { href: '/contact', key: 'contact' },
    ],
  },
];
