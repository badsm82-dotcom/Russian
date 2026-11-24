/**
 * ReviewScheduler — algorithme initial simple (§9, F08), remplaçable par FSRS après calibration.
 *
 * Règles :
 *  - intervalles réussis [1,3,7,14,30,60,120] jours, plafond 180 jours ;
 *  - grade 2 : intervalle du niveau courant, puis avancement d'un niveau ;
 *  - grade 3 : même progression, intervalle × 1,3 ;
 *  - grade 1 (avec aide) : niveau conservé, revoir dans 1 jour ;
 *  - grade 0 : recul de 2 niveaux (min 0), revoir dans 10 minutes ; après réussite de remédiation, le lendemain ;
 *  - la répétition de remédiation ne fait jamais progresser le niveau ;
 *  - tentative abandonnée ou non notable : état inchangé (une interruption n'est pas un échec).
 * Toutes les dates sont en UTC (objets Date) ; l'affichage local relève de l'interface.
 */
import type { Competency, Grade, MasteryStatus, ReviewState, ScoredAttempt } from './types.js';

export const REVIEW_INTERVALS_DAYS: readonly number[] = [1, 3, 7, 14, 30, 60, 120];
export const MAX_INTERVAL_DAYS = 180;
export const EASY_MULTIPLIER = 1.3;
export const FAILURE_RETRY_MINUTES = 10;

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

export function initialReviewState(item_id: string, competency: Competency): ReviewState {
  return {
    item_id,
    competency,
    stage: 0,
    due_at: null,
    last_grade: null,
    streak: 0,
    remediation_pending: false,
    mastery_status: 'new',
  };
}

export interface ScheduleResult {
  state: ReviewState;
  /** Faux si la tentative n'a eu aucun effet (abandon, non notable). */
  changed: boolean;
  /** Vrai si la tentative a été traitée comme une remédiation. */
  remediation: boolean;
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * MINUTE_MS);
}

export function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * DAY_MS);
}

/** Statut indicatif dérivé du niveau ; le statut « mastered » est décidé par mastery.ts à partir de l'historique. */
function statusFromStage(stage: number, grade: Grade, previous: MasteryStatus): MasteryStatus {
  if (grade === 0) return previous === 'mastered' || previous === 'reopened' ? 'reopened' : 'learning';
  if (previous === 'mastered') return 'mastered';
  return stage >= 3 ? 'reviewing' : 'learning';
}

export function scheduleReview(previous: ReviewState, attempt: ScoredAttempt, now: Date): ScheduleResult {
  if (attempt.abandoned || attempt.unscorable) {
    return { state: previous, changed: false, remediation: false };
  }
  const grade = attempt.grade;
  const s: ReviewState = { ...previous, last_grade: grade };
  const lastIndex = REVIEW_INTERVALS_DAYS.length - 1;
  const isRemediation = previous.remediation_pending;

  if (isRemediation && grade >= 2) {
    s.due_at = addDays(now, 1);
    s.remediation_pending = false;
    s.streak = previous.streak + 1;
  } else if (grade === 0) {
    s.stage = Math.max(0, previous.stage - 2);
    s.due_at = addMinutes(now, FAILURE_RETRY_MINUTES);
    s.remediation_pending = true;
    s.streak = 0;
  } else if (grade === 1) {
    s.due_at = addDays(now, 1);
    // Une réussite assistée clôt la boucle de remédiation sans compter comme rappel autonome.
    s.remediation_pending = false;
  } else {
    const days = REVIEW_INTERVALS_DAYS[Math.min(previous.stage, lastIndex)] ?? 1;
    const factor = grade === 3 ? EASY_MULTIPLIER : 1;
    s.due_at = addDays(now, Math.min(MAX_INTERVAL_DAYS, Math.ceil(days * factor)));
    s.stage = Math.min(previous.stage + 1, lastIndex);
    s.streak = previous.streak + 1;
  }
  s.mastery_status = statusFromStage(s.stage, grade, previous.mastery_status);
  return { state: s, changed: true, remediation: isRemediation };
}

/** Un item est dû si sa date d'échéance est passée. Un item jamais planifié n'est pas « dû » (pas encore enseigné). */
export function isDue(state: ReviewState, now: Date): boolean {
  return state.due_at !== null && state.due_at.getTime() <= now.getTime();
}

/** Priorité de révision : retard relatif le plus grand d'abord, puis niveau le plus faible. */
export function compareDueUrgency(a: ReviewState, b: ReviewState, now: Date): number {
  const lateness = (s: ReviewState) => (s.due_at ? now.getTime() - s.due_at.getTime() : -Infinity);
  const diff = lateness(b) - lateness(a);
  if (diff !== 0) return diff;
  return a.stage - b.stage;
}

export function gradeLabelFr(grade: Grade): string {
  return ['échec', 'réussi avec aide', 'rappel autonome', 'facile'][grade] ?? 'inconnu';
}
