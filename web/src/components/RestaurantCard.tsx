import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Restaurant } from '@/lib/types';
import { Distance } from './Distance';
import { VerificationBadge } from './VerificationBadge';
import styles from './RestaurantCard.module.css';

// Tarjeta de local, reutilizable en mapa y lista. Lidera el plato estrella.
export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  const t = useTranslations('card');
  const dish = restaurant.signatureDishes[0];
  const place = [restaurant.address.neighborhood, restaurant.address.city]
    .filter(Boolean)
    .join(', ');

  return (
    <div className={styles.card}>
      <div className={styles.photo}>
        {dish.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dish.photoUrl} alt={dish.name} />
        ) : (
          <span role="img" aria-label={t('noPhoto')}>
            🍽️
          </span>
        )}
      </div>
      <div className={styles.body}>
        <p className={styles.dishLabel}>{t('signatureDish')}</p>
        <p className={styles.dish}>{dish.name}</p>
        <h2 className={styles.name}>{restaurant.name}</h2>
        <p className={styles.place}>
          {place}
          <Distance location={restaurant.location} />
        </p>
        <p className={styles.seal}>
          <span aria-hidden="true">♥</span> {t('inclusiveSeal')}
        </p>
        <VerificationBadge verification={restaurant.verification} />
        <Link className={styles.more} href={`/place/${restaurant.slug}`}>
          {t('viewLocal')}
        </Link>
      </div>
    </div>
  );
}
