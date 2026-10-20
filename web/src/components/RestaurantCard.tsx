import { useTranslations } from 'next-intl';
import { memo } from 'react';
import { Link } from '@/i18n/navigation';
import { coverThumb } from '@/lib/gallery';
import type { Restaurant } from '@/lib/types';
import { placeQuery, useDiscovery } from './DiscoveryContext';
import { Distance } from './Distance';
import { VerificationBadge } from './VerificationBadge';
import styles from './RestaurantCard.module.css';

// Tarjeta de local; toda ella lleva a la ficha. En la lista (`list`) la foto
// va arriba; en la vista previa del mapa (`preview`) va a un lado y es compacta.
export const RestaurantCard = memo(function RestaurantCard({
  restaurant,
  variant = 'preview',
}: {
  restaurant: Restaurant;
  variant?: 'list' | 'preview';
}) {
  const t = useTranslations('card');
  const discovery = useDiscovery();
  const dish = restaurant.signatureDishes[0];
  const cover = coverThumb(restaurant);
  const place = [restaurant.address.neighborhood, restaurant.address.city]
    .filter(Boolean)
    .join(', ');
  const isList = variant === 'list';
  const href = {
    pathname: `/place/${restaurant.slug}`,
    query: placeQuery(discovery),
  };

  return (
    <div className={isList ? styles.listCard : styles.card}>
      <div className={styles.photo}>
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover.src}
            alt={cover.alt}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <span role="img" aria-label={t('noPhoto')}>
            🍽️
          </span>
        )}
      </div>
      <div className={styles.body}>
        {!isList && dish && (
          <>
            <p className={styles.dishLabel}>{t('signatureDish')}</p>
            <p className={styles.dish}>{dish.name}</p>
          </>
        )}
        <h2 className={styles.name}>
          <Link className={styles.nameLink} href={href}>
            {restaurant.name}
          </Link>
        </h2>
        <p className={styles.place}>
          {place}
          <Distance location={restaurant.location} />
        </p>
        {isList && dish && (
          <p className={styles.dishLine}>
            <span className={styles.dishLabel}>{t('signatureDish')}</span>{' '}
            {dish.name}
          </p>
        )}
        <p className={styles.seal}>
          <span aria-hidden="true">♥</span> {t('inclusiveSeal')}
        </p>
        <VerificationBadge verification={restaurant.verification} />
      </div>
    </div>
  );
});
