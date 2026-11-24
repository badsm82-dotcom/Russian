/**
 * Bilans sans aide (§12, AC10) : sujet inédit tiré à chaque passage, conservé côté serveur avec son corrigé ;
 * le client ne reçoit que les énoncés ; les réponses sont enregistrées sans retour ; la note n'arrive qu'à la remise.
 */
import { randomUUID } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ASSESSMENT_WORDS, LETTERS } from '@r365/content';
import {
  ALPHABET_ASSESSMENT_ID,
  buildAlphabetAssessment,
  scoreAssessment,
  toClientExercise,
  type AssessmentAnswer,
  type AssessmentScore,
  type AssessmentSpec,
} from '@r365/domain';
import type { AppContext } from '../context.js';
import { appendEvent, withTx } from '../db.js';
import { ApiError, conflict, notFound } from '../errors.js';
import { loadTaught } from '../learner-state.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';

interface RunRow {
  id: string;
  user_id: string;
  assessment_id: string;
  spec: AssessmentSpec;
  answers: Record<string, AssessmentAnswer>;
  state: 'in_progress' | 'submitted' | 'abandoned';
  scores: AssessmentScore | null;
  passed: boolean | null;
  started_at: Date;
  submitted_at: Date | null;
}

const answerBody = z
  .object({
    task_index: z.number().int().min(0),
    answer: z.object({ choice_id: z.string().max(100).optional(), text: z.string().max(200).optional(), dont_know: z.boolean().optional() }).strict(),
  })
  .strict();

function clientView(r: RunRow) {
  return {
    id: r.id,
    assessment_id: r.assessment_id,
    title_fr: r.spec.title_fr,
    intro_fr: r.spec.intro_fr,
    state: r.state,
    started_at: r.started_at,
    answered: Object.keys(r.answers).map(Number),
    tasks: r.spec.tasks.map((t) => ({ index: t.index, part: t.part, exercise: toClientExercise(t.exercise) })),
    result: r.state === 'submitted' ? { passed: r.passed, ...r.scores } : null,
  };
}

/** Résultat le plus récent réussi pour un bilan (utilisé par les objectifs). */
export async function assessmentPassed(ctx: AppContext, userId: string, assessmentId: string): Promise<boolean> {
  const r = await ctx.db.query("SELECT 1 FROM assessment_runs WHERE user_id = $1 AND assessment_id = $2 AND state = 'submitted' AND passed LIMIT 1", [userId, assessmentId]);
  return !!r.rowCount;
}

