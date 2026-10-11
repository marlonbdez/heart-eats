'use client';

import type { ReactNode } from 'react';
import { Link } from '@/i18n/navigation';
import { lastDiscovery } from '@/lib/back';

// "Volver" de la ficha: regresa al mapa o a la lista de donde se venía, con su búsqueda.
export function BackLink({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const { view, query } = lastDiscovery();
  return (
    <Link
      href={{ pathname: view === 'list' ? '/list' : '/', query }}
      className={className}
    >
      {children}
    </Link>
  );
}
