import { randomUUID } from 'node:crypto';
/**
 * SessionPlanner + ExerciseEngine + ReviewScheduler côté serveur (§6, §8, §9, §16).
 * - séance planifiée de façon déterministe, persistée avec un curseur (reprise, AC07) ;
 * - présentation (ack) avant tout exercice évalué ; l'item est alors marqué « enseigné » ;
 * - tentative + état de révision dans une transaction ; idempotence par client_attempt_id (AC06) ;
 * - état de révision dérivé par repli chronologique des tentatives (reproductible, synchronisation hors ligne).
 */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import {
  activeMastery,
  alphabetExitStatus,
  applyAttempt,
  gradeAnswer,
  initialReviewState,
  isExerciseAvailable,
  lettersInText,
  missingPrerequisites,
  planSession,
  shouldShowTransliteration,
  simplificationActive,
  toClientExercise,
  SESSION_MINUTES,
  type AlphabetAttempt,
  type Competency,
  type ExerciseDef,
  type Grade,
  type HistoryAttempt,
  type PlannedStep,
  type ReviewState,
  type SessionMinutes,
} from '@r365/domain';
import type { AppContext } from '../context.js';
import { appendEvent, withTx, type Tx } from '../db.js';
import { ApiError, badRequest, conflict, notFound } from '../errors.js';
import { isScored, loadAttempts, loadProfile, loadStates, loadTaught, type AttemptRow } from '../learner-state.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';
import type { ContentRegistry } from '../content-registry.js';
import type { Db } from '../db.js';

/** Étape persistée : étape planifiée + identifiant d'exercice (version figée à la planification). */
export type StoredStep = PlannedStep & { exercise_id?: string; exercise_version?: number };

interface SessionRow {
  id: string;
  user_id: string;
  planned_minutes: number;
  mode: string;
  unit_id: string | null;
  steps: StoredStep[];
  explanations: { code: string; message_fr: string }[];
  cursor: number;
  assisted_steps: number[];
  state: 'active' | 'completed' | 'abandoned';
  started_at: Date;
  last_activity_at: Date;
  ended_at: Date | null;
}

const SESSION_STALE_MS = 24 * 3600_000;
const MAX_ACTIVE_ATTEMPT_MS = 120_000;
const RECALL_COMPETENCIES: ReadonlySet<Competency> = new Set(['recall', 'production', 'spelling']);

const createBody = z
  .object({
    minutes: z.union([z.literal(5), z.literal(15), z.literal(25), z.literal(35), z.literal(60)]).optional(),
    mode: z.enum(['standard', 'audio_only']).default('standard'),
    replace: z.boolean().default(false),
  })
  .strict();

const attemptBody = z
  .object({
    client_attempt_id: z.string().uuid(),
    exercise_id: z.string().uuid(),
    step_index: z.number().int().min(0),
    answer: z.object({ choice_id: z.string().max(100).optional(), text: z.string().max(500).optional(), dont_know: z.boolean().optional() }).strict(),
    assisted: z.boolean().default(false),
    abandoned: z.boolean().default(false),
    duration_ms: z.number().int().min(0).max(3_600_000),
    occurred_at: z.string().datetime().optional(),
    mode: z.enum(['standard', 'audio_unavailable', 'offline']).default('standard'),
  })
  .strict();

// ---------------------------------------------------------------------------
// Planification
// ---------------------------------------------------------------------------

export function letterAttempts(content: ContentRegistry, attempts: readonly AttemptRow[]): AlphabetAttempt[] {
  const out: AlphabetAttempt[] = [];
  for (const a of attempts) {
    if (!isScored(a) || a.grade === null) continue;
    const ex = content.exerciseById.get(a.exercise_id);
    if (!ex || !ex.item_id.startsWith('letter:')) continue;
    const kind = ex.controlled_transfer ? 'decoding_unseen' : a.competency === 'recall' ? 'recall' : 'recognition';
    out.push({ letter: ex.controlled_transfer ? null : ex.item_id.slice(7), kind, grade: a.grade, assisted: a.assisted, created_at: a.occurred_at });
  }
  return out;
}

