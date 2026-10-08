import { getTranslations } from 'next-intl/server';
import s from './ContentPage.module.css';

// Una sección de texto. En messages/<idioma>.json: <namespace>.sections.
interface Section {
  heading: string;
  paragraphs?: string[];
  items?: string[];
  ordered?: boolean; // la lista de items va numerada
}

// Página de texto (Qué es HeartEats, Cómo verificamos…): el contenido vive
// en messages/<idioma>.json bajo el namespace indicado.
export async function ContentPage({
  locale,
  namespace,
}: {
  locale: string;
  namespace: string;
}) {
  const t = await getTranslations({ locale, namespace });
  const sections = t.raw('sections') as Section[];
  return (
    <main id="contenido" tabIndex={-1} className={s.main}>
      <h1>{t('title')}</h1>
      <p className={s.intro}>{t('intro')}</p>
      {sections.map((section) => {
        const List = section.ordered ? 'ol' : 'ul';
        return (
          <section key={section.heading}>
            <h2>{section.heading}</h2>
            {section.paragraphs?.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {section.items && (
              <List>
                {section.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </List>
            )}
          </section>
        );
      })}
    </main>
  );
}
