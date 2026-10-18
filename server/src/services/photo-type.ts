export type PhotoType = 'image/webp' | 'image/jpeg';

const startsWith = (bytes: Uint8Array, offset: number, text: string) =>
  [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));

// El tipo real de una foto, según sus primeros bytes. El `Content-Type` lo
// escribe quien envía y no basta para fiarse de él.
export function sniffPhoto(bytes: Uint8Array): PhotoType | null {
  if (startsWith(bytes, 0, 'RIFF') && startsWith(bytes, 8, 'WEBP')) {
    return 'image/webp';
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }
  return null;
}
