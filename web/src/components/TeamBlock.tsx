import { useTranslations } from 'next-intl';
import { effectiveTeamLevel } from '@/lib/team';
import type { Restaurant } from '@/lib/types';
import styles from './RestaurantDetail.module.css';

// "El Equipo" en tres niveles: cifras · áreas y tipos · historias con nombre.
// Solo se pinta lo que el negocio ha confirmado (ver lib/team.ts).
export function TeamBlock({ restaurant }: { restaurant: Restaurant }) {
  const t = useTranslations('team');
  const level = effectiveTeamLevel(restaurant);
  const team = restaurant.team;
  if (!level || !team) return null;
  const { totalStaff, staffWithDisability } = team.summary;

  return (
    <section className={styles.team} aria-labelledby="equipo">
      <h2 id="equipo">{t('title')}</h2>
      <p className={styles.teamCount}>
        {t.rich('summary', {
          with: staffWithDisability,
          total: totalStaff,
          b: (chunks) => <strong>{chunks}</strong>,
        })}
      </p>

      {level !== 'minimal' && team.roles && team.roles.length > 0 && (
        <ul className={styles.roles}>
          {team.roles.map((r) => (
            <li key={`${r.role}-${r.disabilityCategory}`}>
              {t('role', {
                role: r.role,
                count: r.count,
                category: t(`categories.${r.disabilityCategory}`),
              })}
            </li>
          ))}
        </ul>
      )}

      {level === 'full' && team.stories && team.stories.length > 0 && (
        <>
          {team.stories.map((s) => (
            <figure key={`${s.displayName}-${s.role}`} className={styles.story}>
              <div className={styles.avatar} aria-hidden="true">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoUrl} alt="" />
                ) : (
                  s.displayName.charAt(0)
                )}
              </div>
              <figcaption>
                <strong>{s.displayName}</strong>
                <span className={styles.muted}> · {s.role}</span>
                <blockquote>“{s.storyText}”</blockquote>
              </figcaption>
            </figure>
          ))}
          <p className={styles.note}>{t('storyConsent')}</p>
        </>
      )}
    </section>
  );
}
