/** Auth/Profile — inscription, connexion, jetons opaques (seul leur hachage est stocké). */
import { createHash, randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { a0Baseline, defaultLanguageProfile, defaultSettings } from '@r365/domain';
import { ApiError } from '../errors.js';
import { appendEvent, withTx } from '../db.js';
import type { AppContext } from '../context.js';
import { parse } from '../validation.js';

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(pw, salt, 32);
  return ['scrypt', salt.toString('base64'), h.toString('base64')].join(':');
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [alg, salt, hash] = stored.split(':');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const h = await scrypt(pw, Buffer.from(salt, 'base64'), 32);
  const expected = Buffer.from(hash, 'base64');
  return expected.length === h.length && timingSafeEqual(expected, h);
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** Limiteur simple en mémoire (429) pour les routes d'authentification. */
class RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}
  check(key: string, now: number): boolean {
    const list = (this.hits.get(key) ?? []).filter((t) => now - t < this.windowMs);
    list.push(now);
    this.hits.set(key, list);
    return list.length <= this.max;
  }
}

const credentials = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8, 'Mot de passe : 8 caractères minimum').max(200),
});

export function registerAuth(app: FastifyInstance, ctx: AppContext): void {
  const limiter = new RateLimiter(Number(process.env.AUTH_RATE_LIMIT ?? 20), 60_000);
  const limit = (req: FastifyRequest) => {
    if (!limiter.check(req.ip, Date.now())) throw new ApiError(429, 'rate_limited', 'Trop de tentatives, réessaie dans une minute.');
  };

  async function issueToken(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    const expires = new Date(ctx.clock.now().getTime() + ctx.config.tokenTtlDays * 86_400_000);
    await ctx.db.query('INSERT INTO auth_tokens (token_hash, user_id, expires_at) VALUES ($1,$2,$3)', [sha256(token), userId, expires]);
    return token;
  }

  app.post('/v1/auth/register', async (req, reply) => {
    limit(req);
    const body = parse(credentials, req.body);
    const hash = await hashPassword(body.password);
    const settings = defaultSettings();
    const languages = defaultLanguageProfile();
    const userId = await withTx(ctx.db, async (tx) => {
      const exists = await tx.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [body.email]);
      if (exists.rowCount) throw new ApiError(409, 'email_taken', 'Un compte existe déjà avec cette adresse.');
      const u = await tx.query<{ id: string }>('INSERT INTO users (email, password_hash, locale, timezone) VALUES ($1,$2,$3,$4) RETURNING id', [
        body.email,
        hash,
        'fr',
        settings.timezone,
      ]);
      const id = u.rows[0]!.id;
      // Profil A0 intégral : aucun acquis, évaluations nulles, pas de test de placement (§3, AC19).
      await tx.query(
        'INSERT INTO learner_profiles (user_id, languages, interests, daily_minutes, baseline, settings) VALUES ($1,$2,$3,$4,$5,$6)',
        [id, JSON.stringify(languages), JSON.stringify(settings.interests), settings.daily_minutes, JSON.stringify(a0Baseline()), JSON.stringify(settings)],
      );
      await appendEvent(tx, id, 'user.registered', { entry_level: 'A0' });
      return id;
    });
    reply.code(201);
    return { token: await issueToken(userId), user_id: userId };
  });

  app.post('/v1/auth/login', async (req) => {
    limit(req);
    const body = parse(credentials, req.body);
    const r = await ctx.db.query<{ id: string; password_hash: string }>('SELECT id, password_hash FROM users WHERE lower(email) = lower($1)', [
      body.email,
    ]);
    const row = r.rows[0];
    if (!row || !(await verifyPassword(body.password, row.password_hash))) {
      throw new ApiError(401, 'invalid_credentials', 'Adresse ou mot de passe incorrect.');
    }
    return { token: await issueToken(row.id), user_id: row.id };
  });

  app.post('/v1/auth/logout', async (req) => {
    const token = bearer(req);
    if (token) await ctx.db.query('DELETE FROM auth_tokens WHERE token_hash = $1', [sha256(token)]);
    return { ok: true };
  });

  // Résolution de l'utilisateur pour toutes les routes /v1 sauf l'authentification.
  app.decorateRequest('userId', null);
  app.addHook('preHandler', async (req) => {
    const path = req.routeOptions.url ?? '';
    if (!path.startsWith('/v1/') || path.startsWith('/v1/auth/')) return;
    const token = bearer(req);
    if (!token) throw new ApiError(401, 'unauthenticated', 'Authentification requise.');
    const r = await ctx.db.query<{ user_id: string }>('SELECT user_id FROM auth_tokens WHERE token_hash = $1 AND expires_at > $2', [
      sha256(token),
      ctx.clock.now(),
    ]);
    if (!r.rowCount) throw new ApiError(401, 'unauthenticated', 'Session expirée, reconnecte-toi.');
    req.userId = r.rows[0]!.user_id;
  });
}

function bearer(req: FastifyRequest): string | null {
  const h = req.headers.authorization;
  if (!h?.startsWith('Bearer ')) return null;
  return h.slice(7).trim() || null;
}

export function requireUser(req: FastifyRequest): string {
  if (!req.userId) throw new ApiError(401, 'unauthenticated', 'Authentification requise.');
  return req.userId;
}
