import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { galleryOf } from '@/lib/gallery';
import { effectiveTeamLevel } from '@/lib/team';
import type { Restaurant } from '@/lib/types';
import { BackLink } from './BackLink';
import { Distance } from './Distance';
import { HoursBlock } from './HoursBlock';
import { OpenNow } from './OpenNow';
import { PlaceGallery } from './PlaceGallery';
import { TeamBlock } from './TeamBlock';
import styles from './RestaurantDetail.module.css';

export function RestaurantDetail({
  restaurant: r,
}: {
  restaurant: Restaurant;
}) {
  const t = useTranslations('detail');
  const tc = useTranslations('card');
  const tf = useTranslations();
  const format = useFormatter();
  const locale = useLocale();
  const photos = galleryOf(r, locale);
  const description =
    r.description?.[locale] ?? r.description?.[routing.defaultLocale];
  const address = [r.address.street, r.address.city].filter(Boolean).join(', ');
  const { lat, lng } = r.location;
  const directions = `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
  const verification = r.verification;
  const isAdmin = verification.level === 'admin';
  const teamLevel = effectiveTeamLevel(r);
  const foodTags = r.foodTags.filter((tag) => tf.has(`foodTags.${tag}`));

  const actions = [
    { href: directions, label: t('directions'), primary: true, external: true },
    r.contact.phone && {
      href: `tel:${r.contact.phone.replace(/\s/g, '')}`,
      label: t('call'),
    },
    r.contact.website && {
      href: r.contact.website,
      label: t('website'),
      external: true,
    },
    r.menuUrl && {
      href: r.menuUrl,
      label: t('menu'),
      external: true,
    },
  ].filter(Boolean) as {
    href: string;
    label: string;
    primary?: boolean;
    external?: boolean;
  }[];

  return (
    <article className={styles.page}>
      <div className={photos.length ? styles.heroPhotos : styles.hero}>
        {photos.length ? (
          <PlaceGallery name={r.name} photos={photos} />
        ) : (
          <span role="img" aria-label={tc('noPhoto')}>
            🍽️
          </span>
        )}
        <BackLink className={styles.back}>
          <span aria-hidden="true">←</span> {t('back')}
        </BackLink>
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1>{r.name}</h1>
          <p className={styles.muted}>
            {[
              t(`businessTypes.${r.businessType}`),
              r.priceRange && tf(`price.long.${r.priceRange}`),
              address,
            ]
              .filter(Boolean)
              .join(' · ')}
            <Distance location={r.location} />
          </p>
          <OpenNow hours={r.openingHours} timezone={r.timezone} />
          {foodTags.length > 0 && (
            <ul className={styles.tags} aria-label={t('foodTypes')}>
              {foodTags.map((tag) => (
                <li key={tag}>{tf(`foodTags.${tag}`)}</li>
              ))}
            </ul>
          )}
          {description && <p>{description}</p>}
          {/* Con bloque de equipo, el sello va dentro de él. */}
          {!(teamLevel && r.team) && (
            <p className={styles.seal}>
              <span aria-hidden="true">♥</span> {t('seal')}
            </p>
          )}
        </header>

        <div className={styles.side}>
          <nav className={styles.actions} aria-label={t('actions')}>
            {actions.map((a) => (
              <a
                key={a.label}
                href={a.href}
                className={a.primary ? styles.primary : styles.secondary}
                {...(a.external
                  ? { target: '_blank', rel: 'noopener noreferrer' }
                  : {})}
              >
                {a.label}
              </a>
            ))}
          </nav>
          {r.openingHours.length > 0 && <HoursBlock hours={r.openingHours} />}
        </div>

        <div className={styles.rest}>
          {r.signatureDishes.length > 0 && (
            <section aria-labelledby="platos">
              <h2 id="platos">{t('dishes')}</h2>
              <ul className={styles.dishes}>
                {r.signatureDishes.map((d) => (
                  <li key={d.name} className={styles.dish}>
                    <div className={styles.dishPhoto}>
                      {d.photoUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={d.thumbUrl ?? d.photoUrl} alt="" />
                      ) : (
                        <span aria-hidden="true">🍽️</span>
                      )}
                    </div>
                    <div>
                      <p className={styles.dishName}>{d.name}</p>
                      {d.description && (
                        <p className={styles.muted}>{d.description}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {teamLevel && r.team && <TeamBlock team={r.team} level={teamLevel} />}

          <section
            className={styles.verification}
            aria-labelledby="verificacion"
          >
            <h2 id="verificacion" className={styles.verificationTitle}>
              <span aria-hidden="true">{isAdmin ? '🟢' : '🟡'}</span>{' '}
              {isAdmin ? t('verifiedAdmin') : t('verifiedCommunity')}
            </h2>
            <p>
              {tc(`methods.${verification.method}`)} ·{' '}
              {format.dateTime(new Date(verification.lastVerifiedAt), {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
              {verification.needsReview && ` · ${tc('needsReview')}`}
            </p>
            <Link href="/verification">{t('howWeVerify')}</Link>
          </section>

          <Link href={`/correct/${r.slug}`} className={styles.suggest}>
            {t('suggest')}
          </Link>
          <Link href={`/business/${r.slug}`} className={styles.suggest}>
            {t('isYours')}
          </Link>
        </div>
      </div>
    </article>
  );
}
