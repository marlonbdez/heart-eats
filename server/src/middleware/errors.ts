import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError } from '../errors.js';

export const notFound: RequestHandler = (_req, _res, next) => {
  next(new ApiError(404, 'not_found', 'Ruta no encontrada'));
};

// Errores que lanza el lector de JSON de Express (tipo y estado vienen en el error).
function fromBodyParser(err: unknown): ApiError | undefined {
  if (typeof err !== 'object' || err === null) return undefined;
  const { type } = err as { type?: unknown };
  if (type === 'entity.parse.failed') {
    return new ApiError(400, 'invalid_json', 'El cuerpo no es JSON válido');
  }
  if (type === 'entity.too.large') {
    return new ApiError(
      413,
      'payload_too_large',
      'El cuerpo es demasiado grande',
    );
  }
  return undefined;
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  const apiError =
    err instanceof ApiError ? err : (fromBodyParser(err) ?? undefined);

  if (apiError) {
    res.status(apiError.status).json({
      error: {
        code: apiError.code,
        message: apiError.message,
        details: apiError.details,
      },
    });
    return;
  }

  // Solo nombre, mensaje y pila: nunca el cuerpo de la petición ni cabeceras.
  const { name, message, stack } =
    err instanceof Error ? err : new Error(String(err));
  console.error(`${name}: ${message}\n${stack ?? ''}`);
  res.status(500).json({
    error: { code: 'internal_error', message: 'Error interno', details: [] },
  });
};
