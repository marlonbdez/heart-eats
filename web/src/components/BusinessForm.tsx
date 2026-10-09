'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { submitBusinessTeam } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import { isSmallTeam } from '@/lib/team';
import type {
  ConsentBy,
  DisabilityType,
  Team,
  TeamArea,
  TeamLevel,
} from '@/lib/types';
import { isEmail } from '@/lib/validation';
import { TeamBlock } from './TeamBlock';
import s from './Form.module.css';

const STEPS = 4;
const MAX_STORIES = 3;
const LEVELS: TeamLevel[] = ['minimal', 'medium', 'full'];
const AREAS: TeamArea[] = ['kitchen', 'dining', 'bar', 'workshop', 'delivery'];
const TYPES: DisabilityType[] = [
  'hearing_impairment',
  'visual_impairment',
  'physical_disability',
  'intellectual_disability',
  'mental_health',
  'autism_spectrum',
  'other',
];

export interface PlaceOption {
  slug: string;
  name: string;
  neighborhood?: string;
}

interface StoryState {
  name: string;
  role: string;
  text: string;
  consentBy: ConsentBy;
  consent: boolean;
}
interface FormState {
  slug: string;
  level: TeamLevel | '';
  total: string;
  withDisability: string;
  areas: TeamArea[];
  types: DisabilityType[];
  stories: StoryState[];
  email: string;
  ack: boolean;
  website: string; // honeypot
}

const emptyStory: StoryState = {
  name: '',
  role: '',
  text: '',
  consentBy: 'self',
  consent: false,
};
const initial: FormState = {
  slug: '',
  level: '',
  total: '',
  withDisability: '',
  areas: [],
  types: [],
  stories: [emptyStory],
  email: '',
  ack: false,
  website: '',
};

const toInt = (v: string) => (/^\d+$/.test(v.trim()) ? Number(v) : NaN);
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const toggle = <T,>(list: T[], item: T) =>
  list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

