'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';
import { isRateLimited } from '@/lib/api';
import { photoUploads } from '@/lib/features';
import { submitProposal } from '@/lib/data';
import { Link } from '@/i18n/navigation';
import { countryOptions, isPostalCode } from '@/lib/countries';
import type { FoodTag, LatLng } from '@/lib/types';
import { clearDraft, loadDraft, saveDraft } from '@/lib/draft';
import type { PreparedPhoto } from '@/lib/image';
import { isEmail, isHttpUrl, isPlaceText } from '@/lib/validation';
import { PhotoConsent } from './PhotoConsent';
import { PhotoPicker } from './PhotoPicker';
import { PinPickerLoader } from './PinPickerLoader';
import { SlowNotice } from './SlowNotice';
import { Spinner } from './Spinner';
import s from './Form.module.css';

const MAX_DISHES = 3;
const MAX_PHOTOS = 5;
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
  country: string; // código ISO; vacío hasta que se elige
  location: LatLng | null; // el pin que coloca en el mapa
  postalCode: string;
  foods: string[];
  dishes: Dish[];
  // Fotos del local, ya reducidas. No se guardan en el borrador.
  photos: PreparedPhoto[];
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
  city: '',
  country: '',
  location: null,
  postalCode: '',
  foods: [],
  dishes: [{ name: '', description: '' }],
  photos: [],
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
  'email' | 'website' | 'photoConsent' | 'dishes' | 'photos'
> & { dishes: { name: string; description: string }[] };
interface Draft {
  form: DraftForm;
  step: number;
}

const isPristine = (f: FormState) =>
  JSON.stringify({
    ...f,
    dishes: f.dishes.map(({ name, description }) => ({ name, description })),
    photos: [],
    email: '',
    website: '',
    photoConsent: false,
  }) === JSON.stringify(initial);

