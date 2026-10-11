import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Link, usePathname, useRouter, etc. que añaden el idioma a la URL automáticamente.
export const { Link, usePathname, useRouter } = createNavigation(routing);
