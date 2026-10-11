'use client';

import { useTranslations } from 'next-intl';
import { PHOTO_TYPES, preparePhoto, type PreparedPhoto } from '@/lib/image';
import s from './Form.module.css';

// Campo de una foto opcional: elegir, ver la vista previa y quitarla. La foto
// se reduce en el navegador; la subida real llegará con el servidor.
export function PhotoPicker({
  id,
  label,
  alt,
  photo,
  error,
  describedBy,
  onChange,
  onError,
}: {
  id: string;
  label: string;
  alt: string;
  photo?: PreparedPhoto;
  error?: string;
  describedBy?: string; // p. ej. la pista que explica las fotos
  onChange: (photo?: PreparedPhoto) => void;
  onError: (error: string) => void;
}) {
  const t = useTranslations('photo');

  const remove = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    onChange(undefined);
  };
  const choose = async (file?: File) => {
    if (!file) return;
    onError('');
    const result = await preparePhoto(file);
    if ('error' in result) return onError(result.error);
    if (photo) URL.revokeObjectURL(photo.url);
    onChange(result.photo);
  };

  return (
    <>
      <p className={s.label} id={`${id}-label`}>
        {label} <span className={s.optional}>{t('optional')}</span>
      </p>
      {photo ? (
        <div className={s.photoRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.url} alt={alt} className={s.photoPreview} />
          <button type="button" className={s.linkButton} onClick={remove}>
            {t('remove')}
          </button>
        </div>
      ) : (
        <input
          id={id}
          type="file"
          accept={PHOTO_TYPES.join(',')}
          className={s.fileInput}
          aria-labelledby={`${id}-label`}
          aria-describedby={error ? `${id}-error` : describedBy}
          onChange={(e) => {
            void choose(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      )}
      {error && (
        <p id={`${id}-error`} role="alert" className={s.error}>
          {t(error)}
        </p>
      )}
    </>
  );
}
