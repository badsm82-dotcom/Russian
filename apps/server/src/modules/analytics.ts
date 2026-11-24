/**
 * Analytics / tableau de bord (§12, F11). Chaque compétence est mesurée séparément : aucun score global
 * ne masque une faiblesse. Les compétences sans mesure fiable sont indiquées « non évalué » / « données insuffisantes ».
 */
import type { FastifyInstance } from 'fastify';
import {
  activeMastery,
  alphabetExitStatus,
  bridgeEffectReport,
  isReceptivelyKnown,
  localDayKey,
  masteryScore,
  type BridgeEffectSample,
  type ExerciseType,
  type HistoryAttempt,
  type SkillDomain,
} from '@r365/domain';
import type { AppContext } from '../context.js';
import { isScored, loadAttempts, loadProfile, loadTaught, type AttemptRow } from '../learner-state.js';
import { requireUser } from './auth.js';
import { letterAttempts } from './sessions.js';
import { ROADMAP } from './curriculum.js';

const DAY = 86_400_000;
const MAX_ACTIVE_ATTEMPT_MS = 120_000;
const TEACH_ACTIVE_MS = 30_000;

const DOMAIN_TYPES: Partial<Record<SkillDomain, ExerciseType[]>> = {
  reading: ['decoding', 'lexical_recognition'],
  writing: ['letter_recall', 'active_recall', 'dictation', 'fill_blank', 'transformation'],
  listening: ['listening'],
  grammar: ['fill_blank', 'transformation'],
};

const ERROR_LABELS_FR: Record<string, string> = {
  spelling: 'orthographe (une lettre)',
  form: 'forme attendue',
  decoding: 'lecture / décodage',
  case: 'majuscule/minuscule',
  yo_missing: 'ё attendu',
  latin_script: 'saisie en lettres latines',
  dont_know: '« je ne sais pas »',
};

function toHistory(a: AttemptRow): HistoryAttempt {
  return { competency: a.competency, grade: a.grade ?? 0, assisted: a.assisted, created_at: a.occurred_at, in_context: a.in_context };
}

