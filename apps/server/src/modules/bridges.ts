import { randomUUID } from 'node:crypto';
/** Passerelles linguistiques (§2.3) : GET /concepts/{id}/bridges ; POST /bridges/{id}/feedback. */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BRIDGE_TYPE_LABEL_FR, LANGUAGE_NAMES_FR, selectBridges, stripStressMarks, type BridgeFeedbackStats, type LanguageBridge } from '@r365/domain';
import type { AppContext } from '../context.js';
import { appendEvent, withTx } from '../db.js';
import { notFound } from '../errors.js';
import { loadProfile } from '../learner-state.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';
import { markStepAssisted } from './sessions.js';
import { lemmaRank, wordConcept } from '@r365/content';
import { badRequest } from '../errors.js';

const query = z.object({
  context: z.enum(['lesson', 'exercise']).default('lesson'),
  session_id: z.string().uuid().optional(),
  step_index: z.coerce.number().int().min(0).optional(),
  /** Nombre de passerelles déjà vues pour ce concept : 0 = par défaut, 1+ = « autre comparaison ». */
  offset: z.coerce.number().int().min(0).max(10).default(0),
});

const feedbackBody = z.object({ helpful: z.boolean(), bridge_attempt_id: z.string().uuid().optional() }).strict();

function present(b: LanguageBridge) {
  return {
    id: b.id,
    concept_id: b.concept_id,
    source_language: b.source_language,
    source_language_name_fr: LANGUAGE_NAMES_FR[b.source_language],
    source_expression: b.source_expression,
    russian_expression: b.russian_expression,
    bridge_type: b.bridge_type,
    bridge_type_label_fr: BRIDGE_TYPE_LABEL_FR[b.bridge_type],
    explanation_fr: b.explanation_fr,
    limitations_fr: b.limitations_fr,
    version: b.version,
  };
}

export async function feedbackStats(ctx: AppContext, userId: string): Promise<BridgeFeedbackStats[]> {
  const r = await ctx.db.query<{ bridge_id: string; helpful: string; not_helpful: string }>(
    `SELECT bridge_id, count(*) FILTER (WHERE helpful_feedback) AS helpful, count(*) FILTER (WHERE helpful_feedback = false) AS not_helpful
     FROM bridge_attempts WHERE user_id = $1 GROUP BY bridge_id`,
    [userId],
  );
  return r.rows.map((x) => ({ bridge_id: x.bridge_id, helpful: Number(x.helpful), not_helpful: Number(x.not_helpful) }));
}

/** Décisions de l'apprenant sur les passerelles candidates (§2.3). */
export async function bridgeReviews(ctx: AppContext, userId: string): Promise<Map<string, 'approved' | 'rejected'>> {
  const r = await ctx.db.query<{ bridge_id: string; version: number; decision: 'approved' | 'rejected' }>(
    'SELECT bridge_id, version, decision FROM bridge_reviews WHERE user_id = $1',
    [userId],
  );
  return new Map(r.rows.map((x) => [`${x.bridge_id}@${x.version}`, x.decision]));
}

/** Catalogue vu par l'apprenant : une candidate qu'il a approuvée devient validée ; une rejetée disparaît. */
export function userCatalog(all: readonly LanguageBridge[], reviews: ReadonlyMap<string, 'approved' | 'rejected'>): LanguageBridge[] {
  const out: LanguageBridge[] = [];
  for (const b of all) {
    const d = reviews.get(`${b.id}@${b.version}`);
    if (d === 'rejected') continue;
    out.push(d === 'approved' && b.validation_status === 'pending_review' ? { ...b, validation_status: 'validated' } : b);
  }
  return out;
}

/**
 * Candidates triées une fois pour toutes : mots présents dans les leçons, puis les plus fréquents (OpenRussian),
 * puis ordre alphabétique.
 */
let rankedCache: { b: LanguageBridge; inLessons: boolean }[] | null = null;
function rankedCandidates(ctx: AppContext) {
  if (rankedCache) return rankedCache;
  const lessonWords = new Set<string>();
  for (const c of ctx.content.cards.values()) for (const w of stripStressMarks(c.ru + ' ' + c.examples.map((e) => e.ru).join(' ')).match(/[а-яё-]+/gi) ?? []) lessonWords.add(wordConcept(w));
  rankedCache = ctx.content.bridges
    .filter((b) => b.validation_status === 'pending_review')
    .map((b) => ({ b, inLessons: lessonWords.has(b.concept_id), r: (lessonWords.has(b.concept_id) ? 0 : 100000) + (lemmaRank(b.concept_id.slice(5)) ?? 50000) }))
    .sort((a, b) => a.r - b.r || a.b.id.localeCompare(b.b.id))
    .map(({ b, inLessons }) => ({ b, inLessons }));
  return rankedCache;
}

/** Concepts liés : un item de leçon (lex:tualet) est aussi relié aux mots qu'il contient (word:туалет). */
function relatedConcepts(ctx: AppContext, id: string): string[] {
  const card = ctx.content.cards.get(id);
  const words = card && card.item_type !== 'letter' ? (stripStressMarks(card.ru).match(/[а-яё-]+/gi) ?? []).map((w) => wordConcept(w)) : [];
  return [id, ...words];
}