async function buildPlan(q: Db | Tx, ctx: AppContext, userId: string, minutes: SessionMinutes) {
  // Requêtes séquentielles : `q` peut être un client de transaction (pas de requêtes concurrentes sur un client).
  const profile = await loadProfile(q, userId);
  const taught = await loadTaught(q, ctx.content, userId);
  const states = await loadStates(q, ctx.content, userId);
  const attempts = await loadAttempts(q, ctx.content, userId);
  const tz = profile.settings.timezone;
  const byItem = new Map<string, AttemptRow[]>();
  const lastAttemptAt = new Map<string, Date>();
  for (const a of attempts) {
    byItem.set(a.item_slug, [...(byItem.get(a.item_slug) ?? []), a]);
    const ex = ctx.content.exerciseById.get(a.exercise_id);
    if (ex) lastAttemptAt.set(ex.slug, a.occurred_at);
  }
  const simplified = new Set<string>();
  for (const [item, list] of byItem) {
    const lite = list.filter(isScored).map((a) => ({ grade: (a.grade ?? 0) as Grade, created_at: a.occurred_at }));
    if (simplificationActive(lite, tz)) simplified.add(item);
  }
  const alphabet = alphabetExitStatus(letterAttempts(ctx.content, attempts), ctx.content.letters, tz);
  const plan = planSession({
    minutes,
    now: ctx.clock.now(),
    timeZone: tz,
    units: ctx.content.units,
    exercises: ctx.content.exercises,
    taught,
    states,
    simplified,
    alphabetExitPassed: alphabet.passed,
    speakableItems: ctx.content.speakable,
    manualDifficulty: profile.settings.manual_difficulty,
    lastAttemptAt,
  });
  const steps: StoredStep[] = plan.steps.map((s) => {
    if (s.kind !== 'exercise') return s;
    const ex = ctx.content.exerciseBySlug.get(s.exercise_slug)!;
    return { ...s, exercise_id: ex.id, exercise_version: ex.version };
  });
  return { plan, steps };
}

// ---------------------------------------------------------------------------
// Hydratation pour le client (sans corrigé)
// ---------------------------------------------------------------------------

async function hydrate(ctx: AppContext, s: SessionRow) {
  const profile = await loadProfile(ctx.db, s.user_id);
  const states = await loadStates(ctx.db, ctx.content, s.user_id);
  // Lettres décodées de façon fiable : reconnaissance autonome réussie au moins deux fois (niveau ≥ 2).
  const reliable = new Set(
    states.filter((st) => st.item_id.startsWith('letter:') && st.competency === 'recognition' && st.stage >= 2).map((st) => st.item_id.slice(7)),
  );
  const mode = profile.settings.transliteration;
  const steps = s.steps.map((step, index) => {
    const base = { index, kind: step.kind, purpose: 'purpose' in step ? step.purpose : 'new', item_id: step.item_id };
    if (step.kind === 'exercise') {
      const ex = ctx.content.exerciseById.get(step.exercise_id ?? '') ?? ctx.content.exerciseBySlug.get(step.exercise_slug);
      if (!ex) return { ...base, kind: 'unavailable' as const };
      const shown = ex.stimulus.ru ? [...lettersInText(ex.stimulus.ru)] : [];
      // Pictogrammes : sur les choix de sens (ids = items), et à côté de la consigne seulement quand le sens
      // est déjà donné en français (rappel, production) — jamais quand l'image révélerait la réponse.
      const emojiOf = (id: string) => ctx.content.cards.get(id)?.emoji;
      const choiceEmojis = Object.fromEntries((ex.choices ?? []).map((c) => [c.id, emojiOf(c.id)]).filter(([, e]) => !!e));
      const promptGivesMeaning = ex.type === 'active_recall' || ex.type === 'fill_blank' || ex.type === 'transformation';
      return {
        ...base,
        choice_emojis: choiceEmojis,
        prompt_emoji: promptGivesMeaning ? (emojiOf(ex.item_id) ?? null) : null,
        exercise: toClientExercise(ex),
        show_transliteration: false, // jamais pendant un exercice évalué : la translittération serait la réponse
        letters_unreliable: shown.filter((l) => !reliable.has(l)),
      };
    }
    const card = ctx.content.cards.get(step.item_id);
    return {
      ...base,
      alternative_explanation: step.kind === 'teach' ? step.alternative_explanation : false,
      card,
      show_transliteration: card ? shouldShowTransliteration(mode, card.letters, reliable) : true,
    };
  });
  return {
    id: s.id,
    planned_minutes: s.planned_minutes,
    mode: s.mode,
    unit_id: s.unit_id,
    state: s.state,
    cursor: s.cursor,
    started_at: s.started_at,
    ended_at: s.ended_at,
    explanations: s.explanations,
    assisted_steps: s.assisted_steps,
    steps,
    settings: {
      show_stress_marks: profile.settings.show_stress_marks,
      audio_rate: profile.settings.audio_rate,
      bridges_enabled: profile.settings.bridges_enabled,
      microphone_consent: profile.settings.microphone_consent,
    },
  };
}

