import { useFormatter, useTranslations } from 'next-intl';
import type { Restaurant } from '@/lib/types';
import styles from './VerificationBadge.module.css';

export function VerificationBadge({
  verification,
}: {
  verification: Restaurant['verification'];
}) {
  const t = useTranslations('card');
  const format = useFormatter();
  const isAdmin = verification.level === 'admin';
  return (
    <p className={styles.badge}>
      <span aria-hidden="true">{isAdmin ? '🟢' : '🟡'}</span>
      <span>
        <strong>{isAdmin ? t('verifiedAdmin') : t('verifiedCommunity')}</strong>
        {' · '}
        {t(`methods.${verification.method}`)}
        {' · '}
        {t('updated')}{' '}
        {format.dateTime(new Date(verification.lastVerifiedAt), {
          month: 'short',
          year: 'numeric',
        })}
        {verification.needsReview && (
          <span className={styles.review}> · {t('needsReview')}</span>
        )}
      </span>
    </p>
  );
}
