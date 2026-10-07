import { es } from './i18n/es';

export interface NavLink {
  href: string;
  label: string;
}

export interface NavGroup {
  title: string;
  links: NavLink[];
}

const l = es.menu.links;

export const navGroups: NavGroup[] = [
  {
    title: es.menu.groups.navigate,
    links: [
      { href: '/', label: l.map },
      { href: '/lista', label: l.list },
    ],
  },
  {
    title: es.menu.groups.collaborate,
    links: [
      { href: '/proponer', label: l.propose },
      { href: '/corregir', label: l.correct },
      { href: '/negocios', label: l.business },
    ],
  },
  {
    title: es.menu.groups.about,
    links: [
      { href: '/sobre', label: l.what },
      { href: '/verificacion', label: l.verify },
      { href: '/privacidad', label: l.privacy },
      { href: '/contacto', label: l.contact },
    ],
  },
];

// Rutas del menú que aún no tienen pantalla propia: las sirve la página
// "llega pronto" hasta que se construyan (una ruta real tiene prioridad).
const builtRoutes = ['', 'proponer'];

export const pendingRoutes = navGroups
  .flatMap((g) => g.links.map((link) => link.href.slice(1)))
  .filter((slug) => !builtRoutes.includes(slug));
