'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { submitRemoval } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import type { RemovalWhat } from '@/lib/types';
import { isEmail } from '@/lib/validation';
import type { PlaceOption } from './BusinessForm';
import s from './Form.module.css';

const STEPS = 3;
const WHATS: RemovalWhat[] = ['story', 'photo', 'listing', 'data'];

interface FormState {
  what: RemovalWhat | null;
  slug: string;
  details: string;
  email: string;
  website: string; // honeypot
}

const initial: FormState = {
  what: null,
  slug: '',
  details: '',
  email: '',
  website: '',
};

// Pedir que se retire una historia, una foto o una ficha, o ejercer un derecho
// sobre los propios datos. No hace falta cuenta ni justificarlo; sí un correo,
// para confirmar que quien lo pide es quien dice ser antes de ocultar nada.
export function RemovalForm({ places }: { places: PlaceOption[] }) {
  const t = useTranslations('removal');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
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

  const place = places.find((p) => p.slug === form.slug);

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    if (step === 1 && !form.what) next.what = true;
    if (step === 2 && !place) next.slug = true;
    if (step === 3 && !isEmail(form.email.trim())) next.email = true;
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = async () => {
    if (!form.what) return;
    setStatus('sending');
    try {
      await submitRemoval({
        restaurantSlug: form.slug,
        what: form.what,
        details: form.details.trim() || undefined,
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
          <p>{t('done.body')}</p>
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
            <fieldset
              className={s.options}
              aria-describedby={errors.what ? 'e-what' : undefined}
            >
              <legend className={s.label}>{t('s1.question')}</legend>
              {WHATS.map((w) => (
                <label key={w} className={s.check}>
                  <input
                    type="radio"
                    name="what"
                    value={w}
                    checked={form.what === w}
                    onChange={() => set('what', w)}
                  />
                  <span>{t(`whats.${w}`)}</span>
                </label>
              ))}
            </fieldset>
            {errors.what && (
              <p id="e-what" role="alert" className={s.error}>
                {t('s1.error')}
              </p>
            )}
          </div>
        )}

        {step === 2 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s2.intro')}</p>
            <div className={s.field}>
              <label htmlFor="r-place" className={s.label}>
                {t('s2.place')}
              </label>
              <select
                id="r-place"
                className={`${s.input} ${errors.slug ? s.invalid : ''}`}
                value={form.slug}
                onChange={(e) => set('slug', e.target.value)}
                aria-invalid={errors.slug || undefined}
                aria-describedby={errors.slug ? 'e-place' : undefined}
              >
                <option value="">{t('s2.placeholder')}</option>
                {places.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.neighborhood ? `${p.name} · ${p.neighborhood}` : p.name}
                  </option>
                ))}
              </select>
              {errors.slug && (
                <p id="e-place" role="alert" className={s.error}>
                  {t('s2.placeError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="r-details" className={s.label}>
                {t('s2.details')}{' '}
                <span className={s.optional}>{t('optional')}</span>
              </label>
              <textarea
                id="r-details"
                rows={4}
                className={s.textarea}
                value={form.details}
                onChange={(e) => set('details', e.target.value)}
                aria-describedby="h-details"
              />
              <p id="h-details" className={s.small}>
                {t('s2.detailsHint')}
              </p>
            </div>
          </div>
        )}

        {step === 3 && form.what && (
          <div className={s.step}>
            <p className={s.intro}>{t('s3.intro')}</p>
            <div className={s.field}>
              <label htmlFor="r-mail" className={s.label}>
                {t('s3.email')}
              </label>
              <input
                id="r-mail"
                type="email"
                className={`${s.input} ${errors.email ? s.invalid : ''}`}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                aria-invalid={errors.email || undefined}
                aria-describedby={`h-mail${errors.email ? ' e-mail' : ''}`}
                autoComplete="email"
              />
              <p id="h-mail" className={s.small}>
                {t('s3.emailHint')}
              </p>
              {errors.email && (
                <p id="e-mail" role="alert" className={s.error}>
                  {t('s3.emailError')}
                </p>
              )}
            </div>
            <div className={s.card}>
              <p className={s.label}>{t('s3.summary')}</p>
              <p className={s.summary}>
                {place?.name}
                <br />
                <span>{t(`whats.${form.what}`)}</span>
              </p>
            </div>
            <p className={s.small}>
              {t('s3.consent')} <Link href="/privacy">{t('s3.privacy')}</Link>
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
            {sending ? t('sending') : lastStep ? t('send') : t('next')}
          </button>
        </div>
      </form>
    </main>
  );
}
