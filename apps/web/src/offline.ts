/**
 * Mode hors ligne (§14, §18) : copie locale (IndexedDB) de la séance en cours et de ses exercices,
 * correction provisoire sur l'appareil, et file d'opérations rejouée dans l'ordre à la reconnexion.
 * Le serveur recorrige chaque réponse et reste la seule référence ; l'idempotence (client_attempt_id)
 * garantit qu'une opération renvoyée deux fois n'est comptée qu'une fois.
 */
import { gradeAnswer, type ExerciseDef } from '@r365/domain';
import { api, ApiError, type AttemptPayload } from './api';

const DB_NAME = 'russian365';
const STORE = 'kv';

function openDb(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/** Petit magasin clé/valeur : IndexedDB, avec repli sur localStorage si IndexedDB est indisponible. */
export async function kvGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) {
    try {
      const v = localStorage.getItem(`r365.${key}`);
      return v ? (JSON.parse(v) as T) : undefined;
    } catch {
      return undefined;
    }
  }
  return new Promise((resolve) => {
    const r = db.transaction(STORE, 'readonly').objectStore(STORE).get(key);
    r.onsuccess = () => resolve(r.result as T | undefined);
    r.onerror = () => resolve(undefined);
  });
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  if (!db) {
    try {
      if (value === undefined) localStorage.removeItem(`r365.${key}`);
      else localStorage.setItem(`r365.${key}`, JSON.stringify(value));
    } catch {
      /* stockage indisponible */
    }
    return;
  }
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, 'readwrite');
    if (value === undefined) tx.objectStore(STORE).delete(key);
    else tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

// ---------------------------------------------------------------------------
// Copie locale de la séance
// ---------------------------------------------------------------------------

export interface CachedSession {
  session: any;
  exercises: Record<string, ExerciseDef>;
  cached_at: string;
}

/** Enregistre la séance (et ses corrigés, une fois) pour pouvoir la continuer sans réseau. */
export async function cacheSession(session: any): Promise<void> {
  const prev = await kvGet<CachedSession>(`session:${session.id}`);
  let exercises = prev?.exercises ?? {};
  const needed = session.steps.filter((s: any) => s.kind === 'exercise').map((s: any) => s.exercise.id);
  if (needed.some((id: string) => !exercises[id])) {
    try {
      const pack = await api.get(`/v1/sessions/${session.id}/offline-pack`);
      exercises = Object.fromEntries(pack.exercises.map((e: ExerciseDef) => [e.id, e]));
    } catch {
      /* pas de paquet : la séance restera consultable mais non corrigeable hors ligne */
    }
  }
  await kvSet(`session:${session.id}`, { session, exercises, cached_at: new Date().toISOString() } satisfies CachedSession);
  await kvSet('current_session_id', session.state === 'active' ? session.id : undefined);
}

export async function cachedSession(id: string): Promise<CachedSession | undefined> {
  return kvGet<CachedSession>(`session:${id}`);
}

export async function updateCachedCursor(id: string, cursor: number): Promise<void> {
  const c = await cachedSession(id);
  if (c) await kvSet(`session:${id}`, { ...c, session: { ...c.session, cursor: Math.max(c.session.cursor, cursor) } });
}

export async function currentCachedSessionId(): Promise<string | undefined> {
  return kvGet<string>('current_session_id');
}

// ---------------------------------------------------------------------------
// File d'opérations
// ---------------------------------------------------------------------------

export type OfflineOp =
  | { kind: 'ack'; session_id: string; index: number }
  | { kind: 'attempt'; session_id: string; payload: AttemptPayload }
  | { kind: 'complete'; session_id: string };

export async function pendingOps(): Promise<OfflineOp[]> {
  return (await kvGet<OfflineOp[]>('ops')) ?? [];
}

export async function enqueue(op: OfflineOp): Promise<void> {
  const ops = await pendingOps();
  ops.push(op);
  await kvSet('ops', ops);
}

let flushing: Promise<number> | null = null;

/** Rejoue les opérations dans l'ordre ; s'arrête au premier échec réseau. Renvoie le nombre d'opérations envoyées. */
export function flushOps(): Promise<number> {
  if (flushing) return flushing;
  flushing = (async () => {
    let sent = 0;
    // Reprise des anciennes tentatives en attente (versions précédentes, localStorage).
    try {
      const legacy = localStorage.getItem('r365.pendingAttempts');
      if (legacy) {
        const list = JSON.parse(legacy) as { sessionId: string; p: AttemptPayload }[];
        for (const it of list) await enqueue({ kind: 'attempt', session_id: it.sessionId, payload: it.p });
        localStorage.removeItem('r365.pendingAttempts');
      }
    } catch {
      /* ignore */
    }
    let ops = await pendingOps();
    while (ops.length) {
      const op = ops[0]!;
      try {
        if (op.kind === 'ack') await api.post(`/v1/sessions/${op.session_id}/steps/${op.index}/ack`);
        else if (op.kind === 'attempt') await api.post(`/v1/sessions/${op.session_id}/attempts`, op.payload);
        else await api.post(`/v1/sessions/${op.session_id}/complete`);
        sent++;
      } catch (e) {
        if (e instanceof ApiError && e.status === 0) break; // toujours hors ligne : on garde la file
        // Refus définitif (séance remplacée, etc.) : l'opération est abandonnée pour ne pas bloquer la file.
        console.warn('Opération hors ligne refusée', op, e);
      }
      ops = (await pendingOps()).slice(1);
      await kvSet('ops', ops);
    }
    return sent;
  })().finally(() => {
    flushing = null;
  });
  return flushing;
}

export function isNetworkError(e: unknown): boolean {
  return e instanceof ApiError && e.status === 0;
}

/** Correction provisoire sur l'appareil, avec le même moteur que le serveur. */
export function gradeOffline(ex: ExerciseDef, answer: AttemptPayload['answer'], assisted: boolean, duration_ms: number) {
  if (answer.dont_know) {
    return { outcome: 'incorrect', grade: 0, accepted: false, feedback_fr: 'Pas de souci : voici la réponse.', expected: expectedOf(ex), error_codes: ['dont_know'] };
  }
  return gradeAnswer(ex, answer, { assisted, duration_ms, previous_grade: null });
}

function expectedOf(ex: ExerciseDef): string {
  const a = ex.answer;
  if (a.kind === 'choice') return ex.choices?.find((c) => c.id === a.correct)?.label ?? '';
  if (a.kind === 'cyrillic') return a.accepted[0] ?? '';
  return a.variants[0] ?? '';
}

/** Efface toutes les données locales (déconnexion, suppression de compte). */
export async function clearLocal(): Promise<void> {
  await new Promise<void>((resolve) => {
    try {
      const r = indexedDB.deleteDatabase(DB_NAME);
      r.onsuccess = r.onerror = r.onblocked = () => resolve();
    } catch {
      resolve();
    }
  });
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith('r365.') && k !== 'r365.token') localStorage.removeItem(k);
  } catch {
    /* ignore */
  }
}
