import { randomUUID } from 'node:crypto';
import pg from 'pg';
import type { FastifyInstance } from 'fastify';
import type { ExerciseDef } from '@r365/domain';
import { buildApp } from '../src/app.js';
import { FakeClock } from '../src/clock.js';
import { loadConfig } from '../src/config.js';
import { loadContent, syncContent, type ContentRegistry } from '../src/content-registry.js';
import { createPool, type Db } from '../src/db.js';
import { migrate } from '../src/migrate.js';

export const TEST_DB_URL = process.env.TEST_DATABASE_URL ?? 'postgres://r365:r365@localhost:5432/r365_test';

export interface TestEnv {
  app: FastifyInstance;
  db: Db;
  clock: FakeClock;
  content: ContentRegistry;
  close(): Promise<void>;
}

/** Base de test réinitialisée (schéma public recréé), migrations et contenu appliqués. */
export async function setupEnv(start = new Date('2026-11-24T08:00:00Z')): Promise<TestEnv> {
  const admin = new pg.Client({ connectionString: TEST_DB_URL });
  await admin.connect();
  await admin.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  await admin.end();
  const db = createPool(TEST_DB_URL);
  await migrate(db);
  const content = loadContent({ allowPending: true });
  await syncContent(db, content);
  const clock = new FakeClock(start);
  process.env.AUTH_RATE_LIMIT = '1000';
  const app = await buildApp({ db, content, clock, config: { ...loadConfig({}), databaseUrl: TEST_DB_URL } });
  return { app, db, clock, content, close: async () => { await app.close(); await db.end(); } };
}

export async function register(env: TestEnv, email = `u${randomUUID().slice(0, 8)}@test.local`): Promise<string> {
  const r = await env.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email, password: 'motdepasse-solide' } });
  if (r.statusCode !== 201) throw new Error(`register ${r.statusCode} ${r.body}`);
  return r.json().token as string;
}

export function api(env: TestEnv, token: string) {
  const call = async (method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: unknown) => {
    const r = await env.app.inject({ method, url, payload: payload as never, headers: { authorization: `Bearer ${token}` } });
    let body: any = null;
    try {
      body = r.json();
    } catch {
      body = r.body;
    }
    return { status: r.statusCode, body };
  };
  return {
    get: (u: string) => call('GET', u),
    post: (u: string, p: unknown = {}) => call('POST', u, p),
    patch: (u: string, p: unknown) => call('PATCH', u, p),
    del: (u: string, p?: unknown) => call('DELETE', u, p),
  };
}

export function correctAnswer(ex: ExerciseDef): { choice_id?: string; text?: string } {
  const a = ex.answer;
  if (a.kind === 'choice') return { choice_id: a.correct };
  if (a.kind === 'cyrillic') return { text: a.accepted[0] };
  return { text: a.variants[0] };
}

export function wrongAnswer(ex: ExerciseDef): { choice_id?: string; text?: string } {
  const a = ex.answer;
  if (a.kind === 'choice') return { choice_id: ex.choices!.find((c) => c.id !== a.correct)!.id };
  if (a.kind === 'cyrillic') return { text: 'ъъъъ' };
  return { text: 'zzzz' };
}

type Client = ReturnType<typeof api>;

/** Parcourt une séance jusqu'au bout : ack des présentations, réponses correctes (ou via `answer`). */
export async function playSession(
  env: TestEnv,
  client: Client,
  sessionId: string,
  answer: (ex: ExerciseDef, index: number) => { choice_id?: string; text?: string } = (ex) => correctAnswer(ex),
  opts: { stopAt?: number; stepMs?: number } = {},
) {
  let session = (await client.get(`/v1/sessions/${sessionId}`)).body.session;
  const results: any[] = [];
  while (session.cursor < session.steps.length && (opts.stopAt === undefined || session.cursor < opts.stopAt)) {
    const step = session.steps[session.cursor];
    if (step.kind === 'teach' || step.kind === 'speak') {
      const r = await client.post(`/v1/sessions/${sessionId}/steps/${step.index}/ack`);
      if (r.status !== 200) throw new Error(`ack ${r.status} ${JSON.stringify(r.body)}`);
    } else {
      const ex = env.content.exerciseById.get(step.exercise.id)!;
      const r = await client.post(`/v1/sessions/${sessionId}/attempts`, {
        client_attempt_id: randomUUID(), exercise_id: ex.id, step_index: step.index, answer: answer(ex, step.index), duration_ms: 9000,
      });
      if (r.status !== 201) throw new Error(`attempt ${r.status} ${JSON.stringify(r.body)}`);
      results.push({ ex, ...r.body });
    }
    env.clock.advance(opts.stepMs ?? 20_000);
    session = (await client.get(`/v1/sessions/${sessionId}`)).body.session;
  }
  return { session, results };
}