export function registerAssessments(app: FastifyInstance, ctx: AppContext): void {
  const getRun = async (userId: string, id: string, lock = false, q: { query: AppContext['db']['query'] } = ctx.db): Promise<RunRow> => {
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Bilan');
    const r = await q.query<RunRow>(`SELECT * FROM assessment_runs WHERE id = $1 AND user_id = $2${lock ? ' FOR UPDATE' : ''}`, [id, userId]);
    if (!r.rowCount) throw notFound('Bilan');
    return r.rows[0]!;
  };

  /** Disponibilité et historique des bilans. */
  app.get('/v1/assessments', async (req) => {
    const userId = requireUser(req);
    const taught = await loadTaught(ctx.db, ctx.content, userId);
    const lettersTaught = LETTERS.filter((l) => taught.has(`letter:${l.lower}`)).length;
    const runs = await ctx.db.query<{ id: string; assessment_id: string; state: string; passed: boolean | null; scores: AssessmentScore | null; started_at: Date; submitted_at: Date | null }>(
      'SELECT id, assessment_id, state, passed, scores, started_at, submitted_at FROM assessment_runs WHERE user_id = $1 ORDER BY started_at DESC LIMIT 50',
      [userId],
    );
    return {
      available: [
        {
          id: ALPHABET_ASSESSMENT_ID,
          title_fr: 'Bilan de l’alphabet (J7–J14)',
          ready: lettersTaught === LETTERS.length,
          requirement_fr: lettersTaught === LETTERS.length ? null : `Disponible quand les 33 lettres auront été présentées (${lettersTaught}/33).`,
          passed: runs.rows.some((r) => r.assessment_id === ALPHABET_ASSESSMENT_ID && r.passed),
        },
      ],
      runs: runs.rows.map((r) => ({
        id: r.id, assessment_id: r.assessment_id, state: r.state, passed: r.passed, started_at: r.started_at, submitted_at: r.submitted_at,
        parts: r.scores?.parts ?? null,
      })),
    };
  });

  /** Démarre (ou reprend) un passage : sujet inédit tiré au hasard. */
  app.post<{ Params: { id: string } }>('/v1/assessments/:id/start', async (req, reply) => {
    const userId = requireUser(req);
    if (req.params.id !== ALPHABET_ASSESSMENT_ID) throw notFound('Bilan');
    const taught = await loadTaught(ctx.db, ctx.content, userId);
    if (!LETTERS.every((l) => taught.has(`letter:${l.lower}`))) {
      throw conflict('assessment_not_ready', 'Ce bilan sera disponible quand les 33 lettres auront été présentées.');
    }
    const now = ctx.clock.now();
    const run = await withTx(ctx.db, async (tx) => {
      await tx.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]);
      const open = await tx.query<RunRow>("SELECT * FROM assessment_runs WHERE user_id = $1 AND assessment_id = $2 AND state = 'in_progress'", [userId, req.params.id]);
      if (open.rowCount) return { row: open.rows[0]!, resumed: true };
      const id = randomUUID();
      const spec = buildAlphabetAssessment(id, LETTERS, ASSESSMENT_WORDS);
      const ins = await tx.query<RunRow>(
        'INSERT INTO assessment_runs (id, user_id, assessment_id, version, spec, started_at) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
        [id, userId, spec.id, spec.version, JSON.stringify(spec), now],
      );
      await appendEvent(tx, userId, 'assessment.started', { run_id: id, assessment: spec.id });
      return { row: ins.rows[0]!, resumed: false };
    });
    reply.code(run.resumed ? 200 : 201);
    return { resumed: run.resumed, run: clientView(run.row) };
  });

  app.get<{ Params: { runId: string } }>('/v1/assessments/runs/:runId', async (req) => {
    const userId = requireUser(req);
    return { run: clientView(await getRun(userId, req.params.runId)) };
  });

  /** Enregistre une réponse, sans aucun retour sur sa justesse (mode examen). */
  app.post<{ Params: { runId: string } }>('/v1/assessments/runs/:runId/answers', async (req) => {
    const userId = requireUser(req);
    const body = parse(answerBody, req.body);
    return withTx(ctx.db, async (tx) => {
      const r = await getRun(userId, req.params.runId, true, tx);
      if (r.state !== 'in_progress') throw conflict('assessment_closed', 'Ce bilan est déjà remis.');
      if (!r.spec.tasks[body.task_index]) throw notFound('Question');
      const answers = { ...r.answers, [String(body.task_index)]: body.answer };
      await tx.query('UPDATE assessment_runs SET answers = $2 WHERE id = $1', [r.id, JSON.stringify(answers)]);
      return { saved: true, answered: Object.keys(answers).length, total: r.spec.tasks.length };
    });
  });

  /** Remise : notation côté serveur, résultat conservé (AssessmentResult). Idempotent. */
  app.post<{ Params: { runId: string } }>('/v1/assessments/runs/:runId/submit', async (req) => {
    const userId = requireUser(req);
    const now = ctx.clock.now();
    return withTx(ctx.db, async (tx) => {
      const r = await getRun(userId, req.params.runId, true, tx);
      if (r.state === 'submitted') return { run: clientView(r) };
      if (r.state !== 'in_progress') throw new ApiError(409, 'assessment_closed', 'Ce bilan n’est plus ouvert.');
      const score = scoreAssessment(r.spec, new Map(Object.entries(r.answers).map(([k, v]) => [Number(k), v])));
      const upd = await tx.query<RunRow>(
        "UPDATE assessment_runs SET state = 'submitted', scores = $2, passed = $3, submitted_at = $4 WHERE id = $1 RETURNING *",
        [r.id, JSON.stringify(score), score.passed, now],
      );
      await appendEvent(tx, userId, 'assessment.completed', { run_id: r.id, assessment: r.assessment_id, passed: score.passed, parts: score.parts.map((p) => ({ part: p.part, rate: p.rate })) });
      return { run: clientView(upd.rows[0]!) };
    });
  });
}