const validPin = (v: unknown): LatLng | null => {
  const { lat, lng } = (v ?? {}) as Partial<LatLng>;
  return typeof lat === 'number' &&
    typeof lng === 'number' &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
    ? { lat, lng }
    : null;
};

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
      city: str(f.city),
      country: /^[A-Z]{2}$/.test(str(f.country)) ? str(f.country) : '',
      location: validPin(f.location),
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
  const [mapOpen, setMapOpen] = useState(false);
  const countryRef = useRef<HTMLSelectElement>(null);
  // Aviso de la última foto que no se pudo usar, por plato (y 'venue', las del local).
  const [photoErrors, setPhotoErrors] = useState<Record<string, string>>({});
  const isDone = status === 'done';
  // «loaded» evita guardar el formulario vacío antes de leer el borrador.
  const [loaded, setLoaded] = useState(false);
  const [restored, setRestored] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const countries = useMemo(() => countryOptions(locale), [locale]);
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
      const { email, website, photoConsent, dishes, photos, ...rest } = form;
      void email;
      void website;
      void photoConsent;
      void photos;
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
  const photoCount =
    form.dishes.filter((d) => d.photo).length + form.photos.length;
  const hasPhotos = photoCount > 0;
  const toggleFood = (key: string) =>
    set(
      'foods',
      form.foods.includes(key)
        ? form.foods.filter((k) => k !== key)
        : [...form.foods, key],
    );

  const validate = (): boolean => {
    const next: Record<string, boolean> = {};
    if (step === 1) {
      if (!form.name.trim()) next.name = true;
      if (!form.country) next.country = true;
      if (!isPlaceText(form.city, 2)) next.city = true;
      if (!isPlaceText(form.street, 3)) next.street = true;
      const code = form.postalCode.trim();
      if (code && form.country && !isPostalCode(code, form.country)) {
        next.postalCode = true;
      }
    }
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
        city: form.city.trim(),
        country: form.country,
        location: form.location ?? undefined,
        postalCode: clean(form.postalCode),
        foodTags: form.foods,
        dishes: form.dishes
          .filter((d) => d.name.trim())
          .map((d) => ({
            name: d.name.trim(),
            description: clean(d.description),
            photo: d.photo,
          })),
        photos: form.photos,
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

  const releasePhotos = () => {
    form.dishes.forEach((d) => d.photo && URL.revokeObjectURL(d.photo.url));
    form.photos.forEach((p) => URL.revokeObjectURL(p.url));
  };

  const discardDraft = () => {
    clearDraft(DRAFT_KEY);
    releasePhotos();
    setPhotoErrors({});
    setForm(initial);
    setMapOpen(false);
    setErrors({});
    setStep(1);
    setRestored(false);
  };

  const reset = () => {
    releasePhotos();
    setPhotoErrors({});
    setForm(initial);
    setMapOpen(false);
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
  const placeSummary = [
    form.street.trim(),
    form.city.trim(),
    countries.find((c) => c.code === form.country)?.name,
  ]
    .filter(Boolean)
    .join(', ');
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
              <label htmlFor="f-pais" className={s.label}>
                {t('s1.country')}
              </label>
              <select
                id="f-pais"
                ref={countryRef}
                className={`${s.input} ${errors.country ? s.invalid : ''}`}
                value={form.country}
                onChange={(e) => {
                  // Otro país: el pin de antes ya no vale.
                  setForm((f) => ({
                    ...f,
                    country: e.target.value,
                    location: null,
                  }));
                  setErrors((er) => ({ ...er, country: false }));
                }}
                aria-invalid={errors.country || undefined}
                aria-describedby={errors.country ? 'e-pais' : undefined}
                autoComplete="country"
              >
                <option value="">{t('s1.countryChoose')}</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.country && (
                <p id="e-pais" role="alert" className={s.error}>
                  {t('s1.countryError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="f-dir" className={s.label}>
                {t('s1.street')}
              </label>
              <input
                id="f-dir"
                className={`${s.input} ${errors.street ? s.invalid : ''}`}
                placeholder={t('s1.streetHint')}
                value={form.street}
                onChange={(e) => set('street', e.target.value)}
                aria-invalid={errors.street || undefined}
                aria-describedby={errors.street ? 'e-dir' : undefined}
                autoComplete="off"
              />
              {errors.street && (
                <p id="e-dir" role="alert" className={s.error}>
                  {t('s1.streetError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="f-ciudad" className={s.label}>
                {t('s1.city')}
              </label>
              <input
                id="f-ciudad"
                className={`${s.input} ${errors.city ? s.invalid : ''}`}
                value={form.city}
                onChange={(e) => set('city', e.target.value)}
                aria-invalid={errors.city || undefined}
                aria-describedby={errors.city ? 'e-ciudad' : undefined}
                autoComplete="off"
              />
              {errors.city && (
                <p id="e-ciudad" role="alert" className={s.error}>
                  {t('s1.cityError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <label htmlFor="f-cp" className={s.label}>
                {t('s1.postalCode')}{' '}
                <span className={s.optional}>{t('s2.optional')}</span>
              </label>
              <input
                id="f-cp"
                className={`${s.input} ${errors.postalCode ? s.invalid : ''}`}
                maxLength={10}
                value={form.postalCode}
                onChange={(e) => set('postalCode', e.target.value)}
                aria-invalid={errors.postalCode || undefined}
                aria-describedby={errors.postalCode ? 'e-cp' : undefined}
                autoComplete="postal-code"
              />
              {errors.postalCode && (
                <p id="e-cp" role="alert" className={s.error}>
                  {t('s1.postalCodeError')}
                </p>
              )}
            </div>
            <div className={s.field}>
              <div className={s.label}>
                {t('s1.pin.title')}{' '}
                <span className={s.optional}>{t('s2.optional')}</span>
              </div>
              <p className={s.small}>{t('s1.pin.hint')}</p>
              {mapOpen ? (
                <PinPickerLoader
                  country={form.country}
                  value={form.location}
                  onChange={(location) => set('location', location)}
                />
              ) : (
                <>
                  {form.location && (
                    <p role="status" className={s.small}>
                      {t('s1.pin.placedShort')}
                    </p>
                  )}
                  <div>
                    <button
                      type="button"
                      className={`${s.btn} ${s.secondary}`}
                      onClick={() => {
                        if (!form.country) {
                          setErrors((e) => ({ ...e, country: true }));
                          countryRef.current?.focus();
                          return;
                        }
                        setMapOpen(true);
                      }}
                    >
                      {form.location ? t('s1.pin.edit') : t('s1.pin.open')}
                    </button>
                  </div>
                </>
              )}
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
            {photoUploads && (
              <div className={s.card}>
                <h2 className={s.cardTitle}>{t('s2.venueTitle')}</h2>
                <p id="s2-venue-hint" className={s.small}>
                  {t('s2.venueHint')}
                </p>
                {form.photos.map((photo, i) => (
                  <PhotoPicker
                    key={photo.url}
                    id={`v-photo-${i}`}
                    label={t('s2.venuePhoto', { n: i + 1 })}
                    alt={t('s2.venueAlt', { n: i + 1 })}
                    photo={photo}
                    onChange={() =>
                      set(
                        'photos',
                        form.photos.filter((_, j) => j !== i),
                      )
                    }
                    onError={() => undefined}
                  />
                ))}
                {form.photos.length < MAX_PHOTOS && (
                  <PhotoPicker
                    id="v-photo-new"
                    label={t('s2.venuePhoto', { n: form.photos.length + 1 })}
                    alt=""
                    error={photoErrors.venue}
                    describedBy="s2-venue-hint"
                    onChange={(photo) =>
                      photo && set('photos', [...form.photos, photo])
                    }
                    onError={(e) =>
                      setPhotoErrors((all) => ({ ...all, venue: e }))
                    }
                  />
                )}
              </div>
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
                <span>{placeSummary}</span>
                <br />
                <span>{foodSummary || t('s4.noFood')}</span>
                {hasPhotos && (
                  <>
                    <br />
                    <span>{t('s4.photos', { count: photoCount })}</span>
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
            aria-busy={sending}
          >
            {sending && <Spinner />}
            {sending ? t('sending') : lastStep ? t('send') : t('next')}
          </button>
        </div>
        <SlowNotice active={sending} kind="send" className={s.small} />
      </form>
    </main>
  );
}
