'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import { isRateLimited } from '@/lib/api';
import { photoUploads } from '@/lib/features';
import { submitProposal } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import type { FoodTag } from '@/lib/types';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import type { PreparedPhoto } from '@/lib/image';
import { isEmail, isHttpUrl } from '@/lib/validation';
import { PhotoConsent } from './PhotoConsent';
import { PhotoPicker } from './PhotoPicker';
import s from './Form.module.css';

const MAX_DISHES = 3;
const OTHER = 'other';
const DRAFT_KEY = 'hearteats:draft-propose';

interface Dish {
  name: string;
  description: string;
  // Foto ya reducida y su vista previa. No se guarda en el borrador.
  photo?: PreparedPhoto;
}
interface FormState {
  name: string;
  street: string;
  city: string;
  postalCode: string;
  foods: string[];
  dishes: Dish[];
  howKnown: string;
  evidenceUrl: string;
  independent: boolean;
  email: string;
  photoConsent: boolean; // permiso para usar las fotos
  website: string; // honeypot
}

const initial: FormState = {
  name: '',
  street: '',
  city: 'Madrid',
  postalCode: '',
  foods: [],
  dishes: [{ name: '', description: '' }],
  howKnown: '',
  evidenceUrl: '',
  independent: false,
  email: '',
  photoConsent: false,
  website: '',
};

// Lo que se guarda del borrador: nunca el correo (privado), el honeypot ni las
// fotos (ni el permiso, que va con ellas).
type DraftForm = Omit<
  FormState,
  'email' | 'website' | 'photoConsent' | 'dishes'
> & { dishes: { name: string; description: string }[] };
interface Draft {
  form: DraftForm;
  step: number;
}

const isPristine = (f: FormState) =>
  JSON.stringify({ ...f, email: '', website: '', photoConsent: false }) ===
  JSON.stringify(initial);

// Un borrador viejo o a medias no debe romper el formulario.
function sanitizeDraft(d: Draft | null): Draft | null {
  if (!d || typeof d !== 'object' || !d.form) return null;
  const f = d.form;
  const str = (v: unknown, fallback = '') =>
    typeof v === 'string' ? v : fallback;
  const dishes: { name: string; description: string }[] = Array.isArray(
    f.dishes,
  )
    ? f.dishes.slice(0, MAX_DISHES).map((x) => ({
        name: str(x?.name),
        description: str(x?.description),
      }))
    : [];
  return {
    step: d.step >= 1 && d.step <= 4 ? Math.floor(d.step) : 1,
    form: {
      name: str(f.name),
      street: str(f.street),
      city: str(f.city, 'Madrid'),
      postalCode: str(f.postalCode),
      foods: Array.isArray(f.foods)
        ? f.foods.filter((k) => typeof k === 'string')
        : [],
      dishes: dishes.length ? dishes : initial.dishes,
      howKnown: str(f.howKnown),
      evidenceUrl: str(f.evidenceUrl),
      independent: f.independent === true,
    },
  };
}

