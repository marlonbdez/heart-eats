'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { loadLanguage, pickLocale } from '@/lib/language';

// La raíz (/) lleva al idioma de la persona: el que eligió, si lo hizo; si no,
// el de su navegador; si no, inglés. Sin JavaScript quedan los dos enlaces.
export function RootRedirect() {
  useEffect(() => {
    const locale = pickLocale(loadLanguage(), navigator.languages ?? []);
    window.location.replace(`/${locale}`);
  }, []);

  return (
    <main style={{ padding: 24, maxWidth: 560 }}>
      <p>
        <Link href="/en" lang="en">
          English
        </Link>
        {' · '}
        <Link href="/es" lang="es">
          Español
        </Link>
      </p>
    </main>
  );
}
