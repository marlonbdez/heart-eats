'use client';

import { useSyncExternalStore, type ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { discoveryFromSearch } from './DiscoveryContext';

const noop = () => () => {};

// "Volver" de la ficha: regresa al mapa o a la lista de donde se venía, con su
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
      href={{ pathname: view === 'list' ? '/list' : '/', query }}
      className={className}
    >
      {children}
    </Link>
  );
}