// `initialSlug`: el local ya elegido, cuando se llega desde su ficha.
export function BusinessForm({
  places,
  initialSlug,
}: {
  places: PlaceOption[];
  initialSlug?: string;
}) {
  const t = useTranslations('business');
  const tTeam = useTranslations('team');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    ...initial,
    slug: initialSlug ?? '',
  });
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'error' | 'done'>(
    'idle',
  );
  const isDone = status === 'done';
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Al cambiar de paso o terminar, el foco va al título para lectores de pantalla.
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, isDone]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: false }));
  };
  const setStory = (i: number, patch: Partial<StoryState>) => {
    set(
      'stories',
      form.stories.map((st, j) => (j === i ? { ...st, ...patch } : st)),
    );
    setErrors((e) => ({ ...e, [`story${i}`]: false }));
  };

  const place = places.find((p) => p.slug === form.slug);
  const total = toInt(form.total);
  const withDisability = toInt(form.withDisability);
  const small = total >= 1 && isSmallTeam(total);
  // En equipos pequeños solo se cuenta la cifra (ver effectiveTeamLevel).
  const level: TeamLevel = small || !form.level ? 'minimal' : form.level;

  const storyIsComplete = (st: StoryState) =>
    Boolean(st.name.trim() && st.role.trim() && st.text.trim() && st.consent);

  // Lo que se enviará y lo que se ve en la vista previa: lo mismo.
  const buildTeam = (): Team => ({
    level,
    summary: { totalStaff: total, staffWithDisability: withDisability },
    ...(level !== 'minimal' && {
      areas: form.areas,
      disabilityTypes: form.types,
    }),
    ...(level === 'full' && {
      stories: form.stories.map((st) => ({
        displayName: st.name.trim(),
        role: st.role.trim(),
        storyText: st.text.trim(),
      })),
    }),
  });

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    if (step === 1 && !place) next.slug = true;
    if (step === 2 && !form.level) next.level = true;
    if (step === 3) {
      if (!(total >= 1)) next.total = true;
      if (!(withDisability >= 1 && withDisability <= total))
        next.withDisability = true;
      if (level === 'full')
        form.stories.forEach((st, i) => {
          if (!storyIsComplete(st)) next[`story${i}`] = true;
        });
    }
    if (step === 4) {
      if (!isEmail(form.email.trim())) next.email = true;
      if (!form.ack) next.ack = true;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = async () => {
    setStatus('sending');
    const team = buildTeam();
    try {
      await submitBusinessTeam({
        restaurantSlug: form.slug,
        level: team.level,
        summary: team.summary,
        areas: team.areas,
        disabilityTypes: team.disabilityTypes,
        stories: team.stories?.map((st, i) => ({
          ...st,
          consentBy: form.stories[i].consentBy,
        })),
        contactEmail: form.email.trim(),
        website: form.website,
      });
      setStatus('done');
    } catch {
      setStatus('error');
    }
  };

  const next = () => {
    if (!validate()) return;
    if (step === STEPS) void send();
    else setStep(step + 1);
  };

  const reset = () => {
    setForm(initial);
    setErrors({});
    setStep(1);
    setStatus('idle');
  };

  if (isDone) {
    return (
      <main id="contenido" className={s.main}>
        <div className={s.done}>
          <span className={s.heart} aria-hidden="true">
            ♥
          </span>
          <h1 ref={headingRef} tabIndex={-1}>
            {t('done.title')}
          </h1>
          <p>{t('done.body', { name: place?.name ?? '' })}</p>
          <Link href="/" className={`${s.btn} ${s.primary} ${s.backLink}`}>
            {t('done.back')}
          </Link>
          <button type="button" className={s.linkButton} onClick={reset}>
            {t('done.again')}
          </button>
        </div>
      </main>
    );
  }

  const lastStep = step === STEPS;
  const sending = status === 'sending';
  const guarantees = t.raw('s1.guarantees') as string[];
  const showDetails = level !== 'minimal';

  return (
    <main id="contenido" className={s.main}>
      <h1
        ref={headingRef}
        tabIndex={-1}
        style={{ fontSize: '1.4rem', margin: '8px 0' }}
      >
        {t('title')}
      </h1>
      <p className={s.progressText}>
        {t('stepOf', { n: step, total: STEPS })} · {t(`steps.${step}`)}
      </p>
      <div
        className={s.bar}
        role="progressbar"
        aria-label={t('stepOf', { n: step, total: STEPS })}
        aria-valuemin={0}
        aria-valuemax={STEPS}
        aria-valuenow={step}
      >
        <div
          className={s.barFill}
          style={{ width: `${(step / STEPS) * 100}%` }}
        />
      </div>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          next();
        }}
      >
        {step === 1 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s1.intro')}</p>
            <ul className={s.list}>
              {guarantees.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
            <div className={s.field}>
              <label htmlFor="b-place" className={s.label}>
                {t('s1.place')}
              </label>
              <select
                id="b-place"
                className={`${s.input} ${errors.slug ? s.invalid : ''}`}
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                aria-invalid={errors.slug || undefined}
                aria-describedby={errors.slug ? 'e-place' : undefined}
              >
                <option value="">{t('s1.placeholder')}</option>
                {places.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.neighborhood ? `${p.name} · ${p.neighborhood}` : p.name}
                  </option>
                ))}
              </select>
              {errors.slug && (
                <p id="e-place" role="alert" className={s.error}>
                  {t('s1.placeError')}
                </p>
              )}
            </div>
            <p className={s.small}>
              {t('s1.notListed')}{' '}
              <Link href="/propose">{t('s1.notListedLink')}</Link>
            </p>
          </div>
        )}

        {step === 2 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s2.intro')}</p>
            <fieldset
              className={s.options}
              aria-describedby={errors.level ? 'e-level' : undefined}
            >
              <legend className={s.label}>{t('s2.question')}</legend>
              {LEVELS.map((l) => (
                <label key={l} className={s.check}>
                  <input
                    type="radio"
                    name="level"
                    value={l}
                    checked={form.level === l}
                    onChange={() => set('level', l)}
                  />
                  <span className={s.optionText}>
                    <span className={s.tag}>{t(`levels.${l}.tag`)}</span>
                    <strong>{t(`levels.${l}.title`)}</strong>
                    <span className={s.small}>
                      {t('s2.preview', { example: t(`levels.${l}.example`) })}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            {errors.level && (
              <p id="e-level" role="alert" className={s.error}>
                {t('s2.error')}
              </p>
            )}
          </div>
        )}

        {step === 3 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s3.intro')}</p>
            <div className={s.grid}>
              <div className={s.field}>
                <label htmlFor="b-total" className={s.label}>
                  {t('s3.total')}
                </label>
                <input
                  id="b-total"
                  className={`${s.input} ${errors.total ? s.invalid : ''}`}
                  inputMode="numeric"
                  maxLength={3}
                  value={form.total}
                  onChange={(e) =>
                    set('total', e.target.value.replace(/\D/g, ''))
                  }
                  aria-invalid={errors.total || undefined}
                  aria-describedby={errors.total ? 'e-total' : undefined}
                />
              </div>
              <div className={s.field}>
                <label htmlFor="b-dis" className={s.label}>
                  {t('s3.withDisability')}
                </label>
                <input
                  id="b-dis"
                  className={`${s.input} ${errors.withDisability ? s.invalid : ''}`}
                  inputMode="numeric"
                  maxLength={3}
                  value={form.withDisability}
                  onChange={(e) =>
                    set('withDisability', e.target.value.replace(/\D/g, ''))
                  }
                  aria-invalid={errors.withDisability || undefined}
                  aria-describedby={errors.withDisability ? 'e-dis' : undefined}
                />
              </div>
            </div>
            {errors.total && (
              <p id="e-total" role="alert" className={s.error}>
                {t('s3.totalError')}
              </p>
            )}
            {errors.withDisability && (
              <p id="e-dis" role="alert" className={s.error}>
                {t('s3.withDisabilityError')}
              </p>
            )}

            {small && form.level !== 'minimal' && (
              <p className={s.note}>{t('s3.smallTeam')}</p>
            )}

            {showDetails && (
              <>
                <div className={s.field}>
                  <div className={s.label}>
                    {t('s3.areas')}{' '}
                    <span className={s.optional}>{t('s3.optional')}</span>
                  </div>
                  <div
                    role="group"
                    aria-label={t('s3.areasGroup')}
                    className={s.chips}
                  >
                    {AREAS.map((a) => (
                      <button
                        key={a}
                        type="button"
                        className={s.chip}
                        aria-pressed={form.areas.includes(a)}
                        onClick={() => set('areas', toggle(form.areas, a))}
                      >
                        {capitalize(tTeam(`areaNames.${a}`))}
                      </button>
                    ))}
                  </div>
                </div>
                <div className={s.field}>
                  <div className={s.label}>
                    {t('s3.types')}{' '}
                    <span className={s.optional}>{t('s3.typesHint')}</span>
                  </div>
                  <div
                    role="group"
                    aria-label={t('s3.typesGroup')}
                    className={s.chips}
                  >
                    {TYPES.map((c) => (
                      <button
                        key={c}
                        type="button"
                        className={s.chip}
                        aria-pressed={form.types.includes(c)}
                        onClick={() => set('types', toggle(form.types, c))}
                      >
                        {capitalize(tTeam(`categories.${c}`))}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {level === 'full' && (
              <>
                <h2 className={s.sectionTitle}>{t('s3.stories')}</h2>
                <p className={s.intro}>{t('s3.storiesIntro')}</p>
                {form.stories.map((st, i) => (
                  <div key={i} className={s.card}>
                    <p className={s.cardTitle}>
                      {t('s3.person', { n: i + 1 })}
                    </p>
                    <label htmlFor={`p${i}n`} className={s.label}>
                      {t('s3.name')}
                    </label>
                    <input
                      id={`p${i}n`}
                      className={s.input}
                      value={st.name}
                      onChange={(e) => setStory(i, { name: e.target.value })}
                      autoComplete="off"
                    />
                    <label htmlFor={`p${i}r`} className={s.label}>
                      {t('s3.role')}
                    </label>
                    <input
                      id={`p${i}r`}
                      className={s.input}
                      value={st.role}
                      onChange={(e) => setStory(i, { role: e.target.value })}
                      autoComplete="off"
                    />
                    <label htmlFor={`p${i}t`} className={s.label}>
                      {t('s3.story')}
                    </label>
                    <textarea
                      id={`p${i}t`}
                      rows={4}
                      maxLength={2000}
                      className={s.textarea}
                      value={st.text}
                      onChange={(e) => setStory(i, { text: e.target.value })}
                    />
                    <fieldset className={s.options}>
                      <legend className={s.label}>{t('s3.who')}</legend>
                      {(['self', 'legal_representative'] as const).map((w) => (
                        <label key={w} className={s.check}>
                          <input
                            type="radio"
                            name={`who${i}`}
                            value={w}
                            checked={st.consentBy === w}
                            onChange={() => setStory(i, { consentBy: w })}
                          />
                          <span>
                            {t(w === 'self' ? 's3.self' : 's3.representative')}
                          </span>
                        </label>
                      ))}
                    </fieldset>
                    <label className={s.check}>
                      <input
                        type="checkbox"
                        checked={st.consent}
                        onChange={(e) =>
                          setStory(i, { consent: e.target.checked })
                        }
                      />
                      <span>
                        {t(
                          st.consentBy === 'self'
                            ? 's3.consentSelf'
                            : 's3.consentRepresentative',
                        )}
                      </span>
                    </label>
                    {errors[`story${i}`] && (
                      <p role="alert" className={s.error}>
                        {t('s3.storyError')}
                      </p>
                    )}
                    {form.stories.length > 1 && (
                      <button
                        type="button"
                        className={s.linkButton}
                        onClick={() =>
                          set(
                            'stories',
                            form.stories.filter((_, j) => j !== i),
                          )
                        }
                      >
                        {t('s3.remove')}
                      </button>
                    )}
                  </div>
                ))}
                {form.stories.length < MAX_STORIES && (
                  <button
                    type="button"
                    className={s.dashed}
                    onClick={() =>
                      set('stories', [...form.stories, emptyStory])
                    }
                  >
                    {t('s3.add')}
                  </button>
                )}
                <p className={s.small}>{t('s3.consentNote')}</p>
              </>
            )}
          </div>
        )}

        {step === 4 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s4.intro')}</p>
            <div className={s.field}>
              <p className={s.label}>{place?.name}</p>
              <TeamBlock team={buildTeam()} level={level} />
            </div>
            <div className={s.field}>
              <label htmlFor="b-mail" className={s.label}>
                {t('s4.email')}
              </label>
              <input
                id="b-mail"
                type="email"
                className={`${s.input} ${errors.email ? s.invalid : ''}`}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                aria-invalid={errors.email || undefined}
                aria-describedby={`h-mail${errors.email ? ' e-mail' : ''}`}
                autoComplete="email"
              />
              <p id="h-mail" className={s.small}>
                {t('s4.emailHint')}
              </p>
              {errors.email && (
                <p id="e-mail" role="alert" className={s.error}>
                  {t('s4.emailError')}
                </p>
              )}
            </div>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={form.ack}
                onChange={(e) => set('ack', e.target.checked)}
                aria-describedby={errors.ack ? 'e-ack' : undefined}
              />
              <span>{t('s4.ack')}</span>
            </label>
            {errors.ack && (
              <p id="e-ack" role="alert" className={s.error}>
                {t('s4.ackError')}
              </p>
            )}
            <p className={s.small}>
              {t('s4.consent')} <Link href="/privacy">{t('s4.privacy')}</Link>
            </p>
            {/* Honeypot antispam: invisible para personas y lectores de pantalla */}
            <div className={s.honeypot} aria-hidden="true">
              <label>
                Web
                <input
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => set('website', e.target.value)}
                />
              </label>
            </div>
            {status === 'error' && (
              <p role="alert" className={s.error}>
                {t('sendError')}
              </p>
            )}
          </div>
        )}

        <div className={s.actions}>
          {step > 1 && (
            <button
              type="button"
              className={`${s.btn} ${s.secondary}`}
              onClick={() => setStep(step - 1)}
              disabled={sending}
            >
              {t('prev')}
            </button>
          )}
          <button
            type="submit"
            className={`${s.btn} ${s.primary}`}
            disabled={sending}
          >
            {sending
              ? t('sending')
              : lastStep
                ? t('send')
                : step === 1
                  ? t('start')
                  : t('next')}
          </button>
        </div>
      </form>
    </main>
  );
}
