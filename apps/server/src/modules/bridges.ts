/** Passerelles linguistiques (§2.3) : GET /concepts/{id}/bridges ; POST /bridges/{id}/feedback. */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { BRIDGE_TYPE_LABEL_FR, LANGUAGE_NAMES_FR, selectBridges, type BridgeFeedbackStats, type LanguageBridge } from '@r365/domain';
import type { AppContext } from '../context.js';
import { appendEvent, withTx } from '../db.js';
import { notFound } from '../errors.js';
import { loadProfile } from '../learner-state.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';
import { markStepAssisted } from './sessions.js';

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

export function registerBridges(app: FastifyInstance, ctx: AppContext): void {
  app.get<{ Params: { id: string } }>('/v1/concepts/:id/bridges', async (req) => {
    const userId = requireUser(req);
    const q = parse(query, req.query);
    const profile = await loadProfile(ctx.db, userId);
    const sel = selectBridges(req.params.id, ctx.content.bridges, profile.languages.known_languages, {
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
        `INSERT INTO bridge_attempts (user_id, bridge_id, bridge_version, concept_id, context, session_id, shown_at) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
        [userId, chosen.id, chosen.version, chosen.concept_id, q.context, q.session_id ?? null, ctx.clock.now()],
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
}
