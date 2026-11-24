import Fastify, { type FastifyInstance } from 'fastify';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { AppContext } from './context.js';
import { ApiError } from './errors.js';
import { registerAccount } from './modules/account.js';
import { registerAnalytics } from './modules/analytics.js';
import { registerAuth } from './modules/auth.js';
import { registerBridges } from './modules/bridges.js';
import { registerCurriculum } from './modules/curriculum.js';
import { registerProfile } from './modules/profile.js';
import { registerSessions } from './modules/sessions.js';

export async function buildApp(ctx: AppContext, opts: { logger?: boolean } = {}): Promise<FastifyInstance> {
  const app = Fastify({
    logger: opts.logger ? { level: ctx.config.logLevel, redact: ['req.headers.authorization'] } : false,
    // La journalisation ne contient ni réponses personnelles ni audio (§18) : les corps ne sont jamais journalisés.
    bodyLimit: 64 * 1024,
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ApiError) {
      return reply.code(err.status).send({ error: { code: err.code, message: err.message, details: err.details ?? null } });
    }
    const e = err as { statusCode?: number; code?: string; message?: string };
    if (e.statusCode && e.statusCode >= 400 && e.statusCode < 500) {
      return reply.code(e.statusCode).send({ error: { code: e.code ?? 'bad_request', message: e.message ?? 'Requête invalide', details: null } });
    }
    req.log.error({ err }, 'erreur interne');
    return reply.code(503).send({ error: { code: 'service_unavailable', message: 'Service momentanément indisponible.', details: null } });
  });

  app.get('/health', async () => {
    await ctx.db.query('SELECT 1');
    return { ok: true };
  });

  registerAuth(app, ctx);
  registerProfile(app, ctx);
  registerCurriculum(app, ctx);
  registerSessions(app, ctx);
  registerBridges(app, ctx);
  registerAnalytics(app, ctx);
  registerAccount(app, ctx);

  // Fonctions prévues par le cahier des charges mais non livrées dans ce lot : réponse explicite, pas de simulacre.
  const notYet = ['/v1/tutor/dialogues', '/v1/speech/transcribe', '/v1/speech/synthesize', '/v1/library', '/v1/assessments/:id/submit'];
  for (const path of notYet) {
    app.all(path, async () => {
      throw new ApiError(501, 'not_implemented', 'Fonction prévue dans un lot ultérieur (voir docs/LIMITATIONS.md).');
    });
  }

  const root = ctx.config.webDist ? resolve(ctx.config.webDist) : null;
  const serveWeb = !!root && existsSync(root);
  if (serveWeb) {
    const fastifyStatic = (await import('@fastify/static')).default;
    await app.register(fastifyStatic, { root: root!, wildcard: false });
  }
  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/v1/')) return reply.code(404).send({ error: { code: 'not_found', message: 'Route inconnue', details: null } });
    // Application monopage : toute route non-API renvoie index.html.
    if (serveWeb) return reply.sendFile('index.html');
    return reply.code(404).send('Not found');
  });
  return app;
}
