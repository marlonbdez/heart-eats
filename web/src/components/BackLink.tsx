'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { discoveryFromSearch } from './DiscoveryContext';

const noop = () => () => {};

// "Volver" de la ficha: regresa a la lista o al mapa de donde se venía, con su
// búsqueda (que viaja en la dirección de la ficha).
export function BackLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const search = useSyncExternalStore(
    noop,
    () => window.location.search,
    () => '',
  );
  const { view, query } = discoveryFromSearch(search);
  return (
    <Link
      href={{ pathname: view === 'map' ? '/map' : '/', query }}
      className={className}
    >
      {children}
    </Link>
  );
}