function isoWeek(d: Date, tz: string): string {
  const [y, m, day] = localDayKey(d, tz).split('-').map(Number) as [number, number, number];
  const t = new Date(Date.UTC(y, m - 1, day));
  const dow = (t.getUTCDay() + 6) % 7;
  t.setUTCDate(t.getUTCDate() - dow + 3);
  const firstThursday = new Date(Date.UTC(t.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((t.getTime() - firstThursday.getTime()) / DAY - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${t.getUTCFullYear()}-S${String(week).padStart(2, '0')}`;
}

function retentionRate(scored: AttemptRow[], minDays: number): { rate: number | null; n: number } {
  const last = new Map<string, Date>();
  let n = 0;
  let ok = 0;
  for (const a of scored) {
    const k = `${a.item_slug}|${a.competency}`;
    const prev = last.get(k);
    if (prev && a.occurred_at.getTime() - prev.getTime() >= minDays * DAY) {
      n++;
      if ((a.grade ?? 0) >= 2 && !a.assisted) ok++;
    }
    last.set(k, a.occurred_at);
  }
  return { rate: n ? ok / n : null, n };
}

export function registerAnalytics(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/analytics', async (req) => {
    const userId = requireUser(req);
    const now = ctx.clock.now();
    const [profile, attempts, taught] = await Promise.all([
      loadProfile(ctx.db, userId),
      loadAttempts(ctx.db, ctx.content, userId),
      loadTaught(ctx.db, ctx.content, userId),
    ]);
    const tz = profile.settings.timezone;
    const taughtRows = await ctx.db.query<{ item_id: string; taught_at: Date }>('SELECT item_id, taught_at FROM taught_items WHERE user_id = $1', [userId]);
    const dueCount = Number(
      (await ctx.db.query<{ n: string }>('SELECT count(*) AS n FROM review_states WHERE user_id = $1 AND due_at <= $2', [userId, now])).rows[0]?.n ?? 0,
    );
    const scored = attempts.filter(isScored);
    const exOf = (a: AttemptRow) => ctx.content.exerciseById.get(a.exercise_id);

    // Jours pratiqués et minutes actives (temps inactif exclu : durée plafonnée par tentative).
    const days = new Set<string>();
    for (const a of attempts) if (a.outcome !== 'abandoned') days.add(localDayKey(a.occurred_at, tz));
    for (const t of taughtRows.rows) days.add(localDayKey(t.taught_at, tz));
    const activeMs = attempts.reduce((acc, a) => acc + Math.min(a.duration_ms, MAX_ACTIVE_ATTEMPT_MS), 0) + taughtRows.rowCount! * TEACH_ACTIVE_MS;

    // Compétences séparées.
    const byDomain = (d: SkillDomain): AttemptRow[] => {
      if (d === 'alphabet') return scored.filter((a) => a.item_slug.startsWith('letter:'));
      if (d === 'vocabulary') return scored.filter((a) => a.item_slug.startsWith('lex:'));
      const types = DOMAIN_TYPES[d];
      if (!types) return [];
      return scored.filter((a) => {
        const ex = exOf(a);
        return ex ? types.includes(ex.type) || (d === 'grammar' && a.item_slug.startsWith('struct:')) : false;
      });
    };
    const skills = (['alphabet', 'reading', 'writing', 'listening', 'vocabulary', 'grammar', 'speaking', 'pronunciation'] as SkillDomain[]).map((d) => {
      if (d === 'speaking' || d === 'pronunciation') {
        return { domain: d, level: 'A0', score: null, status: 'not_evaluated', note_fr: 'Non évalué : pas encore d’évaluation orale (répétitions orales pratiquées, non notées).', attempts: 0, assisted_share: null };
      }
      const list = byDomain(d);
      const m = masteryScore(list.map(toHistory));
      return {
        domain: d,
        level: 'A0',
        score: m.score,
        components: m.components,
        status: m.insufficient_data ? 'insufficient_data' : 'measured',
        note_fr: m.insufficient_data ? 'Données insuffisantes.' : 'Score indicatif (45 % rappel, 25 % transfert, 20 % rétention, 10 % reconnaissance).',
        attempts: list.length,
        assisted_share: list.length ? list.filter((a) => a.assisted).length / list.length : null,
      };
    });

    // Vocabulaire actif/réceptif et lettres maîtrisées.
    const byItem = new Map<string, AttemptRow[]>();
    for (const a of scored) byItem.set(a.item_slug, [...(byItem.get(a.item_slug) ?? []), a]);
    let active = 0;
    let receptive = 0;
    let lettersMastered = 0;
    for (const [item, list] of byItem) {
      const h = list.map(toHistory);
      if (item.startsWith('letter:')) {
        const recall = h.some((x) => x.competency === 'recall' && x.grade >= 2 && !x.assisted);
        if (isReceptivelyKnown(h, tz) && recall) lettersMastered++;
      } else {
        if (activeMastery(h, tz).mastered) active++;
        if (isReceptivelyKnown(h, tz)) receptive++;
      }
    }

    // Erreurs fréquentes et confusions de lettres (« tu confonds Н et Р »).
    const errCount = new Map<string, number>();
    const confusions = new Map<string, number>();
    for (const a of scored.filter((x) => x.grade === 0)) {
      for (const c of a.error_codes) {
        if (c.startsWith('confusion:')) {
          const [right, chosen] = c.slice(10).split('>');
          const ex = exOf(a);
          const isLetterPair = right && chosen && ctx.content.letters.includes(right) && ctx.content.letters.includes(chosen);
          if (isLetterPair) confusions.set(`${right}|${chosen}`, (confusions.get(`${right}|${chosen}`) ?? 0) + 1);
          else if (ex) errCount.set(`choice:${ex.type}`, (errCount.get(`choice:${ex.type}`) ?? 0) + 1);
        } else errCount.set(c, (errCount.get(c) ?? 0) + 1);
      }
    }
    const frequentErrors = [...errCount]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([code, n]) => ({ code, count: n, label_fr: ERROR_LABELS_FR[code] ?? (code.startsWith('choice:') ? 'mauvais choix en QCM' : code) }));
    const letterConfusions = [...confusions]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => {
        const [r, c] = k.split('|');
        return { expected: r, chosen: c, count: n, message_fr: `Tu confonds ${r?.toUpperCase()} et ${c?.toUpperCase()}.` };
      });

    // Courbe hebdomadaire.
    const weeks = new Map<string, { attempts: number; autonomous_correct: number; active_minutes: number }>();
    for (const a of attempts) {
      const w = isoWeek(a.occurred_at, tz);
      const cur = weeks.get(w) ?? { attempts: 0, autonomous_correct: 0, active_minutes: 0 };
      if (isScored(a)) cur.attempts++;
      if ((a.grade ?? 0) >= 2 && !a.assisted && isScored(a)) cur.autonomous_correct++;
      cur.active_minutes += Math.min(a.duration_ms, MAX_ACTIVE_ATTEMPT_MS) / 60000;
      weeks.set(w, cur);
    }
    const weekly = [...weeks].sort((a, b) => a[0].localeCompare(b[0])).slice(-12).map(([week, v]) => ({ week, ...v, active_minutes: Math.round(v.active_minutes) }));

    // Effet des passerelles (J1/J7), descriptif uniquement.
    const shown = await ctx.db.query<{ concept_id: string }>("SELECT DISTINCT concept_id FROM bridge_attempts WHERE user_id = $1 AND context = 'lesson'", [userId]);
    const bridged = new Set(shown.rows.map((r) => r.concept_id));
    const samples: BridgeEffectSample[] = [];
    for (const t of taughtRows.rows) {
      const slug = ctx.content.itemSlug(t.item_id);
      if (!slug) continue;
      const recalls = (byItem.get(slug) ?? []).filter((a) => a.competency === 'recall' || a.competency === 'recognition');
      const inWindow = (minD: number, maxD: number) => {
        const a = recalls.find((x) => {
          const d = (x.occurred_at.getTime() - t.taught_at.getTime()) / DAY;
          return d >= minD && d <= maxD;
        });
        return a ? (a.grade ?? 0) >= 2 && !a.assisted : null;
      };
      samples.push({ with_bridge: bridged.has(slug), recall_d1: inWindow(0.8, 3), recall_d7: inWindow(6, 10) });
    }

    const alphabet = alphabetExitStatus(letterAttempts(ctx.content, attempts), ctx.content.letters, tz);
    const r7 = retentionRate(scored, 7);
    const r30 = retentionRate(scored, 30);
    const measured = skills.filter((s) => s.status === 'measured' && s.score !== null);
    const weakest = measured.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    const DOMAIN_FR: Record<string, string> = {
      alphabet: 'l’alphabet', reading: 'la lecture', writing: 'l’écriture', listening: 'l’écoute', vocabulary: 'le vocabulaire', grammar: 'la grammaire',
    };
    let action_fr: string;
    if (dueCount > 0) action_fr = `Faire une séance : ${dueCount} révision(s) en attente.`;
    else if (attempts.length === 0) action_fr = 'Commencer la première séance (aucune connaissance du russe requise).';
    else if (weakest && (weakest.score ?? 100) < 70) action_fr = `Renforcer ${DOMAIN_FR[weakest.domain] ?? weakest.domain} (score indicatif ${weakest.score}/100).`;
    else action_fr = 'Continuer le parcours : l’unité suivante s’ouvre quand la précédente est consolidée.';

    const month1 = ROADMAP[0]!;
    return {
      generated_at: now,
      days_practiced: days.size,
      active_minutes: Math.round(activeMs / 60000),
      active_minutes_note_fr: 'Estimation : durée de chaque réponse plafonnée à 2 min + 30 s par présentation ; temps inactif exclu.',
      items_due: dueCount,
      items_taught: taught.size,
      letters: { taught: [...taught].filter((t) => t.startsWith('letter:')).length, mastered: lettersMastered, total: ctx.content.letters.length },
      vocabulary: { active: active, receptive: receptive },
      skills,
      oral_time_without_help_seconds: null,
      reading_coverage: null,
      retention: { d7: r7, d30: r30 },
      frequent_errors: frequentErrors,
      letter_confusions: letterConfusions,
      weekly,
      alphabet_exit: alphabet,
      bridge_effect: bridgeEffectReport(samples),
      monthly_goal: {
        month: 1,
        target_active: month1.active,
        target_receptive: month1.receptive,
        actual_active: active,
        actual_receptive: receptive,
        gap_note_fr: 'Objectifs indicatifs et ajustables ; ne jamais accélérer artificiellement pour respecter le calendrier.',
      },
      next_action_fr: action_fr,
      limits_fr: [
        'Oral et prononciation : non évalués dans cette version (pas d’ASR ni d’évaluation phonétique).',
        'Lecture extensive et couverture lexicale : bibliothèque non encore disponible.',
        'Résultats internes inspirés du CECRL, sans valeur de certification.',
      ],
    };
  });
}
