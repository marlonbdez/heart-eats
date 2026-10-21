'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { ApiRequestError } from '@/lib/api';
import { countryName } from '@/lib/countries';
import type {
  CorrectionChange,
  ModerationDecision,
  ModerationItem,
  ModerationPhoto,
  ModerationSession,
  RejectReason,
  VerificationLevel,
  VerificationMethod,
} from '@/lib/types';
import form from './Form.module.css';
import { HoursFields, hoursFromDraft, type HoursDraft } from './HoursFields';
import styles from './Moderation.module.css';

const CHECKS_NEW = ['exists', 'independent', 'inclusive', 'owner'] as const;
const CHECKS_EDIT = ['correct'] as const;
const CHECKS_TEAM = ['teamOwner', 'teamFigures'] as const;
const CHECK_TEAM_STORIES = 'teamConsents';
const CHECK_PHOTOS = 'photos';
const CHECK_TEAM_PHOTOS = 'teamPhotos';
const CHECKS_REMOVAL = ['removalIdentity'] as const;
// Una foto en cuarentena que Moderación revisa: de un plato o del local, o la
// de una persona del equipo (`person` es su nombre).
type ShownPhoto = ModerationPhoto & { person?: string };
const LEVELS: VerificationLevel[] = ['admin', 'community'];
const METHODS: VerificationMethod[] = [
  'visit',
  'call',
  'documentation',
  'owner_confirmed',
];
const REASONS: RejectReason[] = [
  'not_independent',
  'no_evidence',
  'duplicate',
  'out_of_zone',
  'other',
];

interface Props {
  item: ModerationItem;
  role: ModerationSession['role'];
  decision?: ModerationDecision; // la que se acaba de tomar desde esta pantalla
  // Se está pidiendo el detalle (pin y avisos), que el servidor calcula al abrirla.
  loading?: boolean;
  onBack: () => void;
  onDecide: (decision: ModerationDecision) => Promise<void>;
  // Abre las fotos de un local en la sección «Fotos» (para retirar una).
  onOpenPhotos?: (slug: string) => void;
}

// Qué mensaje enseñar según lo que contestó el servidor.
function errorKey(err: unknown) {
  if (!(err instanceof ApiRequestError)) return 'save';
  if (err.status === 403) return 'forbidden';
  if (err.status === 501) return 'notImplemented';
  switch (err.code) {
    case 'conflict':
    case 'already_resolved':
      return 'conflict';
    case 'geocoding_required':
    case 'country_required':
      return 'geocodingRequired';
    case 'proposal_incomplete':
      return 'incomplete';
    case 'no_contact':
      return 'noContact';
    case 'info_already_requested':
      return 'alreadyAsked';
    case 'mail_failed':
      return 'mailFailed';
    case 'target_unavailable':
      return 'targetGone';
    case 'story_not_found':
      return 'storyNotFound';
    case 'too_many_stories':
      return 'tooManyStories';
    default:
      return 'save';
  }
}

const num = (value: string) => (value.trim() === '' ? NaN : Number(value));

