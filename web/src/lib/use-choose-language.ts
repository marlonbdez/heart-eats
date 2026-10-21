'use client';

import { useLocale } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { saveLanguage } from './language';

// Elegir un idioma: se recuerda para la próxima visita y se cambia de idioma
// sin perder la búsqueda (?q, ?food), que solo se conoce en el navegador.
export function useChooseLanguage() {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  return (code: Locale) => {
    saveLanguage(code);
    if (code === locale) return;
    router.replace(`${pathname}${window.location.search}`, { locale: code });
  };
}
