import { ApiRequestError, apiGet, apiPost } from '../api';

// Lo que Moderación pidió a quien propuso (GET /replies/:token).
export interface InfoRequest {
  name?: string;
  note: string;
  deadline: string;
}

// La petición a la que apunta el enlace del correo, o null si el enlace ya no
// vale (caducado, ya usado o sustituido por uno más reciente).
export async function getInfoRequest(
  token: string,
): Promise<InfoRequest | null> {
  try {
    return await apiGet<InfoRequest>(`/replies/${encodeURIComponent(token)}`);
  } catch (err) {
    if (err instanceof ApiRequestError && err.status === 404) return null;
    throw err;
  }
}

// Respuesta de quien propuso (POST /replies/:token). El enlace sirve una vez.
export async function sendReply(token: string, message: string): Promise<void> {
  await apiPost(`/replies/${encodeURIComponent(token)}`, { message });
}
