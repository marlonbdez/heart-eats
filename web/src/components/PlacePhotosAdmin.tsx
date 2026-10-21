'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ApiRequestError } from '@/lib/api';
import {
  MAX_GALLERY_PHOTOS,
  addPlacePhoto,
  getRestaurant,
  removePlacePhoto,
  searchPlaces,
  setPhotoAlt,
  setPhotoCover,
  type PhotoAlt,
} from '@/lib/data';
import { countryName } from '@/lib/countries';
import { PHOTO_TYPES, preparePhoto, type PreparedPhoto } from '@/lib/image';
import { loadRegions } from '@/lib/regions';
import type { PlacePhoto, RegionCountry, Restaurant } from '@/lib/types';
import { useLoad } from '@/lib/use-load';
import { Remote } from './Remote';
import form from './Form.module.css';
import styles from './Moderation.module.css';

type Notice = 'altSaved' | 'covered' | 'removed' | 'added';

// Las fotos de un local ya publicado: buscarlo, y añadir, poner de portada,
// describir o retirar sus fotos. Lo que se sube aquí se publica al momento
// (docs/02_API_SPEC.md, `/restaurants/:slug/photos`).
export function PlacePhotosAdmin({
  defaultCountry,
  initialSlug,
}: {
  defaultCountry?: string;
  // Abre directamente las fotos de este local (desde una solicitud).
  initialSlug?: string;
}) {
  const regions = useLoad(loadRegions);
  const [slug, setSlug] = useState<string | null>(initialSlug ?? null);
  return (
    <Remote state={regions}>
      {(countries) =>
        slug ? (
          <PlacePhotos slug={slug} onBack={() => setSlug(null)} />
        ) : (
          <PlaceSearch
            countries={countries}
            defaultCountry={defaultCountry}
            onPick={setSlug}
          />
        )
      }
    </Remote>
  );
}