export function ModerationDetail({
  item,
  role,
  decision,
  loading = false,
  onBack,
  onDecide,
  onOpenPhotos,
}: Props) {
  const locale = useLocale();
  const t = useTranslations('moderation');
  const tCard = useTranslations('card');
  const tFood = useTranslations('foodTags');
  const tKinds = useTranslations('correct.kinds');
  const tTeam = useTranslations('team');
  const tRemoval = useTranslations('removal');
  const tBusiness = useTranslations('business.levels');
  const isNew = item.kind === 'new';
  const isTeam = item.kind === 'team';
  // Claves de los textos que cambian según el tipo de solicitud.
  const isRemoval = item.kind === 'removal';
  const k = isNew ? 'New' : isTeam ? 'Team' : isRemoval ? 'Removal' : 'Edit';
  // Las fotos de las personas del equipo, que solo ve un administrador al abrir
  // la solicitud (con las historias).
  const storyPhotos: ShownPhoto[] = (item.team?.storyTexts ?? []).flatMap(
    (st) => (st.photo ? [{ ...st.photo, person: st.displayName }] : []),
  );
  const photos: ShownPhoto[] = isNew
    ? (item.photos ?? [])
    : isTeam
      ? storyPhotos
      : [];
  const checkKeys: readonly string[] = isNew
    ? item.photos?.length
      ? [...CHECKS_NEW, CHECK_PHOTOS]
      : CHECKS_NEW
    : isTeam
      ? [
          ...CHECKS_TEAM,
          ...(item.team && item.team.stories > 0 ? [CHECK_TEAM_STORIES] : []),
          ...(storyPhotos.length > 0 ? [CHECK_TEAM_PHOTOS] : []),
        ]
      : isRemoval
        ? CHECKS_REMOVAL
        : CHECKS_EDIT;

  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [level, setLevel] = useState<VerificationLevel | null>(null);
  const [method, setMethod] = useState<VerificationMethod | null>(null);
  const [mode, setMode] = useState<'reject' | 'info' | null>(null);
  const [reason, setReason] = useState<RejectReason | null>(null);
  const [note, setNote] = useState('');
  const [pin, setPin] = useState({ lat: '', lng: '' });
  const [story, setStory] = useState('');
  // Fotos (de un local nuevo o de las personas de un equipo) que no se publican.
  const [skipped, setSkipped] = useState<string[]>([]);
  const [change, setChange] = useState({
    name: '',
    street: '',
    postalCode: '',
    city: '',
    closed: false,
    hours: false,
  });
  const [hours, setHours] = useState<HoursDraft>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const resultRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  const isStoryRemoval = isRemoval && item.removal?.what === 'story';
  // Una foto se retira desde «Fotos» y un derecho sobre datos se atiende por
  // correo: aquí solo se marca como atendida.
  const removalWhat = isRemoval ? item.removal?.what : undefined;
  const isHandledRemoval = removalWhat === 'photo' || removalWhat === 'data';
  const waiting = item.status === 'info_requested';
  // Solo un administrador decide lo que toca a personas del equipo (ADR 0008).
  const adminOnly = (isTeam || isRemoval) && role !== 'admin';
  const outcome = decision
    ? decision.action === 'approve'
      ? 'approved'
      : decision.action === 'reject'
        ? 'rejected'
        : 'info'
    : item.status === 'approved'
      ? 'approved'
      : item.status === 'rejected'
        ? 'rejected'
        : undefined;

  const allChecked = checkKeys.every((k) => checks[k]);
  const ready = allChecked && (!isNew || (level !== null && method !== null));

  // El cambio de una corrección, solo con lo que se haya rellenado. Devuelve
  // la clave del error si lo escrito no vale.
  function buildChange(): CorrectionChange | 'badPin' | 'badHours' {
    const clean = (v: string) => v.trim() || undefined;
    const address = {
      street: clean(change.street),
      postalCode: clean(change.postalCode),
      city: clean(change.city),
    };
    const hasAddress = Object.values(address).some(Boolean);
    const lat = num(pin.lat);
    const lng = num(pin.lng);
    const hasPin = pin.lat.trim() !== '' || pin.lng.trim() !== '';
    if (hasPin && !(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
      return 'badPin';
    }
    const openingHours = change.hours ? hoursFromDraft(hours) : undefined;
    if (openingHours === 'incomplete' || openingHours?.length === 0) {
      return 'badHours';
    }
    return {
      ...(clean(change.name) ? { name: clean(change.name) } : {}),
      ...(hasAddress ? { address } : {}),
      ...(hasPin ? { location: { lat, lng } } : {}),
      ...(openingHours ? { openingHours } : {}),
      ...(change.closed ? { closed: true as const } : {}),
    };
  }

  async function submit(d: ModerationDecision) {
    setSaving(true);
    setError('');
    try {
      await onDecide(d);
      setMode(null);
      // Tras guardar, el foco va al resultado para que se anuncie.
      setTimeout(() => resultRef.current?.focus(), 0);
    } catch (err) {
      setError(t(`errors.${errorKey(err)}`));
    } finally {
      setSaving(false);
    }
  }

  function approve() {
    if (!allChecked) {
      setError(t('errors.notReady' + k));
    } else if (isNew && (!level || !method)) {
      setError(t('errors.needLevelMethod'));
    } else if (isStoryRemoval && !story) {
      setError(t('errors.needStory'));
    } else if (!isNew && !isRemoval && !isTeam) {
      const body = buildChange();
      if (typeof body === 'string') return setError(t(`errors.${body}`));
      if (Object.keys(body).length === 0) {
        return setError(t('errors.needChange'));
      }
      void submit({ action: 'approve', change: body });
    } else {
      const lat = num(pin.lat);
      const lng = num(pin.lng);
      const hasPin = pin.lat.trim() !== '' || pin.lng.trim() !== '';
      if (isNew && hasPin && !(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) {
        return setError(t('errors.badPin'));
      }
      void submit({
        action: 'approve',
        ...(isNew && level && method ? { level, method } : {}),
        ...(isNew && hasPin ? { location: { lat, lng } } : {}),
        ...(skipped.length > 0 ? { skipPhotos: skipped } : {}),
        ...(isStoryRemoval ? { storyIndex: Number(story) - 1 } : {}),
      });
    }
  }

  function confirmMode() {
    if (mode === 'reject') {
      if (!reason) return setError(t('errors.needReason'));
      void submit({
        action: 'reject',
        reason,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
    } else {
      if (!note.trim()) return setError(t('errors.needNote'));
      void submit({ action: 'ask_info', note: note.trim() });
    }
  }

  function chooseMode(next: 'reject' | 'info') {
    setMode(next);
    setError('');
  }

  function logLine(d: ModerationDecision): string {
    const name = item.name;
    if (d.action === 'reject') {
      return t('log.rejected', { name, reason: t(`reasons.${d.reason}`) });
    }
    if (d.action === 'ask_info') return t('log.info', { name });
    if (isTeam) return t('log.approvedTeam', { name });
    if (isRemoval) {
      return t(
        isHandledRemoval ? 'log.approvedRemovalHandled' : 'log.approvedRemoval',
        { name },
      );
    }
    if (!isNew || !d.level || !d.method) return t('log.approvedEdit', { name });
    return t('log.approvedNew', {
      name,
      level: tCard(d.level === 'admin' ? 'verifiedAdmin' : 'verifiedCommunity'),
      method: tCard(`methods.${d.method}`),
    });
  }

  function resultText(o: 'approved' | 'rejected' | 'info'): string {
    if (o === 'rejected') return t('result.rejected');
    if (o === 'info') return t('result.info');
    return t(
      isHandledRemoval
        ? 'result.approvedRemovalHandled'
        : 'result.approved' + k,
    );
  }

  return (
    <>
      <button type="button" className={styles.back} onClick={onBack}>
        <span aria-hidden="true">← </span>
        {t('back')}
      </button>

      <div>
        <span className={styles.tag}>{t(`kinds.${item.kind}`)}</span>
        <h2 ref={headingRef} tabIndex={-1}>
          {item.name}
        </h2>
        <p className={styles.meta}>{item.address}</p>
        <p className={styles.meta}>
          {t('received', { age: t('age', { days: item.daysAgo }) })} ·{' '}
          {t('contact', { contact: item.contactMasked ?? t('noContact') })}
        </p>
      </div>

      {item.warnings.length > 0 && (
        <div className={styles.warn} role="note">
          <p>
            <strong>
              <span aria-hidden="true">⚠ </span>
              {t('warningsTitle')}
            </strong>
          </p>
          <ul>
            {item.warnings.map((w) => (
              <li key={w.kind}>
                {w.kind === 'duplicate'
                  ? t('warnings.duplicate', {
                      other: w.other,
                      meters: w.meters,
                    })
                  : t(`warnings.${w.kind}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(item.infoRequest || item.replies) && (
        <section aria-labelledby="mod-info" className={form.step}>
          <h3 id="mod-info">{t('infoTitle')}</h3>
          {item.infoRequest && (
            <>
              <p>{item.infoRequest.note}</p>
              <p className={styles.meta}>
                {t('infoDeadline', {
                  date: new Intl.DateTimeFormat(locale, {
                    dateStyle: 'long',
                  }).format(new Date(item.infoRequest.deadline)),
                })}
              </p>
            </>
          )}
          {item.replies?.map((r) => (
            <blockquote key={r.at} className={styles.reply}>
              <p>{r.message}</p>
              <footer className={styles.meta}>
                {new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(
                  new Date(r.at),
                )}
              </footer>
            </blockquote>
          ))}
        </section>
      )}

      {item.removal ? (
        <section aria-labelledby="mod-removal" className={form.step}>
          <h3 id="mod-removal">{t('removalTitle')}</h3>
          <dl className={styles.facts}>
            <div>
              <dt>{t('removalWhat')}</dt>
              <dd>{tRemoval(`whats.${item.removal.what}`)}</dd>
            </div>
            <div>
              <dt>{t('removalDetails')}</dt>
              <dd>{item.removal.details || t('none')}</dd>
            </div>
          </dl>
          {isHandledRemoval && (
            <p className={styles.meta}>{t(`removalHelp.${removalWhat}`)}</p>
          )}
          {removalWhat === 'photo' && item.restaurantSlug && onOpenPhotos && (
            <button
              type="button"
              className={form.linkButton}
              onClick={() => onOpenPhotos(item.restaurantSlug!)}
            >
              {t('openPhotos')}
            </button>
          )}
          {item.restaurantSlug && (
            <Link
              href={`/place/${item.restaurantSlug}`}
              className={form.linkButton}
            >
              {t('seePlace')}
            </Link>
          )}
        </section>
      ) : item.team ? (
        <section aria-labelledby="mod-team" className={form.step}>
          <h3 id="mod-team">{t('teamTitle')}</h3>
          <dl className={styles.facts}>
            <div>
              <dt>{t('teamLevel')}</dt>
              <dd>{tBusiness(`${item.team.level}.title`)}</dd>
            </div>
            <div>
              <dt>{t('teamPeople')}</dt>
              <dd>
                {t('teamPeopleValue', {
                  with: item.team.staffWithDisability,
                  total: item.team.totalStaff,
                })}
              </dd>
            </div>
            {item.team.areas && item.team.areas.length > 0 && (
              <div>
                <dt>{t('teamAreas')}</dt>
                <dd>
                  {item.team.areas
                    .map((a) => tTeam(`areaNames.${a}`))
                    .join(' · ')}
                </dd>
              </div>
            )}
            {item.team.disabilityTypes &&
              item.team.disabilityTypes.length > 0 && (
                <div>
                  <dt>{t('teamTypes')}</dt>
                  <dd>
                    {item.team.disabilityTypes
                      .map((d) => tTeam(`categories.${d}`))
                      .join(' · ')}
                  </dd>
                </div>
              )}
            <div>
              <dt>{t('teamStories')}</dt>
              <dd>
                {t('teamStoriesValue', { n: item.team.stories })}{' '}
                {item.team.stories > 0 &&
                  !item.team.storyTexts &&
                  t('teamStoriesHidden')}
              </dd>
            </div>
          </dl>
          {item.team.storyTexts?.map((st) => (
            <blockquote
              key={`${st.displayName}-${st.role}`}
              className={styles.reply}
            >
              <p>{st.storyText}</p>
              <footer className={styles.meta}>
                {t('teamStoryBy', {
                  name: st.displayName,
                  role: st.role,
                  consent: t(`teamConsent.${st.consentBy}`),
                })}
              </footer>
            </blockquote>
          ))}
          {item.restaurantSlug && (
            <Link
              href={`/place/${item.restaurantSlug}`}
              className={form.linkButton}
            >
              {t('seePlace')}
            </Link>
          )}
        </section>
      ) : item.correction ? (
        <section aria-labelledby="mod-change" className={form.step}>
          <h3 id="mod-change">{t('change')}</h3>
          <p className={form.summary}>
            <strong>{tKinds(item.correction.kind)}</strong>
          </p>
          <dl className={styles.diff}>
            {item.correction.before && (
              <div className={styles.diffBox}>
                <dt className={styles.tag}>{t('before')}</dt>
                <dd style={{ margin: 0 }}>
                  <strong>{item.correction.before}</strong>
                </dd>
              </div>
            )}
            <div className={styles.diffBox}>
              <dt className={styles.tag}>
                {t(item.correction.before ? 'after' : 'proposal')}
              </dt>
              <dd style={{ margin: 0 }}>
                <strong>{item.correction.after}</strong>
              </dd>
            </div>
          </dl>
          {item.restaurantSlug && (
            <Link
              href={`/place/${item.restaurantSlug}`}
              className={form.linkButton}
            >
              {t('seePlace')}
            </Link>
          )}
        </section>
      ) : (
        <section aria-labelledby="mod-proposed" className={form.step}>
          <h3 id="mod-proposed">{t('proposed')}</h3>
          <dl className={styles.facts}>
            {item.country && (
              <div>
                <dt>{t('country')}</dt>
                <dd>{countryName(item.country, locale)}</dd>
              </div>
            )}
            <div>
              <dt>{t('food')}</dt>
              <dd>
                {item.foodTags?.map((k) => tFood(k)).join(' · ') || t('none')}
              </dd>
            </div>
            <div>
              <dt>{t('dishes')}</dt>
              <dd>{item.dishes?.join(' · ') || t('none')}</dd>
            </div>
            <div>
              <dt>{t('howKnown')}</dt>
              <dd>{item.howKnown || t('none')}</dd>
            </div>
            <div>
              <dt>{t('pin')}</dt>
              <dd>
                {item.location
                  ? `${item.location.lat.toFixed(5)}, ${item.location.lng.toFixed(5)}`
                  : loading
                    ? t('pinLoading')
                    : t('noPin')}
                {item.location && item.locationBy && (
                  <span className={styles.meta}>
                    {' · '}
                    {t(`pinBy.${item.locationBy}`)}
                  </span>
                )}
              </dd>
            </div>
            <div>
              <dt>{t('evidence')}</dt>
              <dd>
                {item.evidenceUrl ? (
                  <a
                    href={item.evidenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {item.evidenceUrl.replace(/^https?:\/\//, '')}
                  </a>
                ) : (
                  t('noLink')
                )}
              </dd>
            </div>
          </dl>
        </section>
      )}

      {photos.length > 0 && !outcome && (
        <section aria-labelledby="mod-photos" className={form.step}>
          <h3 id="mod-photos">{t('photosTitle')}</h3>
          <p className={form.note}>
            {t(isTeam ? 'teamPhotosHint' : 'photosHint')}
          </p>
          <ul className={styles.photos}>
            {photos.map((p, i) => {
              const label = p.person
                ? t('photoOfPerson', { name: p.person })
                : p.dish
                  ? t('photoOfDish', { dish: p.dish })
                  : t('photoOfPlace', {
                      n: photos.slice(0, i + 1).filter((x) => !x.dish).length,
                    });
              return (
                <li key={p.key}>
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${label}. ${t('photoOpen')}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.thumbUrl} alt="" loading="lazy" />
                  </a>
                  <label>
                    <input
                      type="checkbox"
                      checked={skipped.includes(p.key)}
                      aria-label={`${label}: ${t('photoSkip')}`}
                      onChange={(e) =>
                        setSkipped(
                          e.target.checked
                            ? [...skipped, p.key]
                            : skipped.filter((k) => k !== p.key),
                        )
                      }
                    />
                    {t('photoSkip')}
                  </label>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {outcome ? (
        <p
          ref={resultRef}
          tabIndex={-1}
          role="status"
          className={styles.result}
        >
          {resultText(outcome)}
        </p>
      ) : adminOnly ? (
        <p role="note" className={styles.warn}>
          {t('adminOnly')}
        </p>
      ) : (
        <>
          <fieldset className={form.options}>
            <legend>
              <h3>{t('checksTitle')}</h3>
            </legend>
            <div className={styles.checks}>
              {checkKeys.map((k) => (
                <label key={k} className={form.check}>
                  <input
                    type="checkbox"
                    checked={!!checks[k]}
                    onChange={(e) => {
                      setChecks({ ...checks, [k]: e.target.checked });
                      setError('');
                    }}
                  />
                  <span>{t(`checks.${k}`)}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {mode === null && k === 'Edit' && (
            <fieldset className={form.options}>
              <legend>{t('changeLegend')}</legend>
              <p className={styles.meta}>{t('changeHelp')}</p>
              {(
                [
                  ['name', 'changeName'],
                  ['street', 'changeStreet'],
                  ['postalCode', 'changePostalCode'],
                  ['city', 'changeCity'],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className={form.field}>
                  <label className={form.label} htmlFor={`mod-${field}`}>
                    {t(label)}
                  </label>
                  <input
                    id={`mod-${field}`}
                    className={form.input}
                    value={change[field]}
                    onChange={(e) => {
                      setChange({ ...change, [field]: e.target.value });
                      setError('');
                    }}
                  />
                </div>
              ))}
              <p className={styles.meta}>{t('changePinHelp')}</p>
              {(
                [
                  ['lat', 'lat'],
                  ['lng', 'lng'],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className={form.field}>
                  <label className={form.label} htmlFor={`mod-${field}`}>
                    {t(label)}
                  </label>
                  <input
                    id={`mod-${field}`}
                    className={form.input}
                    inputMode="decimal"
                    value={pin[field]}
                    onChange={(e) => {
                      setPin({ ...pin, [field]: e.target.value });
                      setError('');
                    }}
                  />
                </div>
              ))}
              <label className={form.check}>
                <input
                  type="checkbox"
                  checked={change.hours}
                  onChange={(e) => {
                    setChange({ ...change, hours: e.target.checked });
                    setError('');
                  }}
                />
                <span>{t('changeHours')}</span>
              </label>
              {change.hours && (
                <HoursFields
                  value={hours}
                  onChange={(next) => {
                    setHours(next);
                    setError('');
                  }}
                />
              )}
              <label className={form.check}>
                <input
                  type="checkbox"
                  checked={change.closed}
                  onChange={(e) => {
                    setChange({ ...change, closed: e.target.checked });
                    setError('');
                  }}
                />
                <span>{t('changeClosed')}</span>
              </label>
            </fieldset>
          )}

          {mode === null && isStoryRemoval && (
            <div className={form.field}>
              <label className={form.label} htmlFor="mod-story">
                {t('storyLabel')}
              </label>
              <select
                id="mod-story"
                className={form.input}
                value={story}
                onChange={(e) => {
                  setStory(e.target.value);
                  setError('');
                }}
              >
                <option value="">{t('storyChoose')}</option>
                {[1, 2, 3].map((n) => (
                  <option key={n} value={n}>
                    {t('storyN', { n })}
                  </option>
                ))}
              </select>
              <p className={styles.meta}>{t('storyHelp')}</p>
            </div>
          )}

          {mode === null && isNew && (
            <>
              <fieldset className={form.options}>
                <legend>{t('levelLegend')}</legend>
                {LEVELS.map((l) => (
                  <label key={l} className={form.check}>
                    <input
                      type="radio"
                      name="level"
                      checked={level === l}
                      onChange={() => {
                        setLevel(l);
                        setError('');
                      }}
                    />
                    <span>{t(`levels.${l}`)}</span>
                  </label>
                ))}
              </fieldset>
              {!item.location && !loading && (
                <div className={form.field}>
                  <p className={styles.meta}>{t('pinHelp')}</p>
                  <label className={form.label} htmlFor="mod-lat">
                    {t('lat')}
                  </label>
                  <input
                    id="mod-lat"
                    className={form.input}
                    inputMode="decimal"
                    value={pin.lat}
                    onChange={(e) => {
                      setPin({ ...pin, lat: e.target.value });
                      setError('');
                    }}
                  />
                  <label className={form.label} htmlFor="mod-lng">
                    {t('lng')}
                  </label>
                  <input
                    id="mod-lng"
                    className={form.input}
                    inputMode="decimal"
                    value={pin.lng}
                    onChange={(e) => {
                      setPin({ ...pin, lng: e.target.value });
                      setError('');
                    }}
                  />
                </div>
              )}
              <fieldset className={form.options}>
                <legend>{t('methodLegend')}</legend>
                {METHODS.map((m) => (
                  <label key={m} className={form.check}>
                    <input
                      type="radio"
                      name="method"
                      checked={method === m}
                      onChange={() => {
                        setMethod(m);
                        setError('');
                      }}
                    />
                    <span>{t(`methods.${m}`)}</span>
                  </label>
                ))}
              </fieldset>
            </>
          )}

          {mode === 'reject' && (
            <fieldset className={form.options}>
              <legend>{t('reasonLegend')}</legend>
              {REASONS.map((r) => (
                <label key={r} className={form.check}>
                  <input
                    type="radio"
                    name="reason"
                    checked={reason === r}
                    onChange={() => {
                      setReason(r);
                      setError('');
                    }}
                  />
                  <span>{t(`reasons.${r}`)}</span>
                </label>
              ))}
            </fieldset>
          )}

          {mode !== null && (
            <div className={form.field}>
              <label className={form.label} htmlFor="mod-note">
                {t(mode === 'reject' ? 'rejectNote' : 'infoNote')}
              </label>
              <textarea
                id="mod-note"
                className={form.textarea}
                rows={3}
                value={note}
                onChange={(e) => {
                  setNote(e.target.value);
                  setError('');
                }}
              />
            </div>
          )}

          {error && (
            <p role="alert" className={form.error}>
              {error}
            </p>
          )}

          {mode === null ? (
            <div className={styles.actions}>
              <button
                type="button"
                className={`${form.btn} ${form.primary} ${styles.full} ${
                  ready ? '' : styles.notReady
                }`}
                disabled={saving}
                onClick={approve}
              >
                {saving
                  ? t('saving')
                  : t(
                      isHandledRemoval
                        ? 'approveRemovalHandled'
                        : 'approve' + k,
                    )}
              </button>
              {!waiting && (
                <button
                  type="button"
                  className={`${form.btn} ${form.secondary}`}
                  onClick={() => chooseMode('info')}
                >
                  {t('askInfo')}
                </button>
              )}
              <button
                type="button"
                className={`${form.btn} ${form.secondary}`}
                onClick={() => chooseMode('reject')}
              >
                {t('reject')}
              </button>
            </div>
          ) : (
            <div className={styles.confirmRow}>
              <button
                type="button"
                className={`${form.btn} ${form.primary}`}
                disabled={saving}
                onClick={confirmMode}
              >
                {saving
                  ? t('saving')
                  : t(mode === 'reject' ? 'confirmReject' : 'confirmInfo')}
              </button>
              <button
                type="button"
                className={`${form.btn} ${form.secondary}`}
                disabled={saving}
                onClick={() => {
                  setMode(null);
                  setError('');
                }}
              >
                {t('cancel')}
              </button>
            </div>
          )}
        </>
      )}

      <section aria-labelledby="mod-audit" className={form.step}>
        <h3 id="mod-audit">{t('auditTitle')}</h3>
        <ul className={styles.log}>
          {decision && <li>{logLine(decision)}</li>}
          <li>{t('log.received')}</li>
        </ul>
      </section>
    </>
  );
}
