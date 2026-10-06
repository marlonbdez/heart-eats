import { useTranslations } from 'next-intl';
import { setRequestLocale } from 'next-intl/server';
import { use } from 'react';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { pendingRoutes } from '@/lib/nav';

export const dynamicParams = false;

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    pendingRoutes.map((slug) => ({ locale, slug: [slug] })),
  );
}

export default function ComingSoon({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = use(params);
  setRequestLocale(locale);
  const t = useTranslations('placeholder');
  return (
    <main id="contenido" tabIndex={-1} style={{ padding: 24, maxWidth: 560 }}>
      <h1>{t('title')}</h1>
      <p>{t('body')}</p>
      <p>
        <Link href="/">{t('back')}</Link>
      </p>
    </main>
  );
}
