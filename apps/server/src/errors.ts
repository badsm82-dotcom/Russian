/** Erreurs structurées de l'API (§16). */
export class ApiError extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 429 | 501 | 503,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

export const badRequest = (msg: string, details?: unknown) => new ApiError(400, 'bad_request', msg, details);
export const notFound = (what = 'Ressource') => new ApiError(404, 'not_found', `${what} introuvable`);
export const conflict = (code: string, msg: string, details?: unknown) => new ApiError(409, code, msg, details);
