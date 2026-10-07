'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { submitCorrection } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import type { CorrectionKind } from '@/lib/types';
import { isEmail, isHttpUrl } from '@/lib/validation';
import s from './Form.module.css';

const STEPS = 3;
const KINDS: CorrectionKind[] = ['address', 'hours', 'closed', 'team', 'other'];

interface FormState {
  kind: CorrectionKind | null;
  details: string;
  evidenceUrl: string;
  email: string;
  website: string; // honeypot
}

const initial: FormState = {
  kind: null,
  details: '',
  evidenceUrl: '',
  email: '',
  website: '',
};

export function CorrectForm({
  slug,
  placeName,
}: {
  slug: string;
  placeName: string;
}) {
  const t = useTranslations('correct');
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

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    if (step === 1 && !form.kind) next.kind = true;
    if (step === 2) {
      if (!form.details.trim()) next.details = true;
      const url = form.evidenceUrl.trim();
      if (url && !isHttpUrl(url)) next.evidenceUrl = true;
    }
    if (step === 3) {
      const mail = form.email.trim();
      if (mail && !isEmail(mail)) next.email = true;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = async () => {
    if (!form.kind) return;
    setStatus('sending');
    const clean = (v: string) => v.trim() || undefined;
    try {
      await submitCorrection({
        restaurantSlug: slug,
        kind: form.kind,
        details: form.details.trim(),
        evidenceUrl: clean(form.evidenceUrl),
        contactEmail: clean(form.email),
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
          <p>{t('done.body', { name: placeName })}</p>
          <Link
            href={`/place/${slug}`}
            className={`${s.btn} ${s.primary} ${s.backLink}`}
          >
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
      <p className={s.small}>
        <Link href={`/place/${slug}`}>
          <span aria-hidden="true">←</span> {t('backToPlace')}
        </Link>
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        style={{ fontSize: '1.4rem', margin: '8px 0' }}
      >
        {t('title')}
      </h1>
      <p className={s.label}>{placeName}</p>
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
              aria-describedby={errors.kind ? 'e-kind' : undefined}
            >
              <legend className={s.label}>{t('s1.question')}</legend>
              {KINDS.map((k) => (
                <label key={k} className={s.check}>
                  <input
                    type="radio"
                    name="kind"
                    value={k}
                    checked={form.kind === k}
                    onChange={() => set('kind', k)}
                  />
                  <span>{t(`kinds.${k}`)}</span>
                </label>
              ))}
            </fieldset>
            {errors.kind && (
              <p id="e-kind" role="alert" className={s.error}>
                {t('s1.error')}
              </p>
            )}
          </div>
        )}

        {step === 2 && form.kind && (
          <div className={s.step}>
            <p className={s.intro}>{t('s2.intro')}</p>
            <div className={s.field}>
              <label htmlFor="c-details" className={s.label}>
                {t('s2.details')}
              </label>
              <textarea
                id="c-details"
                rows={4}
                className={`${s.textarea} ${errors.details ? s.invalid : ''}`}
                placeholder={t(`s2.hints.${form.kind}`)}
                value={form.details}
                onChange={(e) => set('details', e.target.value)}
                aria-invalid={errors.details || undefined}
                aria-describedby={errors.details ? 'e-details' : undefined}
              />
              {errors.details && (
                <p id="e-details" role="alert" className={s.error}>
                  {t('s2.detailsError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="c-link" className={s.label}>
                {t('s2.link')}{' '}
                <span className={s.optional}>{t('s2.linkHint')}</span>
              </label>
              <input
                id="c-link"
                type="url"
                className={`${s.input} ${errors.evidenceUrl ? s.invalid : ''}`}
                placeholder="https://"
                value={form.evidenceUrl}
                onChange={(e) => set('evidenceUrl', e.target.value)}
                aria-invalid={errors.evidenceUrl || undefined}
                aria-describedby={errors.evidenceUrl ? 'e-link' : undefined}
              />
              {errors.evidenceUrl && (
                <p id="e-link" role="alert" className={s.error}>
                  {t('s2.linkError')}
                </p>
              )}
            </div>
            <p className={s.note}>
              <strong>{t('s2.noteStrong')}</strong>
              {t('s2.note')}
            </p>
          </div>
        )}

        {step === 3 && form.kind && (
          <div className={s.step}>
            <p className={s.intro}>{t('s3.intro')}</p>
            <div className={s.field}>
              <label htmlFor="c-mail" className={s.label}>
                {t('s3.email')}{' '}
                <span className={s.optional}>{t('s3.optional')}</span>
              </label>
              <input
                id="c-mail"
                type="email"
                className={`${s.input} ${errors.email ? s.invalid : ''}`}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                aria-invalid={errors.email || undefined}
                aria-describedby={errors.email ? 'e-mail' : undefined}
                autoComplete="email"
              />
              {errors.email && (
                <p id="e-mail" role="alert" className={s.error}>
                  {t('s3.emailError')}
                </p>
              )}
            </div>
            <div className={s.card}>
              <p className={s.label}>{t('s3.summary')}</p>
              <p className={s.summary}>
                {placeName}
                <br />
                <span>{t(`kinds.${form.kind}`)}</span>
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
