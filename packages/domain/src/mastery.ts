/**
 * Maîtrise et score indicatif (§9).
 * Score : 45 % rappel autonome, 25 % transfert, 20 % rétention différée, 10 % reconnaissance,
 * renormalisé si une mesure manque ; « données insuffisantes » si aucune mesure.
 * Un item actif est maîtrisé après ≥ 3 rappels autonomes corrects sur 3 jours distincts,
 * dont un ≥ 14 jours après le premier, plus une utilisation en contexte. Deux échecs récents réouvrent l'item.
 */
import type { Competency, Grade } from './types.js';

export interface HistoryAttempt {
  competency: Competency;
  grade: Grade;
  assisted: boolean;
  created_at: Date;
  /** Exercice de transfert / utilisation en contexte. */
  in_context: boolean;
}

export const MASTERY_WEIGHTS = { recall: 0.45, transfer: 0.25, retention: 0.2, recognition: 0.1 } as const;
export const DELAYED_RETENTION_MIN_DAYS = 7;
export const MASTERY_LONG_GAP_DAYS = 14;
const DAY_MS = 86_400_000;

const RECALL_COMPETENCIES: ReadonlySet<Competency> = new Set(['recall', 'production', 'spelling']);

function isAutonomousSuccess(a: HistoryAttempt): boolean {
  return a.grade >= 2 && !a.assisted;
}

/** Clé de jour dans le fuseau de l'apprenant (« jours distincts » au sens de l'apprenant). */
export function localDayKey(d: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export interface MasteryScore {
  /** Score 0–100, ou null si données insuffisantes. */
  score: number | null;
  components: Record<keyof typeof MASTERY_WEIGHTS, number | null>;
  insufficient_data: boolean;
}

function rate(list: HistoryAttempt[]): number | null {
  if (list.length === 0) return null;
  return list.filter(isAutonomousSuccess).length / list.length;
}

export function masteryScore(history: readonly HistoryAttempt[]): MasteryScore {
  const sorted = [...history].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const recall = rate(sorted.filter((a) => RECALL_COMPETENCIES.has(a.competency) && !a.in_context));
  const transfer = rate(sorted.filter((a) => a.in_context || a.competency === 'transfer'));
  const recognition = rate(sorted.filter((a) => a.competency === 'recognition' || a.competency === 'listening'));
  // Rétention différée : tentatives survenant ≥ 7 jours après la précédente tentative de la même compétence.
  const delayed: HistoryAttempt[] = [];
  const lastByComp = new Map<Competency, Date>();
  for (const a of sorted) {
    const prev = lastByComp.get(a.competency);
    if (prev && a.created_at.getTime() - prev.getTime() >= DELAYED_RETENTION_MIN_DAYS * DAY_MS) delayed.push(a);
    lastByComp.set(a.competency, a.created_at);
  }
  const retention = rate(delayed);
  const components = { recall, transfer, retention, recognition };
  let total = 0;
  let weight = 0;
  for (const [k, w] of Object.entries(MASTERY_WEIGHTS) as [keyof typeof MASTERY_WEIGHTS, number][]) {
    const v = components[k];
    if (v !== null) {
      total += v * w;
      weight += w;
    }
  }
  if (weight === 0) return { score: null, components, insufficient_data: true };
  return { score: Math.round((total / weight) * 100), components, insufficient_data: false };
}

export interface ActiveMasteryVerdict {
  mastered: boolean;
  reopened: boolean;
  autonomous_recall_days: number;
  has_long_gap_success: boolean;
  has_context_use: boolean;
}

export function activeMastery(history: readonly HistoryAttempt[], timeZone = 'UTC'): ActiveMasteryVerdict {
  const sorted = [...history].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
  const recallAttempts = sorted.filter((a) => RECALL_COMPETENCIES.has(a.competency));
  const successes = recallAttempts.filter(isAutonomousSuccess);
  const days = new Set(successes.map((a) => localDayKey(a.created_at, timeZone)));
  const first = successes[0]?.created_at.getTime();
  const hasLongGap =
    first !== undefined && successes.some((a) => a.created_at.getTime() - first >= MASTERY_LONG_GAP_DAYS * DAY_MS);
  const hasContext = sorted.some((a) => (a.in_context || a.competency === 'transfer') && isAutonomousSuccess(a));
  const lastTwo = recallAttempts.slice(-2);
  const reopened = lastTwo.length === 2 && lastTwo.every((a) => a.grade === 0);
  const mastered = !reopened && days.size >= 3 && hasLongGap && hasContext;
  return { mastered, reopened, autonomous_recall_days: days.size, has_long_gap_success: hasLongGap, has_context_use: hasContext };
}

/** Statut réceptif distinct : ≥ 2 reconnaissances autonomes correctes sur 2 jours distincts. */
export function isReceptivelyKnown(history: readonly HistoryAttempt[], timeZone = 'UTC'): boolean {
  const ok = history.filter((a) => (a.competency === 'recognition' || a.competency === 'listening') && isAutonomousSuccess(a));
  return new Set(ok.map((a) => localDayKey(a.created_at, timeZone))).size >= 2;
}
