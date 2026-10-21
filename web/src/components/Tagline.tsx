import { useTranslations } from 'next-intl';
import styles from './Tagline.module.css';

// La frase corta de la marca, con un corazón pequeño del color de la marca.
export function Tagline({ className }: { className?: string }) {
  const t = useTranslations();
  return (
    <p className={className}>
      <svg
        viewBox="0 0 24 24"
        width="14"
        height="14"
        aria-hidden="true"
        focusable="false"
        className={styles.heart}
      >
        <path
          fill="currentColor"
          d="M12 21C5 16 2 12.5 2 8.5 2 5.5 4.3 3.5 7 3.5c2 0 3.8 1.1 5 3 1.2-1.9 3-3 5-3 2.7 0 5 2 5 5 0 4-3 7.5-10 12.5z"
        />
      </svg>
      {t('app.tagline')}
    </p>
  );
}
