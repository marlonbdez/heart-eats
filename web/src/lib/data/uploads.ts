import { apiUpload } from '../api';
import type { PhotoBlobs } from '../types';

// Sube una foto a la cuarentena y, después, su miniatura (que cuelga de la
// foto). Devuelve la clave que se manda en el envío.
export async function uploadPhoto({
  blob,
  thumb,
}: PhotoBlobs): Promise<string> {
  const key = await apiUpload(blob);
  const id = /^q\/([^.]+)\./.exec(key)?.[1];
  if (!id) throw new Error('Clave de foto inesperada');
  await apiUpload(thumb, { thumbOf: id });
  return key;
}
