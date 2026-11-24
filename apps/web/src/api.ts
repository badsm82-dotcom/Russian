/** Client API. Les tentatives non envoyées (réseau coupé) sont réessayées avec le même client_attempt_id (idempotence). */

const TOKEN_KEY = 'r365.token';
const PENDING_KEY = 'r365.pendingAttempts';

function storageGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function storageSet(k: string, v: string | null): void {
  try {
    if (v === null) localStorage.removeItem(k);
    else localStorage.setItem(k, v);
  } catch {
    /* stockage indisponible : on continue sans persistance locale */
  }
}

export const auth = {
  get token() {
    return storageGet(TOKEN_KEY);
  },
  set(t: string | null) {
    storageSet(TOKEN_KEY, t);
  },
};

/** Préfixe de l'application (« / » ou « /russian/ »), fourni par Vite. */
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');
export const apiUrl = (u: string) => `${BASE}${u}`;

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details: unknown = null,
  ) {
    super(message);
  }
}

/**
 * Certains hébergements mutualisés coupent la connexion sur PATCH/DELETE : on envoie toujours un POST,
 * avec l'en-tête X-HTTP-Method-Override (le serveur accepte POST sur ces routes).
 */
export async function call<T = any>(method: string, url: string, body?: unknown): Promise<T> {
  if (method === 'PATCH' || method === 'DELETE') return rawCall<T>('POST', url, body, method);
  return rawCall<T>(method, url, body);
}

async function rawCall<T>(method: string, url: string, body?: unknown, override?: string): Promise<T> {
  const headers: Record<string, string> = {};
  if (override) headers['x-http-method-override'] = override;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (auth.token) headers.authorization = `Bearer ${auth.token}`;
  let res: Response;
  try {
    res = await fetch(apiUrl(url), { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch {
    throw new ApiError(0, 'network', 'Connexion impossible. Vérifie ton réseau.');
  }
  const text = await res.text();
  const data = text ? (() => { try { return JSON.parse(text); } catch { return text; } })() : null;
  if (!res.ok) {
    if (res.status === 401 && !url.startsWith('/v1/auth/')) auth.set(null);
    throw new ApiError(res.status, data?.error?.code ?? 'error', data?.error?.message ?? `Erreur ${res.status}`, data?.error?.details ?? null);
  }
  return data as T;
}

export const api = {
  get: <T = any>(u: string) => call<T>('GET', u),
  post: <T = any>(u: string, b: unknown = {}) => call<T>('POST', u, b),
  patch: <T = any>(u: string, b: unknown) => call<T>('PATCH', u, b),
  del: <T = any>(u: string, b?: unknown) => call<T>('DELETE', u, b),
};

export function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export interface AttemptPayload {
  client_attempt_id: string;
  exercise_id: string;
  step_index: number;
  answer: { choice_id?: string; text?: string; dont_know?: boolean };
  assisted?: boolean;
  abandoned?: boolean;
  duration_ms: number;
  occurred_at: string;
  mode?: 'standard' | 'audio_unavailable' | 'offline';
}

/** Envoie une tentative (quelques réessais en cas de coupure brève) ; une coupure durable est gérée par le mode hors ligne. */
export async function sendAttempt(sessionId: string, p: AttemptPayload): Promise<any> {
  const delays = [0, 800, 2000];
  let lastErr: unknown;
  for (const d of delays) {
    if (d) await new Promise((r) => setTimeout(r, d));
    try {
      return await api.post(`/v1/sessions/${sessionId}/attempts`, p);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof ApiError) || e.status !== 0) throw e;
    }
  }
  throw lastErr;
}
