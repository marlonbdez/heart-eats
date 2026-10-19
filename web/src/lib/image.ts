// Prepara una foto antes de subirla: la reduce y la vuelve a codificar en el
// navegador, junto a su miniatura. Así pesa poco (unos 150–300 KB la foto y
// 20–40 KB la miniatura) y se pierden los metadatos (ubicación, cámara).
// Tamaños y formato: docs/02_API_SPEC.md («Subida de fotos»).
const MAX_SIDE = 1600;
const THUMB_SIDE = 400;

export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 15 * 1024 * 1024;

const toBlob = (canvas: HTMLCanvasElement, type: string, quality: number) =>
  new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));

// Dibuja la foto con el lado largo en `side` píxeles (o menos, si ya es menor).
function draw(bitmap: ImageBitmap, side: number) {
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  // Fondo blanco: un PNG con transparencia no debe quedar negro al pasar a JPEG.
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas;
}

export interface ResizedPhoto {
  blob: Blob;
  thumb: Blob;
}

export async function resizePhoto(file: File): Promise<ResizedPhoto> {
  // Con `from-image` la foto sale derecha aunque el móvil la guarde girada.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  });
  try {
    const full = draw(bitmap, MAX_SIDE);
    // WebP si el navegador sabe codificarlo; si no, JPEG. La miniatura va en el
    // mismo formato que la foto: el servidor lo exige.
    const webp = await toBlob(full, 'image/webp', 0.82);
    const type = webp?.type === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const blob = type === 'image/webp' ? webp : await toBlob(full, type, 0.85);
    const thumb = await toBlob(draw(bitmap, THUMB_SIDE), type, 0.8);
    if (!blob || !thumb || thumb.type !== blob.type) throw new Error('encode');
    return { blob, thumb };
  } finally {
    bitmap.close();
  }
}

export interface PreparedPhoto extends ResizedPhoto {
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
    const resized = await resizePhoto(file);
    return { photo: { ...resized, url: URL.createObjectURL(resized.thumb) } };
  } catch {
    return { error: 'photoFailed' };
  }
}
