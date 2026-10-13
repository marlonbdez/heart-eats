// Error que se devuelve tal cual al cliente con la estructura de la API:
// { error: { code, message, details } } (docs/02_API_SPEC.md).
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details: unknown[] = [],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
