/** Lecture de l'état apprenant (items enseignés, états de révision, historique) en types du domaine. */
import type { Competency, Grade, KnownLanguage, LearnerSettings, LanguageProfile, ReviewState, MasteryStatus } from '@r365/domain';
import type { ContentRegistry } from './content-registry.js';
import type { Db, Tx } from './db.js';
import { notFound } from './errors.js';

type Q = Db | Tx;

export interface ProfileRow {
  languages: LanguageProfile;
  interests: string[];
  daily_minutes: number;
  baseline: unknown;
  settings: LearnerSettings;
  onboarded: boolean;
}

export async function loadProfile(q: Q, userId: string): Promise<ProfileRow> {
  const r = await q.query<ProfileRow>('SELECT languages, interests, daily_minutes, baseline, settings, onboarded FROM learner_profiles WHERE user_id = $1', [userId]);
  if (!r.rowCount) throw notFound('Profil');
  return r.rows[0]!;
}

export function knownLanguages(p: ProfileRow): KnownLanguage[] {
  return p.languages.known_languages;
}

export async function loadTaught(q: Q, content: ContentRegistry, userId: string): Promise<Set<string>> {
  const r = await q.query<{ item_id: string }>('SELECT item_id FROM taught_items WHERE user_id = $1', [userId]);
  return new Set(r.rows.map((x) => content.itemSlug(x.item_id)).filter((x): x is string => !!x));
}

interface StateRow {
  item_id: string;
  competency: Competency;
  stage: number;
  due_at: Date | null;
  last_grade: number | null;
  streak: number;
  remediation_pending: boolean;
  mastery_status: MasteryStatus;
}

export function rowToState(content: ContentRegistry, r: StateRow): ReviewState | null {
  const slug = content.itemSlug(r.item_id);
  if (!slug) return null;
  return {
    item_id: slug,
    competency: r.competency,
    stage: r.stage,
    due_at: r.due_at,
    last_grade: r.last_grade as Grade | null,
    streak: r.streak,
    remediation_pending: r.remediation_pending,
    mastery_status: r.mastery_status,
  };
}

export async function loadStates(q: Q, content: ContentRegistry, userId: string): Promise<ReviewState[]> {
  const r = await q.query<StateRow>(
    'SELECT item_id, competency, stage, due_at, last_grade, streak, remediation_pending, mastery_status FROM review_states WHERE user_id = $1',
    [userId],
  );
  return r.rows.map((x) => rowToState(content, x)).filter((x): x is ReviewState => !!x);
}

export interface AttemptRow {
  id: string;
  exercise_id: string;
  item_id: string;
  item_slug: string;
  competency: Competency;
  purpose: string;
  outcome: 'correct' | 'incorrect' | 'unscorable' | 'abandoned';
  grade: Grade | null;
  assisted: boolean;
  in_context: boolean;
  duration_ms: number;
  error_codes: string[];
  occurred_at: Date;
  session_id: string | null;
}

export async function loadAttempts(q: Q, content: ContentRegistry, userId: string): Promise<AttemptRow[]> {
  const r = await q.query<Omit<AttemptRow, 'item_slug'>>(
    `SELECT id, exercise_id, item_id, competency, purpose, outcome, grade, assisted, in_context, duration_ms, error_codes, occurred_at, session_id
     FROM attempts WHERE user_id = $1 ORDER BY occurred_at, created_at`,
    [userId],
  );
  return r.rows.map((x) => ({ ...x, item_slug: content.itemSlug(x.item_id) ?? 'unknown' }));
}

export function isScored(a: Pick<AttemptRow, 'outcome'>): boolean {
  return a.outcome === 'correct' || a.outcome === 'incorrect';
}
