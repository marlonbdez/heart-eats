import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import styles from './ViewSwitch.module.css';

// Conmutador Mapa / Lista de la vista del mapa. Son enlaces a dos rutas (no un estado interno) y
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
    { key: 'map', pathname: '/map' },
    { key: 'list', pathname: '/' },
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

// En la lista (que es lo primero que se ve), un botón flotante lleva al mapa.
export function MapButton({ query }: { query: Record<string, string> }) {
  const t = useTranslations('view');
  return (
    <Link href={{ pathname: '/map', query }} className={styles.mapButton}>
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M9 4 3 6.5v13L9 17l6 3 6-2.5v-13L15 7 9 4Z" />
        <path d="M9 4v13M15 7v13" />
      </svg>
      {t('map')}
    </Link>
  );
}