async function getSessionRow(q: Db | Tx, userId: string, id: string, lock = false): Promise<SessionRow> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) throw notFound('Séance');
  const r = await q.query<SessionRow>(`SELECT * FROM sessions WHERE id = $1 AND user_id = $2${lock ? ' FOR UPDATE' : ''}`, [id, userId]);
  if (!r.rowCount) throw notFound('Séance'); // 404 aussi pour la séance d'un autre compte (AC14)
  return r.rows[0]!;
}

// ---------------------------------------------------------------------------
// Repli chronologique des tentatives → état de révision (reproductible)
// ---------------------------------------------------------------------------

export async function recomputeState(tx: Tx, ctx: AppContext, userId: string, itemUuid: string, itemSlug: string, competency: Competency, timeZone: string) {
  const r = await tx.query<{ grade: Grade | null; outcome: string; assisted: boolean; occurred_at: Date; in_context: boolean; competency: Competency }>(
    `SELECT grade, outcome, assisted, occurred_at, in_context, competency FROM attempts
     WHERE user_id = $1 AND item_id = $2 ORDER BY occurred_at, created_at, id`,
    [userId, itemUuid],
  );
  let state: ReviewState = initialReviewState(itemSlug, competency);
  let lastEarly = false;
  let lastRemediation = false;
  for (const a of r.rows) {
    if (a.competency !== competency) continue;
    const res = applyAttempt(
      state,
      { grade: (a.grade ?? 0) as Grade, assisted: a.assisted, abandoned: a.outcome === 'abandoned', unscorable: a.outcome === 'unscorable' },
      a.occurred_at,
    );
    state = res.state;
    lastEarly = res.early;
    lastRemediation = res.remediation;
  }
  // Statut de maîtrise active (rappels autonomes sur jours distincts + contexte) à partir de tout l'historique de l'item.
  const history: HistoryAttempt[] = r.rows
    .filter((a) => a.outcome === 'correct' || a.outcome === 'incorrect')
    .map((a) => ({ competency: a.competency, grade: (a.grade ?? 0) as Grade, assisted: a.assisted, created_at: a.occurred_at, in_context: a.in_context }));
  const verdict = activeMastery(history, timeZone);
  if (RECALL_COMPETENCIES.has(competency)) {
    if (verdict.mastered) state = { ...state, mastery_status: 'mastered' };
    else if (verdict.reopened && state.mastery_status === 'mastered') state = { ...state, mastery_status: 'reopened' };
  }
  await tx.query(
    `INSERT INTO review_states (user_id, item_id, competency, stage, due_at, last_grade, streak, remediation_pending, mastery_status, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, now())
     ON CONFLICT (user_id, item_id, competency) DO UPDATE SET stage = EXCLUDED.stage, due_at = EXCLUDED.due_at, last_grade = EXCLUDED.last_grade,
       streak = EXCLUDED.streak, remediation_pending = EXCLUDED.remediation_pending, mastery_status = EXCLUDED.mastery_status, updated_at = now()`,
    [userId, itemUuid, competency, state.stage, state.due_at, state.last_grade, state.streak, state.remediation_pending, state.mastery_status],
  );
  return { state, early: lastEarly, remediation: lastRemediation };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

export function registerSessions(app: FastifyInstance, ctx: AppContext): void {
  app.post('/v1/sessions', async (req, reply) => {
    const userId = requireUser(req);
    const body = parse(createBody, req.body);
    const profile = await loadProfile(ctx.db, userId);
    const minutes = (body.minutes ?? (SESSION_MINUTES.includes(profile.daily_minutes as SessionMinutes) ? profile.daily_minutes : 35)) as SessionMinutes;
    const now = ctx.clock.now();
    const row = await withTx(ctx.db, async (tx) => {
      await tx.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [userId]); // sérialise la création par apprenant
      const active = await tx.query<SessionRow>("SELECT * FROM sessions WHERE user_id = $1 AND state = 'active'", [userId]);
      const cur = active.rows[0];
      if (cur) {
        const stale = now.getTime() - new Date(cur.last_activity_at).getTime() > SESSION_STALE_MS;
        if (!body.replace && !stale) return { row: cur, resumed: true };
        await tx.query("UPDATE sessions SET state = 'abandoned', ended_at = $2 WHERE id = $1", [cur.id, now]);
        await appendEvent(tx, userId, 'session.abandoned', { session_id: cur.id, cursor: cur.cursor });
      }
      const { plan, steps } = await buildPlan(tx, ctx, userId, minutes);
      const ins = await tx.query<SessionRow>(
        `INSERT INTO sessions (id, user_id, planned_minutes, mode, unit_id, steps, explanations, started_at, last_activity_at)
         VALUES ($8,$1,$2,$3,$4,$5,$6,$7,$7) RETURNING *`,
        [userId, minutes, body.mode, plan.unit_id, JSON.stringify(steps), JSON.stringify(plan.explanations), now, randomUUID()],
      );
      await appendEvent(tx, userId, 'session.started', { session_id: ins.rows[0]!.id, minutes, new_items: plan.new_items, review_count: plan.review_count });
      return { row: ins.rows[0]!, resumed: false };
    });
    reply.code(row.resumed ? 200 : 201);
    return { resumed: row.resumed, session: await hydrate(ctx, row.row) };
  });

  app.get('/v1/sessions/current', async (req) => {
    const userId = requireUser(req);
    const r = await ctx.db.query<SessionRow>("SELECT * FROM sessions WHERE user_id = $1 AND state = 'active'", [userId]);
    return { session: r.rows[0] ? await hydrate(ctx, r.rows[0]) : null };
  });

  app.get<{ Params: { id: string } }>('/v1/sessions/:id', async (req) => {
    const userId = requireUser(req);
    return { session: await hydrate(ctx, await getSessionRow(ctx.db, userId, req.params.id)) };
  });

  /** Présentation vue (teach) ou répétition orale faite (speak) : l'item devient « enseigné ». Idempotent. */
  app.post<{ Params: { id: string; index: string } }>('/v1/sessions/:id/steps/:index/ack', async (req) => {
    const userId = requireUser(req);
    const index = Number(req.params.index);
    if (!Number.isInteger(index) || index < 0) throw badRequest('Index invalide');
    const now = ctx.clock.now();
    return withTx(ctx.db, async (tx) => {
      const s = await getSessionRow(tx, userId, req.params.id, true);
      if (s.state !== 'active') throw conflict('session_not_active', 'Cette séance est terminée.');
      const step = s.steps[index];
      if (!step) throw notFound('Étape');
      if (step.kind === 'exercise') throw badRequest('Un exercice se valide par une tentative.');
      if (index > s.cursor) throw conflict('step_out_of_order', 'Termine d’abord l’étape en cours.');
      if (step.kind === 'teach') {
        const ins = await tx.query(
          'INSERT INTO taught_items (user_id, item_id, session_id, taught_at) VALUES ($1,$2,$3,$4) ON CONFLICT DO NOTHING',
          [userId, ctx.content.itemUuid(step.item_id), s.id, now],
        );
        if (ins.rowCount) await appendEvent(tx, userId, 'item.taught', { item: step.item_id, session_id: s.id });
      } else {
        await appendEvent(tx, userId, 'speaking.practiced', { item: step.item_id, session_id: s.id, evaluated: false });
      }
      const cursor = Math.max(s.cursor, index + 1);
      await tx.query('UPDATE sessions SET cursor = $2, last_activity_at = $3 WHERE id = $1', [s.id, cursor, now]);
      return { cursor };
    });
  });

  /**
   * Paquet hors ligne : définitions complètes des exercices de la séance, pour corriger sur l'appareil sans réseau.
   * Le serveur recorrige chaque réponse à la synchronisation et reste la seule référence.
   * (À ne jamais servir en mode examen, qui n'existe pas encore.)
   */
  app.get<{ Params: { id: string } }>('/v1/sessions/:id/offline-pack', async (req) => {
    const userId = requireUser(req);
    const s = await getSessionRow(ctx.db, userId, req.params.id);
    if (s.mode === 'exam') throw conflict('exam_mode', 'Pas de correction hors ligne en mode examen.');
    const ids = new Set(s.steps.filter((x) => x.kind === 'exercise').map((x) => x.exercise_id ?? ''));
    return { session_id: s.id, exercises: [...ids].map((id) => ctx.content.exerciseById.get(id)).filter(Boolean) };
  });

  /** Indice : la réponse de cette étape sera comptée comme assistée, quoi que déclare le client. */
  app.post<{ Params: { id: string; index: string } }>('/v1/sessions/:id/steps/:index/hint', async (req) => {
    const userId = requireUser(req);
    const index = Number(req.params.index);
    return withTx(ctx.db, async (tx) => {
      const s = await getSessionRow(tx, userId, req.params.id, true);
      const step = s.steps[index];
      if (!step || step.kind !== 'exercise') throw notFound('Exercice');
      const ex = ctx.content.exerciseById.get(step.exercise_id ?? '');
      if (!ex) throw notFound('Exercice');
      await markAssisted(tx, s, index);
      return { hint_fr: ex.hints[0] ?? 'Relis la fiche de présentation de cet élément.', assisted: true };
    });
  });

  app.post<{ Params: { id: string } }>('/v1/sessions/:id/attempts', async (req, reply) => {
    const userId = requireUser(req);
    const body = parse(attemptBody, req.body);
    const now = ctx.clock.now();
    const result = await withTx(ctx.db, async (tx) => {
      const s = await getSessionRow(tx, userId, req.params.id, true);
      // Idempotence (AC06) : vérifiée après le verrou de séance, donc visible même pour une requête concurrente.
      const prior = await tx.query<{ id: string; outcome: string; grade: number | null; feedback_fr: string; error_codes: string[]; exercise_id: string; item_id: string; competency: Competency }>(
        'SELECT id, outcome, grade, feedback_fr, error_codes, exercise_id, item_id, competency FROM attempts WHERE user_id = $1 AND client_attempt_id = $2',
        [userId, body.client_attempt_id],
      );
      if (prior.rowCount) {
        const p = prior.rows[0]!;
        const st = await tx.query<{ due_at: Date | null; mastery_status: string }>(
          'SELECT due_at, mastery_status FROM review_states WHERE user_id = $1 AND item_id = $2 AND competency = $3',
          [userId, p.item_id, p.competency],
        );
        const ex = ctx.content.exerciseById.get(p.exercise_id);
        return {
          replayed: true,
          attempt_id: p.id,
          outcome: p.outcome,
          grade: p.grade,
          accepted: p.outcome === 'correct',
          feedback_fr: p.feedback_fr,
          expected: ex ? expectedOf(ex) : '',
          error_codes: p.error_codes,
          review_due_at: st.rows[0]?.due_at ?? null,
          mastery_status: st.rows[0]?.mastery_status ?? 'new',
          cursor: s.cursor,
        };
      }
      if (s.state !== 'active') throw conflict('session_not_active', 'Cette séance est terminée.');
      const step = s.steps[body.step_index];
      if (!step || step.kind !== 'exercise') throw notFound('Exercice de séance');
      if (step.exercise_id !== body.exercise_id) throw conflict('exercise_mismatch', 'Cet exercice ne correspond pas à l’étape.');
      if (body.step_index > s.cursor) throw conflict('step_out_of_order', 'Termine d’abord l’étape en cours.');
      const ex = ctx.content.exerciseById.get(body.exercise_id);
      if (!ex) throw new ApiError(409, 'exercise_retired', 'Exercice retiré.');

      // AC03/AC20 : aucun exercice évalué sur un prérequis non enseigné.
      const taught = await loadTaught(tx, ctx.content, userId);
      if (!isExerciseAvailable(ex, taught)) {
        throw conflict('prerequisite_not_taught', 'Cet exercice demande un élément pas encore présenté.', missingPrerequisites(ex, taught));
      }

      const profile = await loadProfile(tx, userId);
      const itemUuid = ctx.content.itemUuid(ex.item_id);
      const prevState = await tx.query<{ last_grade: number | null }>(
        'SELECT last_grade FROM review_states WHERE user_id = $1 AND item_id = $2 AND competency = $3 FOR UPDATE',
        [userId, itemUuid, ex.competency],
      );
      const assisted = body.assisted || s.assisted_steps.includes(body.step_index);
      // Réponse « audio indisponible » : alternative sans prétendre valider l'écoute (§13).
      const audioUnavailable = body.mode === 'audio_unavailable' && (ex.type === 'listening' || ex.type === 'dictation');
      const occurredAt = clampOccurredAt(body.occurred_at, now);

      let outcome: 'correct' | 'incorrect' | 'unscorable' | 'abandoned';
      let grade: Grade | null;
      let feedback: string;
      let errorCodes: string[];
      let expected = '';
      if (body.abandoned || audioUnavailable) {
        outcome = 'abandoned';
        grade = null;
        feedback = audioUnavailable ? 'Audio indisponible : exercice passé, sans effet sur ta progression.' : 'Exercice interrompu : ce n’est pas un échec.';
        errorCodes = audioUnavailable ? ['audio_unavailable'] : [];
      } else if (body.answer.dont_know) {
        // « Je ne sais pas » : échec honnête (grade 0), la réponse est montrée pour apprendre.
        outcome = 'incorrect';
        grade = 0;
        feedback = 'Pas de souci : voici la réponse, elle reviendra bientôt.';
        errorCodes = ['dont_know'];
        expected = expectedOf(ex);
      } else {
        const g = gradeAnswer(ex, body.answer, {
          assisted,
          duration_ms: body.duration_ms,
          previous_grade: (prevState.rows[0]?.last_grade ?? null) as Grade | null,
        });
        outcome = g.outcome;
        grade = g.outcome === 'unscorable' ? null : g.grade;
        feedback = g.feedback_fr;
        errorCodes = g.error_codes;
        expected = g.outcome === 'unscorable' ? '' : g.expected;
      }
      const inContext = !!ex.controlled_transfer || ex.competency === 'transfer';
      const ins = await tx.query<{ id: string }>(
        `INSERT INTO attempts (id, user_id, client_attempt_id, session_id, step_index, exercise_id, exercise_version, item_id, competency, purpose, mode,
           answer, outcome, grade, assisted, in_context, duration_ms, error_codes, feedback_fr, occurred_at)
         VALUES ($20,$1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
        [userId, body.client_attempt_id, s.id, body.step_index, ex.id, ex.version, itemUuid, ex.competency, step.purpose, body.mode,
          JSON.stringify(body.answer), outcome, grade, assisted, inContext, body.duration_ms, errorCodes, feedback, occurredAt, randomUUID()],
      );
      const attemptId = ins.rows[0]!.id;
      const { state, early, remediation } = await recomputeState(tx, ctx, userId, itemUuid, ex.item_id, ex.competency, profile.settings.timezone);
      await tx.query('UPDATE attempts SET early_review = $2, remediation = $3 WHERE id = $1', [attemptId, early, remediation]);

      // Avancement du curseur ; une réponse non notable (ex. saisie latine) laisse réessayer la même étape.
      let cursor = s.cursor;
      let steps = s.steps;
      let remediationAdded = false;
      if (outcome !== 'unscorable' && body.step_index === s.cursor) cursor = s.cursor + 1;
      // Hors ligne, le client rejoue ses étapes avec les index de sa copie : pas d'insertion qui décalerait la suite.
      if (outcome === 'incorrect' && step.purpose !== 'remediation' && body.mode !== 'offline') {
        // Remédiation dans la même séance, quelques étapes plus loin (« revoir dans 10 minutes »).
        const already = steps.slice(body.step_index + 1).some((x) => x.kind === 'exercise' && x.item_id === ex.item_id && x.purpose === 'remediation');
        if (!already) {
          // Variante plus simple seulement si tous ses prérequis sont déjà enseignés (AC20), sinon le même exercice.
          const easier = ctx.content.exerciseBySlug.get(ex.easier_exercise_slug ?? '');
          const target = easier && isExerciseAvailable(easier, taught) ? easier : ex;
          const rem: StoredStep = {
            kind: 'exercise', exercise_slug: target.slug, exercise_id: target.id, exercise_version: target.version,
            item_id: target.item_id, competency: target.competency, purpose: 'remediation',
          };
          const at = Math.min(steps.length, body.step_index + 4);
          steps = [...steps.slice(0, at), rem, ...steps.slice(at)];
          remediationAdded = true;
        }
      }
      await tx.query('UPDATE sessions SET cursor = $2, steps = $3, last_activity_at = $4 WHERE id = $1', [s.id, cursor, JSON.stringify(steps), now]);
      await appendEvent(tx, userId, 'attempt.recorded', { attempt_id: attemptId, exercise: ex.slug, outcome, grade, assisted });
      if (outcome === 'correct' || outcome === 'incorrect') {
        await appendEvent(tx, userId, 'review.scheduled', { item: ex.item_id, competency: ex.competency, stage: state.stage, due_at: state.due_at, early_review: early });
        await appendEvent(tx, userId, 'mastery.updated', { item: ex.item_id, competency: ex.competency, status: state.mastery_status });
      }
      return {
        replayed: false,
        attempt_id: attemptId,
        outcome,
        grade,
        accepted: outcome === 'correct',
        feedback_fr: feedback,
        expected,
        error_codes: errorCodes,
        explanation_fr: outcome === 'incorrect' ? (ex.explanation_fr ?? null) : null,
        review_due_at: state.due_at,
        mastery_status: state.mastery_status,
        early_review: early,
        remediation_step_added: remediationAdded,
        cursor,
      };
    });
    reply.code(result.replayed ? 200 : 201);
    return result;
  });

  app.post<{ Params: { id: string } }>('/v1/sessions/:id/complete', async (req) => {
    const userId = requireUser(req);
    const now = ctx.clock.now();
    return withTx(ctx.db, async (tx) => {
      const s = await getSessionRow(tx, userId, req.params.id, true);
      if (s.state === 'completed') return { state: s.state, summary: await sessionSummary(tx, s.id) };
      if (s.state !== 'active') throw conflict('session_not_active', 'Cette séance n’est plus active.');
      await tx.query("UPDATE sessions SET state = 'completed', ended_at = $2, last_activity_at = $2 WHERE id = $1", [s.id, now]);
      const summary = await sessionSummary(tx, s.id);
      await appendEvent(tx, userId, 'session.completed', { session_id: s.id, ...summary });
      return { state: 'completed', summary };
    });
  });

  app.get('/v1/reviews/due', async (req) => {
    const userId = requireUser(req);
    const now = ctx.clock.now();
    const r = await ctx.db.query<{ item_id: string; competency: string; stage: number; due_at: Date }>(
      `SELECT item_id, competency, stage, due_at FROM review_states WHERE user_id = $1 AND due_at IS NOT NULL AND due_at <= $2 ORDER BY due_at LIMIT 500`,
      [userId, now],
    );
    const items = r.rows.map((x) => {
      const slug = ctx.content.itemSlug(x.item_id) ?? '';
      const card = ctx.content.cards.get(slug);
      return { item_id: slug, competency: x.competency, stage: x.stage, due_at: x.due_at, title_fr: card?.title_fr ?? slug, ru: card?.ru ?? '' };
    });
    return { now, count: items.length, items };
  });
}

async function markAssisted(tx: Tx, s: SessionRow, index: number): Promise<void> {
  if (!s.assisted_steps.includes(index)) {
    await tx.query('UPDATE sessions SET assisted_steps = array_append(assisted_steps, $2) WHERE id = $1', [s.id, index]);
  }
}

export async function markStepAssisted(tx: Tx, userId: string, sessionId: string, index: number): Promise<void> {
  const s = await getSessionRow(tx, userId, sessionId, true);
  const step = s.steps[index];
  if (step?.kind === 'exercise') await markAssisted(tx, s, index);
}

function expectedOf(ex: ExerciseDef): string {
  const a = ex.answer;
  if (a.kind === 'choice') return ex.choices?.find((c) => c.id === a.correct)?.label ?? '';
  if (a.kind === 'cyrillic') return a.accepted[0] ?? '';
  return a.variants[0] ?? '';
}

/** Horodatage client accepté pour la synchronisation hors ligne s'il est plausible (≤ 30 j, pas dans le futur). */
function clampOccurredAt(iso: string | undefined, now: Date): Date {
  if (!iso) return now;
  const t = new Date(iso);
  if (Number.isNaN(t.getTime())) return now;
  if (t.getTime() > now.getTime() + 120_000) return now;
  if (now.getTime() - t.getTime() > 30 * 86_400_000) return now;
  return t;
}

async function sessionSummary(tx: Tx, sessionId: string) {
  const r = await tx.query<{ outcome: string; grade: number | null; assisted: boolean; duration_ms: number }>(
    'SELECT outcome, grade, assisted, duration_ms FROM attempts WHERE session_id = $1',
    [sessionId],
  );
  const scored = r.rows.filter((a) => a.outcome === 'correct' || a.outcome === 'incorrect');
  return {
    attempts: r.rows.length,
    scored: scored.length,
    correct_autonomous: scored.filter((a) => (a.grade ?? 0) >= 2 && !a.assisted).length,
    correct_assisted: scored.filter((a) => a.grade === 1).length,
    incorrect: scored.filter((a) => a.grade === 0).length,
    active_seconds: Math.round(r.rows.reduce((acc, a) => acc + Math.min(a.duration_ms, MAX_ACTIVE_ATTEMPT_MS), 0) / 1000),
  };
}
