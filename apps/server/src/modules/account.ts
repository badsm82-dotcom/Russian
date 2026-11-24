/** Export (JSON/CSV) et suppression de compte (§12, §18, AC13). */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import type { AppContext } from '../context.js';
import { withTx } from '../db.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';

const exportQuery = z.object({ format: z.enum(['json', 'csv']).default('json') });
const deleteBody = z.object({ confirm: z.literal('SUPPRIMER') }).strict();

function csvCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = v instanceof Date ? v.toISOString() : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function registerAccount(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/export', async (req, reply) => {
    const userId = requireUser(req);
    const { format } = parse(exportQuery, req.query);
    const q = (sql: string) => ctx.db.query(sql, [userId]).then((r) => r.rows);
    const attempts = await q(
      `SELECT a.id, a.client_attempt_id, a.session_id, e.slug AS exercise_slug, a.exercise_version, k.slug AS item, a.competency, a.purpose, a.mode,
              a.answer, a.outcome, a.grade, a.assisted, a.in_context, a.remediation, a.early_review, a.duration_ms, a.error_codes, a.occurred_at, a.created_at
       FROM attempts a JOIN exercises e ON e.id = a.exercise_id AND e.version = a.exercise_version JOIN knowledge_items k ON k.id = a.item_id
       WHERE a.user_id = $1 ORDER BY a.occurred_at`,
    );
    if (format === 'csv') {
      const cols = ['id', 'occurred_at', 'exercise_slug', 'exercise_version', 'item', 'competency', 'purpose', 'outcome', 'grade', 'assisted', 'in_context', 'duration_ms', 'error_codes', 'answer'];
      const lines = [cols.join(','), ...attempts.map((a) => cols.map((c) => csvCell((a as Record<string, unknown>)[c])).join(','))];
      reply.header('content-type', 'text/csv; charset=utf-8').header('content-disposition', 'attachment; filename="russian365-tentatives.csv"');
      return '﻿' + lines.join('\n');
    }
    const [user, profile, sessions, states, taught, bridges, events] = await Promise.all([
      q('SELECT id, email, locale, timezone, consent_version, created_at FROM users WHERE id = $1'),
      q('SELECT languages, interests, daily_minutes, baseline, settings, onboarded, updated_at FROM learner_profiles WHERE user_id = $1'),
      q('SELECT id, planned_minutes, mode, unit_id, cursor, state, started_at, ended_at FROM sessions WHERE user_id = $1 ORDER BY started_at'),
      q('SELECT k.slug AS item, r.competency, r.stage, r.due_at, r.last_grade, r.streak, r.remediation_pending, r.mastery_status FROM review_states r JOIN knowledge_items k ON k.id = r.item_id WHERE r.user_id = $1'),
      q('SELECT k.slug AS item, t.taught_at FROM taught_items t JOIN knowledge_items k ON k.id = t.item_id WHERE t.user_id = $1'),
      q('SELECT bridge_id, bridge_version, concept_id, context, shown_at, helpful_feedback FROM bridge_attempts WHERE user_id = $1'),
      q('SELECT type, payload, created_at FROM events WHERE user_id = $1 ORDER BY id'),
    ]);
    const assessments = await q('SELECT assessment_id, version, state, passed, scores, answers, started_at, submitted_at FROM assessment_runs WHERE user_id = $1 ORDER BY started_at');
    reply.header('content-disposition', 'attachment; filename="russian365-export.json"');
    return {
      format: 'russian365-export',
      version: 1,
      exported_at: ctx.clock.now(),
      user: user[0],
      profile: profile[0],
      sessions,
      attempts,
      review_states: states,
      taught_items: taught,
      bridge_attempts: bridges,
      assessments,
      events,
    };
  });

  /** Suppression définitive : cascade sur toutes les données de l'apprenant (aucun audio n'est stocké). */
  app.delete('/v1/account', async (req) => {
    const userId = requireUser(req);
    parse(deleteBody, req.body);
    await withTx(ctx.db, async (tx) => {
      await tx.query('DELETE FROM users WHERE id = $1', [userId]);
    });
    return { deleted: true };
  });
}