export function ProposeForm({ foodTags }: { foodTags: FoodTag[] }) {
  const t = useTranslations('propose');
  const tSubmit = useTranslations('submit');
  const locale = useLocale() === 'en' ? 'en' : 'es';
  const tFood = useTranslations('foodTags');
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(initial);
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  const [status, setStatus] = useState<
    'idle' | 'sending' | 'error' | 'limited' | 'done'
  >('idle');
  const [sentName, setSentName] = useState('');
  // Aviso de la última foto que no se pudo usar, por plato.
  const [photoErrors, setPhotoErrors] = useState<Record<number, string>>({});
  const isDone = status === 'done';
  // «loaded» evita guardar el formulario vacío antes de leer el borrador.
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const first = useRef(true);

  // Recuperar el borrador guardado, una vez, ya en el navegador.
  useEffect(() => {
    const draft = sanitizeDraft(loadDraft<Draft>(DRAFT_KEY));
    if (draft) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({ ...initial, ...draft.form });
      setStep(draft.step);
      setRestored(true);
    }
    setLoaded(true);
  }, []);

  // Guardar el borrador mientras se escribe (sin correo). Si el formulario
  // vuelve a estar vacío o ya se envió, no queda nada guardado.
  useEffect(() => {
    if (!loaded) return;
    if (status === 'done' || isPristine(form)) {
      clearDraft(DRAFT_KEY);
      return;
    }
    const timer = setTimeout(() => {
      const { email, website, photoConsent, dishes, ...rest } = form;
      void email;
      void website;
      void photoConsent;
      saveDraft<Draft>(DRAFT_KEY, {
        form: {
          ...rest,
          dishes: dishes.map((d) => ({
            name: d.name,
            description: d.description,
          })),
        },
        step,
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [form, step, status, loaded]);

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
  const setDish = (i: number, patch: Partial<Dish>) =>
    set(
      'dishes',
      form.dishes.map((d, j) => (j === i ? { ...d, ...patch } : d)),
    );
  const hasPhotos = form.dishes.some((d) => d.photo);
  const toggleFood = (key: string) =>
    set(
      'foods',
      form.foods.includes(key)
        ? form.foods.filter((k) => k !== key)
        : [...form.foods, key],
    );

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    if (step === 1 && !form.name.trim()) next.name = true;
    if (step === 2 && hasPhotos && !form.photoConsent) next.photoConsent = true;
    if (step === 3) {
      const url = form.evidenceUrl.trim();
      if (url && !isHttpUrl(url)) next.evidenceUrl = true;
    }
    if (step === 4) {
      const mail = form.email.trim();
      if (mail && !isEmail(mail)) next.email = true;
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const send = async () => {
    setStatus('sending');
    const clean = (v: string) => v.trim() || undefined;
    try {
      await submitProposal({
        name: form.name.trim(),
        street: clean(form.street),
        city: clean(form.city) ?? 'Madrid',
        postalCode: clean(form.postalCode),
        foodTags: form.foods,
        dishes: form.dishes
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name.trim(),
            description: clean(d.description),
            photo: d.photo?.blob,
          })),
        howKnown: clean(form.howKnown),
        evidenceUrl: clean(form.evidenceUrl),
        independent: form.independent,
        contactEmail: clean(form.email),
        website: form.website,
        locale,
      });
      setSentName(form.name.trim());
      setStatus('done');
    } catch (err) {
      setStatus(isRateLimited(err) ? 'limited' : 'error');
    }
  };

  const next = () => {
    if (!validate()) return;
    if (step === 4) void send();
    else setStep(step + 1);
  };

  const releasePhotos = () =>
    form.dishes.forEach((d) => d.photo && URL.revokeObjectURL(d.photo.url));

  const discardDraft = () => {
    clearDraft(DRAFT_KEY);
    releasePhotos();
    setPhotoErrors({});
    setForm(initial);
    setErrors({});
    setStep(1);
    setRestored(false);
  };

  const reset = () => {
    releasePhotos();
    setPhotoErrors({});
    setForm(initial);
    setErrors({});
    setStep(1);
    setStatus('idle');
  };

  if (status === 'done') {
    return (
      <main id="contenido" className={s.main}>
        <div className={s.done}>
          <span className={s.heart} aria-hidden="true">
            ♥
          </span>
          <h1 ref={headingRef} tabIndex={-1}>
            {t('done.title')}
          </h1>
          <p>{t('done.body', { name: sentName || t('s4.summaryFallback') })}</p>
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

  const foodOptions = [
    ...foodTags.map((f) => ({
      key: f.key,
      label: `${f.icon} ${tFood(f.key)}`,
      plain: tFood(f.key),
    })),
    { key: OTHER, label: t('s1.other'), plain: t('s1.other') },
  ];
  const foodSummary = form.foods
    .map((k) => foodOptions.find((o) => o.key === k)?.plain)
    .filter(Boolean)
    .join(' · ');
  const lastStep = step === 4;
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
      {restored && (
        <p role="status" className={s.note}>
          {t('draft.restored')}{' '}
          <button type="button" className={s.linkButton} onClick={discardDraft}>
            {t('draft.clear')}
          </button>
        </p>
      )}
      <p className={s.progressText}>
        {t('stepOf', { n: step })} · {t(`steps.${step}`)}
      </p>
      <div
        className={s.bar}
        role="progressbar"
        aria-label={t('stepOf', { n: step })}
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={step}
      >
        <div className={s.barFill} style={{ width: `${step * 25}%` }} />
      </div>
      <p className={s.small}>{t('draft.note')}</p>

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
            <div className={s.field}>
              <label htmlFor="f-nombre" className={s.label}>
                {t('s1.name')}
              </label>
              <input
                id="f-nombre"
                className={`${s.input} ${errors.name ? s.invalid : ''}`}
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                aria-invalid={errors.name || undefined}
                aria-describedby={errors.name ? 'e-nombre' : undefined}
                autoComplete="off"
              />
              {errors.name && (
                <p id="e-nombre" role="alert" className={s.error}>
                  {t('s1.nameError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="f-dir" className={s.label}>
                {t('s1.street')}
              </label>
              <input
                id="f-dir"
                className={s.input}
                placeholder={t('s1.streetHint')}
                value={form.street}
                onChange={(e) => set('street', e.target.value)}
                autoComplete="off"
              />
            </div>
            <div className={s.grid}>
              <div className={s.field}>
                <label htmlFor="f-ciudad" className={s.label}>
                  {t('s1.city')}
                </label>
                <input
                  id="f-ciudad"
                  className={s.input}
                  value={form.city}
                  onChange={(e) => set('city', e.target.value)}
                />
              </div>
              <div className={s.field}>
                <label htmlFor="f-cp" className={s.label}>
                  {t('s1.postalCode')}
                </label>
                <input
                  id="f-cp"
                  className={s.input}
                  inputMode="numeric"
                  maxLength={5}
                  value={form.postalCode}
                  onChange={(e) =>
                    set('postalCode', e.target.value.replace(/\D/g, ''))
                  }
                />
              </div>
            </div>
            <div className={s.field}>
              <div className={s.label}>
                {t('s1.food')}{' '}
                <span className={s.optional}>{t('s1.foodHint')}</span>
              </div>
              <div
                role="group"
                aria-label={t('s1.foodGroup')}
                className={s.chips}
              >
                {foodOptions.map((o) => (
                  <button
                    key={o.key}
                    type="button"
                    className={s.chip}
                    aria-pressed={form.foods.includes(o.key)}
                    onClick={() => toggleFood(o.key)}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s2.intro')}</p>
            {form.dishes.map((d, i) => (
              <div key={i} className={s.card}>
                <p className={s.cardTitle}>{t('s2.dish', { n: i + 1 })}</p>
                <label htmlFor={`d${i}n`} className={s.label}>
                  {t('s2.dishName')}
                </label>
                <input
                  id={`d${i}n`}
                  className={s.input}
                  value={d.name}
                  onChange={(e) => setDish(i, { name: e.target.value })}
                />
                <label htmlFor={`d${i}d`} className={s.label}>
                  {t('s2.dishDesc')}{' '}
                  <span className={s.optional}>{t('s2.optional')}</span>
                </label>
                <input
                  id={`d${i}d`}
                  className={s.input}
                  maxLength={160}
                  value={d.description}
                  onChange={(e) => setDish(i, { description: e.target.value })}
                />
                {photoUploads && (
                  <PhotoPicker
                    id={`d${i}p`}
                    label={t('s2.photo')}
                    alt={t('s2.photoAlt', { n: i + 1 })}
                    photo={d.photo}
                    error={photoErrors[i]}
                    describedBy="s2-photo-hint"
                    onChange={(photo) => setDish(i, { photo })}
                    onError={(e) =>
                      setPhotoErrors((all) => ({ ...all, [i]: e }))
                    }
                  />
                )}
              </div>
            ))}
            {form.dishes.length < MAX_DISHES && (
              <button
                type="button"
                className={s.dashed}
                onClick={() =>
                  set('dishes', [...form.dishes, { name: '', description: '' }])
                }
              >
                {t('s2.add')}
              </button>
            )}
            {photoUploads && (
              <p id="s2-photo-hint" className={s.note}>
                {t('s2.photoHint')}
              </p>
            )}
            {hasPhotos && (
              <PhotoConsent
                id="s2-photo-consent"
                checked={form.photoConsent}
                error={errors.photoConsent}
                onChange={(v) => set('photoConsent', v)}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s3.intro')}</p>
            <div className={s.field}>
              <label htmlFor="f-como" className={s.label}>
                {t('s3.how')}
              </label>
              <textarea
                id="f-como"
                rows={3}
                className={s.textarea}
                placeholder={t('s3.howHint')}
                value={form.howKnown}
                onChange={(e) => set('howKnown', e.target.value)}
              />
            </div>
            <div className={s.field}>
              <label htmlFor="f-enlace" className={s.label}>
                {t('s3.link')}{' '}
                <span className={s.optional}>{t('s3.linkHint')}</span>
              </label>
              <input
                id="f-enlace"
                type="url"
                className={`${s.input} ${errors.evidenceUrl ? s.invalid : ''}`}
                placeholder="https://"
                value={form.evidenceUrl}
                onChange={(e) => set('evidenceUrl', e.target.value)}
                aria-invalid={errors.evidenceUrl || undefined}
                aria-describedby={errors.evidenceUrl ? 'e-enlace' : undefined}
              />
              {errors.evidenceUrl && (
                <p id="e-enlace" role="alert" className={s.error}>
                  {t('s3.linkError')}
                </p>
              )}
            </div>
            <label className={s.check}>
              <input
                type="checkbox"
                checked={form.independent}
                onChange={(e) => set('independent', e.target.checked)}
              />
              <span>{t('s3.indep')}</span>
            </label>
            <p className={s.note}>
              <strong>{t('s3.noteStrong')}</strong>
              {t('s3.note')}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className={s.step}>
            <p className={s.intro}>{t('s4.intro')}</p>
            <div className={s.field}>
              <label htmlFor="f-mail" className={s.label}>
                {t('s4.email')}{' '}
                <span className={s.optional}>{t('s2.optional')}</span>
              </label>
              <input
                id="f-mail"
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
                  {t('s4.emailError')}
                </p>
              )}
            </div>
            <div className={s.card}>
              <p className={s.label}>{t('s4.summary')}</p>
              <p className={s.summary}>
                {form.name.trim() || t('s4.summaryFallback')}
                <br />
                <span>{foodSummary || t('s4.noFood')}</span>
                {hasPhotos && (
                  <>
                    <br />
                    <span>
                      {t('s4.photos', {
                        count: form.dishes.filter((d) => d.photo).length,
                      })}
                    </span>
                  </>
                )}
              </p>
            </div>
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
            {(status === 'error' || status === 'limited') && (
              <p role="alert" className={s.error}>
                {status === 'limited' ? tSubmit('limited') : t('sendError')}
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
