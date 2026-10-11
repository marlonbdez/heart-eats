// Prepara una foto antes de subirla: la reduce y la vuelve a codificar en el
// navegador. Así pesa poco y se pierden los metadatos (ubicación, cámara).
const MAX_SIDE = 1200;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

export async function resizePhoto(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // Fondo blanco: un PNG con transparencia no debe quedar negro al pasar a JPEG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  // WebP si el navegador sabe codificarlo; si no, JPEG.
  const webp = await toBlob(canvas, 'image/webp', 0.82);
  if (webp && webp.type === 'image/webp') return webp;
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.85);
  if (!jpeg) throw new Error('encode');
  return jpeg;
}

export interface PreparedPhoto {
  blob: Blob;
  url: string; // vista previa; hay que soltarla con URL.revokeObjectURL
}
export type PhotoError = 'photoType' | 'photoSize' | 'photoFailed';

// Valida y reduce la foto que elige la persona. El error es la clave del aviso.
export async function preparePhoto(
  file: File,
): Promise<{ photo: PreparedPhoto } | { error: PhotoError }> {
  if (!PHOTO_TYPES.includes(file.type)) return { error: 'photoType' };
  if (file.size > MAX_PHOTO_BYTES) return { error: 'photoSize' };
  try {
    const blob = await resizePhoto(file);
    return { photo: { blob, url: URL.createObjectURL(blob) } };
  } catch {
    return { error: 'photoFailed' };
  }
}
