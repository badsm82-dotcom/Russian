/**
 * SessionPlanner — générateur de séance adaptative (§6, F04).
 * Entrées : éléments dus, lacunes, prérequis disponibles, unité courante.
 * Règles : plafonner les nouveautés ; réserver du temps à la production ; mélanger les types ;
 * dette de révision > 2 séances → pas de nouveauté (les tâches dues restent) ;
 * 3 échecs sur un concept → autre explication + exercice plus simple, jusqu'à deux réussites espacées.
 * Toute nouveauté est précédée d'une présentation (son, traduction, démonstration) avant exercice évalué.
 */
import type { ExerciseDef } from './exercise.js';
import { isExerciseAvailable } from './prerequisites.js';
import { compareDueUrgency, isDue } from './scheduler.js';
import type { Competency, Grade, ReviewState } from './types.js';
import { localDayKey } from './mastery.js';

export type SessionMinutes = 5 | 15 | 25 | 35 | 60;
export const SESSION_MINUTES: readonly SessionMinutes[] = [5, 15, 25, 35, 60];

export interface UnitDef {
  id: string;
  order: number;
  level: 'A0' | 'A1' | 'A2';
  title_fr: string;
  mission_fr: string;
  /** Items introduits dans l'unité, dans l'ordre de présentation. */
  items: string[];
  /** L'unité exige la sortie du module alphabet (§5). */
  requires_alphabet_exit?: boolean;
}

export type StepPurpose = 'review' | 'new' | 'remediation' | 'transfer' | 'production' | 'practice';

export type PlannedStep =
  | { kind: 'teach'; item_id: string; alternative_explanation: boolean }
  | { kind: 'exercise'; exercise_slug: string; item_id: string; competency: Competency; purpose: StepPurpose }
  /** Production orale non évaluée (répéter après l'audio) : fonctionne sans microphone. */
  | { kind: 'speak'; item_id: string; purpose: 'production' };

export interface PlannerInput {
  minutes: SessionMinutes;
  now: Date;
  timeZone: string;
  units: readonly UnitDef[];
  exercises: readonly ExerciseDef[];
  taught: ReadonlySet<string>;
  states: readonly ReviewState[];
  /** Items en mode simplifié (voir simplificationActive). */
  simplified: ReadonlySet<string>;
  alphabetExitPassed: boolean;
  /** Items oraux (lexèmes/structures) pouvant faire l'objet d'une répétition orale. */
  speakableItems: ReadonlySet<string>;
  manualDifficulty?: 'auto' | 'easier' | 'harder';
  unitCompletionThreshold?: number;
  /** Dernière tentative par exercice : sert à varier les exercices d'un même item. */
  lastAttemptAt?: ReadonlyMap<string, Date>;
}

export interface PlanExplanation {
  code: string;
  message_fr: string;
}

export interface SessionPlan {
  minutes: SessionMinutes;
  unit_id: string | null;
  steps: PlannedStep[];
  estimated_seconds: number;
  new_items: string[];
  review_count: number;
  explanations: PlanExplanation[];
}

const STEP_SECONDS = { teach: 45, choice: 20, typed: 35, speak: 30 } as const;

function exerciseSeconds(ex: ExerciseDef): number {
  return ex.answer.kind === 'choice' ? STEP_SECONDS.choice : STEP_SECONDS.typed;
}

export function stepSeconds(step: PlannedStep, bySlug: ReadonlyMap<string, ExerciseDef>): number {
  if (step.kind === 'teach') return STEP_SECONDS.teach;
  if (step.kind === 'speak') return STEP_SECONDS.speak;
  const ex = bySlug.get(step.exercise_slug);
  return ex ? exerciseSeconds(ex) : STEP_SECONDS.choice;
}

/** Plafond de nouveautés par durée (5–8 lemmes pour 35 min, ajustable). */
export const NEW_ITEM_CAP: Record<SessionMinutes, number> = { 5: 0, 15: 4, 25: 6, 35: 8, 60: 10 };

/** Répartition du temps en secondes par phase (§6). */
export function phaseBudget(minutes: SessionMinutes): { review: number; discovery: number; practice: number; production: number } {
  const m = (x: number) => x * 60;
  switch (minutes) {
    case 5:
      return { review: m(4), discovery: 0, practice: 0, production: m(1) };
    case 15:
      return { review: m(5), discovery: m(4), practice: m(6), production: 0 };
    case 25:
      return { review: m(6), discovery: m(6), practice: m(6), production: m(7) };
    case 35:
      return { review: m(7), discovery: m(8), practice: m(12), production: m(8) };
    case 60:
      return { review: m(10), discovery: m(12), practice: m(23), production: m(15) };
  }
}