function PlaceSearch({
  countries,
  defaultCountry,
  onPick,
}: {
  countries: RegionCountry[];
  defaultCountry?: string;
  onPick: (slug: string) => void;
}) {
  const t = useTranslations('moderation.photos');
  const locale = useLocale();
  const [country, setCountry] = useState(
    countries.find((c) => c.code === defaultCountry)?.code ??
      countries[0]?.code ??
      '',
  );
  const [q, setQ] = useState('');
  const [results, setResults] = useState<Restaurant[] | null>(null);
  const [state, setState] = useState<'idle' | 'searching' | 'error'>('idle');

  async function search(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) return;
    setState('searching');
    try {
      setResults(await searchPlaces(country, q.trim()));
      setState('idle');
    } catch {
      setState('error');
    }
  }

  if (countries.length === 0) {
    return <p className={styles.empty}>{t('noRegions')}</p>;
  }
  return (
    <div className={styles.admin}>
      <h2>{t('title')}</h2>
      <p className={styles.meta}>{t('intro')}</p>
      <form onSubmit={search} className={styles.invite} noValidate>
        <div className={form.field}>
          <label className={form.label} htmlFor="photos-country">
            {t('country')}
          </label>
          <select
            id="photos-country"
            className={form.input}
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              setResults(null);
            }}
          >
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {countryName(c.code, locale)}
              </option>
            ))}
          </select>
        </div>
        <div className={form.field}>
          <label className={form.label} htmlFor="photos-q">
            {t('name')}
          </label>
          <input
            id="photos-q"
            className={form.input}
            autoComplete="off"
            maxLength={100}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        {state === 'error' && (
          <p role="alert" className={form.error}>
            {t('errors.search')}
          </p>
        )}
        <button
          type="submit"
          className={`${form.btn} ${form.primary}`}
          disabled={state === 'searching'}
        >
          {state === 'searching' ? t('searching') : t('search')}
        </button>
      </form>
      {results && (
        <div role="status">
          {results.length === 0 ? (
            <p className={styles.empty}>{t('noResults')}</p>
          ) : (
            <ul className={styles.items}>
              {results.map((r) => (
                <li key={r.slug}>
                  <button
                    type="button"
                    className={styles.item}
                    onClick={() => onPick(r.slug)}
                  >
                    <span className={styles.itemName}>{r.name}</span>
                    <span className={styles.itemMeta}>
                      {r.address.street} · {r.address.city}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function PlacePhotos({ slug, onBack }: { slug: string; onBack: () => void }) {
  const t = useTranslations('moderation.photos');
  const place = useLoad(getRestaurant, slug);
  return (
    <Remote state={place}>
      {(loaded) =>
        loaded ? (
          <PhotoEditor initial={loaded} onBack={onBack} />
        ) : (
          <div className={styles.admin}>
            <p role="alert" className={form.error}>
              {t('errors.missing')}
            </p>
            <button
              type="button"
              className={`${form.btn} ${form.secondary}`}
              onClick={onBack}
            >
              {t('back')}
            </button>
          </div>
        )
      }
    </Remote>
  );
}

function PhotoEditor({
  initial,
  onBack,
}: {
  initial: Restaurant;
  onBack: () => void;
}) {
  const t = useTranslations('moderation.photos');
  const [place, setPlace] = useState(initial);
  const [notice, setNotice] = useState<Notice | null>(null);
  const title = useRef<HTMLHeadingElement>(null);
  const gallery = useRef<HTMLHeadingElement>(null);
  const photos = place.photos ?? [];
  const hintId = useId();

  useEffect(() => title.current?.focus(), []);

  // Tras cada cambio se vuelve a pedir la ficha: así se ve el orden real.
  async function changed(done: Notice, focusGallery = false) {
    const fresh = await getRestaurant(place.slug);
    if (!fresh) throw new Error('missing');
    setPlace(fresh);
    setNotice(done);
    if (focusGallery) setTimeout(() => gallery.current?.focus());
  }

  return (
    <div className={styles.admin}>
      <button
        type="button"
        className={`${form.linkButton} ${styles.backButton}`}
        onClick={onBack}
      >
        {t('back')}
      </button>
      <h2 ref={title} tabIndex={-1}>
        {place.name}
      </h2>
      <p role="status" className={styles.result}>
        {notice ? t(`notices.${notice}`) : ''}
      </p>
      <h3 ref={gallery} tabIndex={-1}>
        {t('galleryTitle', { n: photos.length, max: MAX_GALLERY_PHOTOS })}
      </h3>
      <p id={hintId} className={styles.meta}>
        {t('altHint')}
      </p>
      {photos.length === 0 ? (
        <p className={styles.meta}>{t('empty')}</p>
      ) : (
        <ul className={styles.items}>
          {photos.map((photo, i) => (
            <PhotoItem
              key={photo.url}
              slug={place.slug}
              photo={photo}
              n={i + 1}
              hintId={hintId}
              onChanged={changed}
            />
          ))}
        </ul>
      )}
      {photos.length < MAX_GALLERY_PHOTOS ? (
        <AddPhoto
          slug={place.slug}
          hintId={hintId}
          hasPhotos={photos.length > 0}
          onAdded={() => changed('added')}
        />
      ) : (
        <p className={styles.meta}>{t('full', { max: MAX_GALLERY_PHOTOS })}</p>
      )}
    </div>
  );
}

const altOf = (photo: PlacePhoto): PhotoAlt => ({
  es: photo.alt?.es ?? '',
  en: photo.alt?.en ?? '',
});

// Lo escrito en los dos idiomas, sin los vacíos; sin nada, se borra el texto.
function altToSend(alt: PhotoAlt): PhotoAlt | null {
  const es = alt.es?.trim();
  const en = alt.en?.trim();
  return es || en ? { ...(es && { es }), ...(en && { en }) } : null;
}

function AltFields({
  id,
  hintId,
  alt,
  onChange,
}: {
  id: string;
  hintId: string; // la pista que explica qué escribir, una vez para toda la pantalla
  alt: PhotoAlt;
  onChange: (alt: PhotoAlt) => void;
}) {
  const t = useTranslations('moderation.photos');
  return (
    <>
      <div className={form.field}>
        <label className={form.label} htmlFor={`${id}-es`}>
          {t('altEs')}
        </label>
        <input
          id={`${id}-es`}
          className={form.input}
          maxLength={160}
          autoComplete="off"
          aria-describedby={hintId}
          value={alt.es ?? ''}
          onChange={(e) => onChange({ ...alt, es: e.target.value })}
        />
      </div>
      <div className={form.field}>
        <label className={form.label} htmlFor={`${id}-en`}>
          {t('altEn')}
        </label>
        <input
          id={`${id}-en`}
          className={form.input}
          maxLength={160}
          autoComplete="off"
          aria-describedby={hintId}
          value={alt.en ?? ''}
          onChange={(e) => onChange({ ...alt, en: e.target.value })}
        />
      </div>
    </>
  );
}

function PhotoItem({
  slug,
  photo,
  n,
  hintId,
  onChanged,
}: {
  slug: string;
  photo: PlacePhoto;
  n: number;
  hintId: string;
  onChanged: (done: Notice, focusGallery?: boolean) => Promise<void>;
}) {
  const t = useTranslations('moderation.photos');
  const locale = useLocale();
  const id = useId();
  const [alt, setAlt] = useState(altOf(photo));
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(
    action: () => Promise<void>,
    done: Notice,
    focusGallery = false,
  ) {
    setBusy(true);
    setFailed(false);
    try {
      await action();
      await onChanged(done, focusGallery);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={styles.person}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.thumbUrl}
        alt={photo.alt?.[locale] ?? t('photoN', { n })}
        className={styles.photoThumb}
      />
      <span className={styles.itemHead}>
        <span className={styles.itemName}>{t('photoN', { n })}</span>
        {n === 1 && <span className={styles.tag}>{t('cover')}</span>}
      </span>
      <AltFields id={id} hintId={hintId} alt={alt} onChange={setAlt} />
      {failed && (
        <p role="alert" className={form.error}>
          {t('errors.change')}
        </p>
      )}
      <div className={styles.photoActions}>
        <button
          type="button"
          className={`${form.btn} ${form.secondary}`}
          disabled={busy}
          aria-label={t('saveAltLabel', { n })}
          onClick={() =>
            run(() => setPhotoAlt(slug, photo.url, altToSend(alt)), 'altSaved')
          }
        >
          {busy ? t('saving') : t('saveAlt')}
        </button>
        {n > 1 && (
          <button
            type="button"
            className={`${form.btn} ${form.secondary}`}
            disabled={busy}
            aria-label={t('makeCoverLabel', { n })}
            onClick={() =>
              run(() => setPhotoCover(slug, photo.url), 'covered', true)
            }
          >
            {t('makeCover')}
          </button>
        )}
        {!confirming && (
          <button
            type="button"
            className={`${form.btn} ${form.secondary}`}
            disabled={busy}
            aria-label={t('removeLabel', { n })}
            onClick={() => setConfirming(true)}
          >
            {t('remove')}
          </button>
        )}
      </div>
      {confirming && (
        <div className={styles.confirmRow}>
          <p className={styles.meta}>{t('confirmAsk', { n })}</p>
          <button
            type="button"
            className={`${form.btn} ${form.primary}`}
            disabled={busy}
            onClick={() =>
              run(() => removePlacePhoto(slug, photo.url), 'removed', true)
            }
          >
            {busy ? t('saving') : t('confirm')}
          </button>
          <button
            type="button"
            className={`${form.btn} ${form.secondary}`}
            disabled={busy}
            onClick={() => setConfirming(false)}
          >
            {t('cancel')}
          </button>
        </div>
      )}
    </li>
  );
}

function AddPhoto({
  slug,
  hintId,
  hasPhotos,
  onAdded,
}: {
  slug: string;
  hintId: string;
  hasPhotos: boolean;
  onAdded: () => Promise<void>;
}) {
  const t = useTranslations('moderation.photos');
  const tp = useTranslations('photo');
  const id = useId();
  const [photo, setPhoto] = useState<PreparedPhoto>();
  const [alt, setAlt] = useState<PhotoAlt>({ es: '', en: '' });
  const [cover, setCover] = useState(!hasPhotos);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Cambia al terminar para vaciar el campo de archivo.
  const [round, setRound] = useState(0);

  async function choose(file?: File) {
    if (!file) return;
    setError(null);
    const result = await preparePhoto(file);
    if ('error' in result) return setError(result.error);
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(result.photo);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!photo) return setError('none');
    setBusy(true);
    setError(null);
    try {
      await addPlacePhoto(slug, photo, {
        alt: altToSend(alt) ?? undefined,
        cover,
      });
      await onAdded();
      URL.revokeObjectURL(photo.url);
      setPhoto(undefined);
      setAlt({ es: '', en: '' });
      setCover(false);
      setRound((r) => r + 1);
    } catch (err) {
      setError(
        err instanceof ApiRequestError && err.code === 'too_many_photos'
          ? 'tooMany'
          : 'add',
      );
    } finally {
      setBusy(false);
    }
  }

  const known = ['photoType', 'photoSize', 'photoFailed'];
  return (
    <form onSubmit={submit} noValidate className={styles.invite}>
      <h3>{t('addTitle')}</h3>
      <p className={styles.meta}>{t('addHint')}</p>
      <div className={form.field}>
        <label className={form.label} htmlFor={`${id}-file`}>
          {t('file')}
        </label>
        <input
          key={round}
          id={`${id}-file`}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          className={form.fileInput}
          aria-describedby={error ? `${id}-error` : undefined}
          onChange={(e) => void choose(e.target.files?.[0])}
        />
      </div>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.url} alt={t('preview')} className={form.photoPreview} />
      )}
      <AltFields id={id} hintId={hintId} alt={alt} onChange={setAlt} />
      {hasPhotos && (
        <label className={form.check}>
          <input
            type="checkbox"
            checked={cover}
            onChange={(e) => setCover(e.target.checked)}
          />
          <span>{t('coverCheck')}</span>
        </label>
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={form.error}>
          {known.includes(error) ? tp(error) : t(`errors.${error}`)}
        </p>
      )}
      <button
        type="submit"
        className={`${form.btn} ${form.primary}`}
        disabled={busy}
      >
        {busy ? t('saving') : t('add')}
      </button>
    </form>
  );
}
