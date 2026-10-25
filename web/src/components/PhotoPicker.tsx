'use client';

import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { preparePhoto, type PreparedPhoto } from '@/lib/image';
import { PhotoDropzone } from './PhotoDropzone';
import { Spinner } from './Spinner';
import s from './Form.module.css';

// Campo de una foto opcional: elegir o arrastrar, ver la vista previa y quitarla. La foto
// se reduce en el navegador (puede tardar un par de segundos, y se avisa); se
// sube al enviar el formulario.
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
  const [preparing, setPreparing] = useState(false);

  const remove = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    onChange(undefined);
  };
  const choose = async (file?: File) => {
    if (!file) return;
    onError('');
    setPreparing(true);
    const result = await preparePhoto(file).finally(() => setPreparing(false));
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
      ) : preparing ? (
        <p role="status" className={s.small}>
          <Spinner /> {t('preparing')}
        </p>
      ) : (
        <PhotoDropzone
          id={id}
          labelledBy={`${id}-label`}
          describedBy={error ? `${id}-error` : describedBy}
          onFile={(file) => void choose(file)}
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
