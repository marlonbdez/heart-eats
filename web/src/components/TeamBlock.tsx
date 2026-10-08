import { useFormatter, useTranslations } from 'next-intl';
import type { Team, TeamLevel } from '@/lib/types';
import styles from './RestaurantDetail.module.css';

// "El Equipo" en tres niveles: cifras · áreas y tipos · historias con nombre.
// Quien lo usa decide el nivel (ver effectiveTeamLevel en lib/team.ts); aquí
// solo se pinta. También sirve para la vista previa de F3.
export function TeamBlock({ team, level }: { team: Team; level: TeamLevel }) {
  const t = useTranslations('team');
  const format = useFormatter();
  const { totalStaff, staffWithDisability } = team.summary;
  const areas = team.areas ?? [];
  const types = team.disabilityTypes ?? [];

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

      {level !== 'minimal' && (areas.length > 0 || types.length > 0) && (
        <ul className={styles.teamDetails}>
          {areas.length > 0 && (
            <li>
              {t('areas', {
                list: format.list(areas.map((a) => t(`areaNames.${a}`))),
              })}
            </li>
          )}
          {types.length > 0 && (
            <li>
              {t('types', {
                list: format.list(types.map((c) => t(`categories.${c}`))),
              })}
            </li>
          )}
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
