'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/i18n/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { saveLanguage } from '@/lib/language';
import { TranslateIcon } from './Icons';
import styles from './SettingSwitch.module.css';

// El idioma, con su nombre, en el menú lateral. Cada idioma se escribe en su
// propio idioma. Cambia de idioma sin perder la búsqueda (?q, ?food), que solo
// se conoce en el navegador, y lo recuerda para la próxima visita.
export function LanguageSwitch() {
  const t = useTranslations();
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  const choose = (code: Locale) => {
    saveLanguage(code);
    if (code === locale) return;
    router.replace(`${pathname}${window.location.search}`, { locale: code });
  };

  return (
    <fieldset className={styles.group}>
      <legend className={styles.legend}>
        <TranslateIcon size={20} />
        {t('header.language')}
      </legend>
      <div className={styles.options}>
        {routing.locales.map((code) => (
          <label key={code} className={styles.option} lang={code}>
            <input
              type="radio"
              name="language"
              className={styles.input}
              checked={code === locale}
              onChange={() => choose(code)}
            />
            <span className={styles.text}>{t(`languages.${code}`)}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
