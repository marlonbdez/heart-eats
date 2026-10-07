import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'correct' });
  return { title: t('title') };
}

// Desde el menú no se sabe qué local se quiere corregir: se explica cómo
// llegar al formulario, que se abre desde la ficha de cada local.
export default async function CorrectIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: 'correct' });
  return (
    <main id="contenido" tabIndex={-1} style={{ padding: 24, maxWidth: 560 }}>
      <h1>{t('pick.title')}</h1>
      <p>{t('pick.body')}</p>
      <p>
        <Link href="/list">{t('pick.list')}</Link>
      </p>
    </main>
  );
}
