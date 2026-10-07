import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './ViewSwitch.module.css';

// Conmutador Mapa / Lista. Son enlaces a dos rutas (no un estado interno) y
// llevan la búsqueda actual, así que se puede compartir y recargar cada vista.
export function ViewSwitch({
  view,
  query,
}: {
  view: 'map' | 'list';
  query: Record<string, string>;
}) {
  const t = useTranslations('view');
  const items = [
    { key: 'map', pathname: '/' },
    { key: 'list', pathname: '/list' },
  ] as const;
  return (
    <nav aria-label={t('label')} className={styles.switch}>
      {items.map((item) => (
        <Link
          key={item.key}
          href={{ pathname: item.pathname, query }}
          aria-current={view === item.key ? 'page' : undefined}
          className={styles.item}
        >
          {t(item.key)}
        </Link>
      ))}
    </nav>
  );
}
