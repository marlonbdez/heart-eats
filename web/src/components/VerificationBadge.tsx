import { es } from '@/lib/i18n/es';
import type { Restaurant } from '@/lib/types';
import styles from './VerificationBadge.module.css';

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-ES', { month: 'short', year: 'numeric' }).format(
    new Date(iso),
  );

export function VerificationBadge({
  verification,
}: {
  verification: Restaurant['verification'];
}) {
  const t = es.card;
  const isAdmin = verification.level === 'admin';
  return (
    <p className={styles.badge}>
      <span aria-hidden="true">{isAdmin ? '🟢' : '🟡'}</span>
      <span>
        <strong>{isAdmin ? t.verifiedAdmin : t.verifiedCommunity}</strong>
        {' · '}
        {t.methods[verification.method]}
        {' · '}
        {t.updated} {formatDate(verification.lastVerifiedAt)}
        {verification.needsReview && (
          <span className={styles.review}> · {t.needsReview}</span>
        )}
      </span>
    </p>
  );
}