/** Une unité est complétée quand ses items sont enseignés et qu'une part suffisante a déjà un rappel/reconnaissance autonome. */
export function unitCompleted(unit: UnitDef, taught: ReadonlySet<string>, states: readonly ReviewState[], threshold = 0.8): boolean {
  if (!unit.items.every((i) => taught.has(i))) return false;
  // Unité sans nouvel item (consolidation) : elle ne bloque pas la suite ; ses exercices restent proposés.
  if (unit.items.length === 0) return true;
  const succeeded = new Set(states.filter((s) => s.stage >= 1).map((s) => s.item_id));
  const n = unit.items.filter((i) => succeeded.has(i)).length;
  return n / Math.max(1, unit.items.length) >= threshold;
}

/** Unité courante : première unité non entièrement enseignée dont la précédente est complétée (progression par prérequis, pas par date). */
export function currentUnit(input: Pick<PlannerInput, 'units' | 'taught' | 'states' | 'alphabetExitPassed' | 'unitCompletionThreshold'>): {
  unit: UnitDef | null;
  blocked_by: string | null;
} {
  const units = [...input.units].sort((a, b) => a.order - b.order);
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (u.items.every((it) => input.taught.has(it))) continue;
    const prev = units[i - 1];
    if (prev && !unitCompleted(prev, input.taught, input.states, input.unitCompletionThreshold)) {
      return { unit: null, blocked_by: prev.id };
    }
    if (u.requires_alphabet_exit && !input.alphabetExitPassed) return { unit: null, blocked_by: 'alphabet_exit' };
    return { unit: u, blocked_by: null };
  }
  return { unit: null, blocked_by: null };
}

/**
 * Ordre maximal d'unité dont les exercices sont accessibles : on ne peut dépasser une unité non consolidée.
 * (Une unité sans nouvel item, comme la consolidation, exige aussi la consolidation de la précédente.)
 */
export function reachableUnitOrder(input: Pick<PlannerInput, 'units' | 'taught' | 'states' | 'unitCompletionThreshold'>): number {
  const units = [...input.units].sort((a, b) => a.order - b.order);
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    const prev = units[i - 1];
    if (prev && !unitCompleted(prev, input.taught, input.states, input.unitCompletionThreshold)) return prev.order;
    if (!u.items.every((it) => input.taught.has(it))) return u.order;
  }
  return units[units.length - 1]?.order ?? 0;
}

export interface ItemAttemptLite {
  grade: Grade;
  created_at: Date;
  abandoned?: boolean;
  unscorable?: boolean;
}

/**
 * Vrai si l'item a connu ≥ 3 échecs consécutifs et n'a pas encore eu deux réussites espacées (jours distincts) depuis.
 */
export function simplificationActive(history: readonly ItemAttemptLite[], timeZone = 'UTC'): boolean {
  const scored = history.filter((a) => !a.abandoned && !a.unscorable).sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  let active = false;
  let failRun = 0;
  let successDays = new Set<string>();
  for (const a of scored) {
    if (a.grade === 0) {
      failRun++;
      if (failRun >= 3) {
        active = true;
        successDays = new Set();
      }
    } else {
      failRun = 0;
      if (active && a.grade >= 2) {
        successDays.add(localDayKey(a.created_at, timeZone));
        if (successDays.size >= 2) active = false;
      }
    }
  }
  return active;
}

const RECOGNITION_FIRST: Competency[] = ['recognition', 'listening', 'recall', 'spelling', 'production', 'transfer'];

