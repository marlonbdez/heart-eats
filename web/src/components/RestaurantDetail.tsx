import { useFormatter, useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';
import { effectiveTeamLevel } from '@/lib/team';
import type { Restaurant } from '@/lib/types';
import { Distance } from './Distance';
import { HoursBlock } from './HoursBlock';
import { TeamBlock } from './TeamBlock';
import styles from './RestaurantDetail.module.css';

export function RestaurantDetail({
  restaurant: r,
}: {
  restaurant: Restaurant;
}) {
  const t = useTranslations('detail');
  const tc = useTranslations('card');
  const format = useFormatter();
  const locale = useLocale();
  const photo = r.signatureDishes.find((d) => d.photoUrl)?.photoUrl;
  const description =
    r.description?.[locale] ?? r.description?.[routing.defaultLocale];
  const address = [r.address.street, r.address.city].filter(Boolean).join(', ');
  const { lat, lng } = r.location;
  const directions = `https://www.openstreetmap.org/directions?to=${lat}%2C${lng}`;
  const verification = r.verification;
  const isAdmin = verification.level === 'admin';
  const teamLevel = effectiveTeamLevel(r);

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
  ].filter(Boolean) as {
    href: string;
    label: string;
    primary?: boolean;
    external?: boolean;
  }[];

  return (
    <article className={styles.page}>
      <div className={styles.hero}>
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt="" />
        ) : (
          <span role="img" aria-label={tc('noPhoto')}>
            🍽️
          </span>
        )}
        <Link href="/" className={styles.back}>
          <span aria-hidden="true">←</span> {t('back')}
        </Link>
      </div>

      <div className={styles.content}>
        <header className={styles.header}>
          <h1>{r.name}</h1>
          <p className={styles.muted}>
            {t(`businessTypes.${r.businessType}`)} · {address}
            <Distance location={r.location} />
          </p>
          <p className={styles.seal}>
            <span aria-hidden="true">♥</span> {t('seal')}
          </p>
          {description && <p>{description}</p>}
        </header>

        <section aria-labelledby="platos">
          <h2 id="platos">{t('dishes')}</h2>
          <ul className={styles.dishes}>
            {r.signatureDishes.map((d) => (
              <li key={d.name} className={styles.dish}>
                <div className={styles.dishPhoto}>
                  {d.photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={d.photoUrl} alt="" />
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

        {teamLevel && r.team && <TeamBlock team={r.team} level={teamLevel} />}

        {r.openingHours.length > 0 && <HoursBlock hours={r.openingHours} />}

        <section className={styles.verification} aria-labelledby="verificacion">
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
      </div>
    </article>
  );
}