export function registerBridges(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>('/v1/concepts/:id/bridges', async (req) => {
    const userId = requireUser(req);
    const q = parse(query, req.query);
    const profile = await loadProfile(ctx.db, userId);
    const concepts = new Set(relatedConcepts(ctx, req.params.id));
    const catalog = userCatalog(ctx.content.bridges, await bridgeReviews(ctx, userId))
      .filter((b) => concepts.has(b.concept_id))
      .map((b) => ({ ...b, concept_id: req.params.id }));
    const sel = selectBridges(req.params.id, catalog, profile.languages.known_languages, {
      enabled: profile.settings.bridges_enabled,
      feedback: await feedbackStats(ctx, userId),
    });
    const ordered = [sel.default, ...sel.alternatives].filter((b): b is LanguageBridge => !!b);
    const chosen = ordered[q.offset] ?? null;
    if (!chosen) return { bridge: null, has_more: false, message_fr: 'Pas de comparaison fiable pour cette notion : l’explication en français suffit.' };
    const id = await withTx(ctx.db, async (tx) => {
      // Une aide consultée pendant un exercice rend la réponse « assistée » (§2.3, recette 5).
      if (q.context === 'exercise' && q.session_id !== undefined && q.step_index !== undefined) {
        await markStepAssisted(tx, userId, q.session_id, q.step_index);
      }
      const r = await tx.query<{ id: string }>(
        `INSERT INTO bridge_attempts (id, user_id, bridge_id, bridge_version, concept_id, context, session_id, shown_at) VALUES ($8,$1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [userId, chosen.id, chosen.version, chosen.concept_id, q.context, q.session_id ?? null, ctx.clock.now(), randomUUID()],
      );
      await appendEvent(tx, userId, 'bridge.shown', { bridge_id: chosen.id, concept_id: chosen.concept_id, context: q.context });
      return r.rows[0]!.id;
    });
    return { bridge: present(chosen), bridge_attempt_id: id, has_more: q.offset + 1 < ordered.length, assisted: q.context === 'exercise' };
  });

  app.post<{ Params: { id: string } }>('/v1/bridges/:id/feedback', async (req) => {
    const userId = requireUser(req);
    const body = parse(feedbackBody, req.body);
    return withTx(ctx.db, async (tx) => {
      const r = body.bridge_attempt_id
        ? await tx.query<{ id: string }>('SELECT id FROM bridge_attempts WHERE id = $1 AND user_id = $2 AND bridge_id = $3', [body.bridge_attempt_id, userId, req.params.id])
        : await tx.query<{ id: string }>('SELECT id FROM bridge_attempts WHERE user_id = $1 AND bridge_id = $2 ORDER BY shown_at DESC LIMIT 1', [userId, req.params.id]);
      const row = r.rows[0];
      if (!row) throw notFound('Passerelle affichée');
      await tx.query('UPDATE bridge_attempts SET helpful_feedback = $2 WHERE id = $1', [row.id, body.helpful]);
      await appendEvent(tx, userId, 'bridge.feedback', { bridge_id: req.params.id, helpful: body.helpful });
      return { ok: true };
    });
  });

  /** Passerelles candidates à valider (emprunts au français issus du Wiktionary), les plus utiles d'abord. */
  app.get('/v1/bridges/review', async (req) => {
    const userId = requireUser(req);
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(50).default(15) }), req.query);
    const reviews = await bridgeReviews(ctx, userId);
    const ranked = rankedCandidates(ctx).filter(({ b }) => !reviews.has(`${b.id}@${b.version}`));
    const pending = ranked.map((x) => x.b);
    const approved = [...reviews.values()].filter((d) => d === 'approved').length;
    return {
      total_pending: pending.length,
      approved,
      rejected: reviews.size - approved,
      items: ranked.slice(0, limit).map(({ b, inLessons }) => ({ ...present(b), source_reference: b.source_reference, in_lessons: inLessons })),
    };
  });

  app.post<{ Params: { id: string } }>('/v1/bridges/:id/review', async (req) => {
    const userId = requireUser(req);
    const body = parse(z.object({ decision: z.enum(['approved', 'rejected']), version: z.number().int().min(1).optional() }).strict(), req.body);
    const b = ctx.content.bridges.find((x) => x.id === req.params.id && (!body.version || x.version === body.version));
    if (!b) throw notFound('Passerelle');
    if (b.validation_status !== 'pending_review') throw badRequest('Cette passerelle n’est pas en attente de validation.');
    await withTx(ctx.db, async (tx) => {
      await tx.query(
        `INSERT INTO bridge_reviews (user_id, bridge_id, version, decision, decided_at) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (user_id, bridge_id, version) DO UPDATE SET decision = EXCLUDED.decision, decided_at = EXCLUDED.decided_at`,
        [userId, b.id, b.version, body.decision, ctx.clock.now()],
      );
      await appendEvent(tx, userId, 'bridge.reviewed', { bridge_id: b.id, decision: body.decision });
    });
    return { ok: true };
  });
}