function pickExercise(
  candidates: readonly ExerciseDef[],
  simplified: boolean,
  difficulty: 'auto' | 'easier' | 'harder',
  avoidType: string | null,
  used: ReadonlySet<string>,
  lastAttemptAt: ReadonlyMap<string, Date> = new Map(),
): ExerciseDef | null {
  const pool = candidates.filter((e) => !used.has(e.slug));
  if (pool.length === 0) return null;
  const target = simplified || difficulty === 'easier' ? 1 : difficulty === 'harder' ? 3 : null;
  const last = (e: ExerciseDef) => lastAttemptAt.get(e.slug)?.getTime() ?? -1;
  return [...pool].sort((a, b) => {
    if (target !== null) {
      const d = Math.abs(a.difficulty - target) - Math.abs(b.difficulty - target);
      if (d !== 0) return d;
    }
    // Varier : exercice jamais fait, puis le moins récent (éviter les répétitions identiques).
    const r = last(a) - last(b);
    if (r !== 0) return r;
    if (target === null && a.difficulty !== b.difficulty) return a.difficulty - b.difficulty;
    const t = Number(a.type === avoidType) - Number(b.type === avoidType);
    if (t !== 0) return t;
    return a.slug.localeCompare(b.slug);
  })[0]!;
}

/** Réordonne pour éviter deux exercices identiques (même type) consécutifs, sans déplacer une présentation après ses exercices. */
export function interleave(steps: PlannedStep[], bySlug: ReadonlyMap<string, ExerciseDef>): PlannedStep[] {
  const out = [...steps];
  const typeOf = (s: PlannedStep | undefined) => (s?.kind === 'exercise' ? bySlug.get(s.exercise_slug)?.type ?? null : s?.kind ?? null);
  for (let i = 1; i < out.length; i++) {
    if (out[i]!.kind !== 'exercise' || typeOf(out[i]) !== typeOf(out[i - 1])) continue;
    for (let j = i + 1; j < out.length; j++) {
      if (out[j]!.kind !== 'exercise') break; // ne pas franchir une présentation
      if (typeOf(out[j]) !== typeOf(out[i - 1])) {
        const tmp = out[i]!;
        out[i] = out[j]!;
        out[j] = tmp;
        break;
      }
    }
  }
  return out;
}

