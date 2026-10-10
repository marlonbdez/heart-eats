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
      { href: '/removal', key: 'removal' },
      { href: '/contact', key: 'contact' },
    ],
  },
  // Provisional: mientras no haya cuentas (P5) el panel de moderación se abre
  // desde el menú para poder probarlo en el móvil. Después se oculta.
  {
    key: 'team',
    links: [{ href: '/moderation', key: 'moderation' }],
  },
];