export function planSession(input: PlannerInput): SessionPlan {
  const bySlug = new Map(input.exercises.map((e) => [e.slug, e]));
  const difficulty = input.manualDifficulty ?? 'auto';
  const budget = phaseBudget(input.minutes);
  const totalBudget = input.minutes * 60;
  const explanations: PlanExplanation[] = [];
  const steps: PlannedStep[] = [];
  const used = new Set<string>();
  let spent = 0;

  const reachable = reachableUnitOrder(input);
  const unitOrder = new Map(input.units.map((u) => [u.id, u.order]));
  const available = input.exercises.filter((e) => e.status !== 'retired' && (unitOrder.get(e.unit_id) ?? Infinity) <= reachable);
  const lastAt = input.lastAttemptAt ?? new Map<string, Date>();
  const byItemComp = new Map<string, ExerciseDef[]>();
  for (const e of available) {
    const k = `${e.item_id}|${e.competency}`;
    byItemComp.set(k, [...(byItemComp.get(k) ?? []), e]);
  }

  // 1. Révisions dues (urgence d'abord), uniquement sur des items enseignés.
  const due = input.states
    .filter((s) => isDue(s, input.now) && input.taught.has(s.item_id))
    .sort((a, b) => compareDueUrgency(a, b, input.now));
  const reviewSteps: PlannedStep[] = [];
  let lastType: string | null = null;
  for (const st of due) {
    const cands = (byItemComp.get(`${st.item_id}|${st.competency}`) ?? []).filter((e) => isExerciseAvailable(e, input.taught));
    const simplified = input.simplified.has(st.item_id);
    let ex = pickExercise(cands, simplified, difficulty, lastType, used, lastAt);
    if (!ex) continue;
    // Mode simplifié : variante plus facile prévue par le contenu (ex. QCM au lieu de saisie).
    if (simplified && ex.easier_exercise_slug) {
      const easier = bySlug.get(ex.easier_exercise_slug);
      if (easier && !used.has(easier.slug) && isExerciseAvailable(easier, input.taught)) ex = easier;
    }
    if (simplified && !reviewSteps.some((s) => s.kind === 'teach' && s.item_id === st.item_id)) {
      reviewSteps.push({ kind: 'teach', item_id: st.item_id, alternative_explanation: true });
    }
    reviewSteps.push({
      kind: 'exercise',
      exercise_slug: ex.slug,
      item_id: ex.item_id,
      competency: ex.competency,
      purpose: st.remediation_pending ? 'remediation' : 'review',
    });
    used.add(ex.slug);
    lastType = ex.type;
  }
  const reviewSecondsAll = reviewSteps.reduce((acc, s) => acc + stepSeconds(s, bySlug), 0);
  // Dette : temps de révision estimé > 2 séances → aucune nouveauté.
  const highDebt = reviewSecondsAll > 2 * totalBudget;
  if (highDebt) {
    explanations.push({
      code: 'review_debt',
      message_fr: 'Beaucoup de révisions en attente : pas de nouveauté aujourd’hui, on consolide d’abord.',
    });
  }
  // Les révisions prioritaires prennent le budget de révision (et tout le temps si dette élevée).
  const reviewCap = highDebt ? totalBudget : budget.review + (input.minutes === 5 ? budget.production : 0);
  for (const s of reviewSteps) {
    const sec = stepSeconds(s, bySlug);
    if (spent + sec > reviewCap && spent > 0) break;
    steps.push(s);
    spent += sec;
  }
  const reviewCount = steps.filter((s) => s.kind === 'exercise').length;
  if (simplifiedNotice(input, steps)) {
    explanations.push({ code: 'simplified', message_fr: 'Après plusieurs erreurs, une autre explication et un exercice plus simple sont proposés.' });
  }

  // 2. Nouveautés de l'unité courante.
  const newItems: string[] = [];
  const { unit, blocked_by } = currentUnit(input);
  if (blocked_by && !unit) {
    explanations.push({
      code: 'unit_locked',
      message_fr:
        blocked_by === 'alphabet_exit'
          ? 'Les unités A1 s’ouvrent après la validation de l’alphabet : on continue à le consolider.'
          : 'L’unité suivante s’ouvrira quand l’unité en cours sera consolidée.',
    });
  }
  const noReviewsAtAll = due.length === 0;
  let cap = NEW_ITEM_CAP[input.minutes];
  // Exception : une séance de 5 min sans aucune révision due introduit 2 éléments (sinon elle serait vide).
  if (input.minutes === 5 && noReviewsAtAll) cap = 2;
  if (difficulty === 'easier') cap = Math.max(1, Math.floor(cap * 0.6));
  if (unit && !highDebt && cap > 0) {
    const pending = unit.items.filter((i) => !input.taught.has(i)).slice(0, cap);
    const discoveryEnd = spent + budget.discovery + budget.practice + (input.minutes === 5 ? totalBudget : 0);
    const taughtSoFar = new Set(input.taught);
    // Petits groupes : présenter 2–3 items, puis les exercer en mélange.
    const groupSize = 3;
    for (let g = 0; g < pending.length; g += groupSize) {
      const group = pending.slice(g, g + groupSize);
      const groupSteps: PlannedStep[] = [];
      for (const item of group) {
        groupSteps.push({ kind: 'teach', item_id: item, alternative_explanation: false });
        taughtSoFar.add(item);
      }
      const exSteps: PlannedStep[] = [];
      for (const comp of RECOGNITION_FIRST) {
        for (const item of group) {
          const cands = (byItemComp.get(`${item}|${comp}`) ?? []).filter((e) => isExerciseAvailable(e, taughtSoFar));
          const ex = pickExercise(cands, false, difficulty, null, used, lastAt);
          if (!ex) continue;
          exSteps.push({ kind: 'exercise', exercise_slug: ex.slug, item_id: item, competency: comp, purpose: 'new' });
          used.add(ex.slug);
        }
      }
      const all = [...groupSteps, ...exSteps];
      const sec = all.reduce((acc, s) => acc + stepSeconds(s, bySlug), 0);
      if (spent + sec > discoveryEnd && newItems.length > 0) break;
      steps.push(...groupSteps, ...interleave(exSteps, bySlug));
      spent += sec;
      newItems.push(...group);
    }
  }

  // 2b. Compétences nouvellement accessibles sur des items déjà enseignés
  // (ex. lecture d'un mot appris à l'oral une fois ses lettres connues, dictée de consolidation).
  const allTaught = new Set([...input.taught, ...newItems]);
  if (!highDebt) {
    const hasState = new Set(input.states.map((s) => `${s.item_id}|${s.competency}`));
    const planned = new Set(steps.filter((s) => s.kind === 'exercise').map((s) => (s.kind === 'exercise' ? `${s.item_id}|${s.competency}` : '')));
    const unlockEnd = totalBudget - budget.production;
    const fresh = available
      .filter((e) => !e.controlled_transfer && input.taught.has(e.item_id) && !hasState.has(`${e.item_id}|${e.competency}`))
      .filter((e) => !planned.has(`${e.item_id}|${e.competency}`) && !used.has(e.slug) && isExerciseAvailable(e, allTaught))
      .sort((a, b) => (unitOrder.get(a.unit_id) ?? 0) - (unitOrder.get(b.unit_id) ?? 0) || a.difficulty - b.difficulty || a.slug.localeCompare(b.slug));
    const unlocked: PlannedStep[] = [];
    for (const ex of fresh) {
      const key = `${ex.item_id}|${ex.competency}`;
      if (planned.has(key)) continue;
      const sec = exerciseSeconds(ex);
      if (spent + sec > unlockEnd) break;
      unlocked.push({ kind: 'exercise', exercise_slug: ex.slug, item_id: ex.item_id, competency: ex.competency, purpose: 'new' });
      planned.add(key);
      used.add(ex.slug);
      spent += sec;
    }
    steps.push(...interleave(unlocked, bySlug));
  }

  // 3. Production (toujours réservée, y compris à 5 min) : répétition orale non évaluée.
  const speakCandidates = [...newItems, ...input.taught].filter((i) => input.speakableItems.has(i));
  const speakItem = speakCandidates[0];
  if (speakItem) {
    steps.push({ kind: 'speak', item_id: speakItem, purpose: 'production' });
    spent += STEP_SECONDS.speak;
  }

  // 4. Transfert : exercices de transfert contrôlé (mots inédits décodables) avec le temps restant.
  const transferPool = available.filter((e) => e.controlled_transfer && !used.has(e.slug) && isExerciseAvailable(e, allTaught));
  for (const ex of transferPool.sort((a, b) => a.difficulty - b.difficulty || a.slug.localeCompare(b.slug))) {
    const sec = exerciseSeconds(ex);
    if (spent + sec > totalBudget) break;
    if (input.states.some((s) => s.item_id === ex.item_id && s.competency === ex.competency && s.due_at && !isDue(s, input.now))) continue;
    steps.push({ kind: 'exercise', exercise_slug: ex.slug, item_id: ex.item_id, competency: ex.competency, purpose: 'transfer' });
    used.add(ex.slug);
    spent += sec;
  }

  // 5. Pratique : exercices variés sur les items du jour, jusqu'à remplir la séance (sans avancement anticipé).
  const practiceItems = [...newItems, ...steps.filter((s) => s.kind === 'exercise' && s.purpose === 'review').map((s) => s.item_id)];
  if (practiceItems.length > 0 && !highDebt) {
    const practice = available
      .filter((e) => practiceItems.includes(e.item_id) && !used.has(e.slug) && isExerciseAvailable(e, allTaught))
      .sort((a, b) => practiceItems.indexOf(a.item_id) - practiceItems.indexOf(b.item_id) || a.difficulty - b.difficulty || a.slug.localeCompare(b.slug));
    const extra: PlannedStep[] = [];
    for (const ex of practice) {
      const sec = exerciseSeconds(ex);
      if (spent + sec > totalBudget) continue;
      extra.push({ kind: 'exercise', exercise_slug: ex.slug, item_id: ex.item_id, competency: ex.competency, purpose: 'practice' });
      used.add(ex.slug);
      spent += sec;
    }
    // Mélanger les items pour éviter les répétitions identiques consécutives.
    const mixed: PlannedStep[] = [];
    const queues = new Map<string, PlannedStep[]>();
    for (const s of extra) queues.set(s.item_id, [...(queues.get(s.item_id) ?? []), s]);
    while ([...queues.values()].some((q) => q.length)) for (const q of queues.values()) { const n = q.shift(); if (n) mixed.push(n); }
    steps.push(...interleave(mixed, bySlug));
  }

  if (steps.length === 0) {
    explanations.push({ code: 'nothing_due', message_fr: 'Rien n’est dû pour l’instant : profite d’une pause ou relis le parcours.' });
  }
  return {
    minutes: input.minutes,
    unit_id: unit?.id ?? null,
    steps,
    estimated_seconds: spent,
    new_items: newItems,
    review_count: reviewCount,
    explanations,
  };
}

function simplifiedNotice(input: PlannerInput, steps: readonly PlannedStep[]): boolean {
  return steps.some((s) => s.kind === 'teach' && s.alternative_explanation && input.simplified.has(s.item_id));
}
