/**
 * Types du domaine pédagogique Russian 365.
 * Aucune dépendance réseau, base de données ou SDK fournisseur (§14).
 */

export type LanguageCode = 'fr' | 'en' | 'de' | 'pt' | 'es' | 'it' | 'ro' | 'ru';

/** Niveaux déclarés : jamais convertis en CECRL certifié (§2.1). */
export type Proficiency = 'fluent' | 'functional_communication' | 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'native';

export interface KnownLanguage {
  code: LanguageCode;
  proficiency: Proficiency;
  /** Langue proposée comme langue d'appui pour les passerelles (désactivable, §2.3). */
  bridges_enabled: boolean;
}

export type SkillDomain =
  | 'alphabet'
  | 'reading'
  | 'writing'
  | 'listening'
  | 'speaking'
  | 'grammar'
  | 'pronunciation'
  | 'vocabulary';

export const SKILL_DOMAINS: readonly SkillDomain[] = [
  'alphabet',
  'reading',
  'writing',
  'listening',
  'speaking',
  'grammar',
  'pronunciation',
  'vocabulary',
] as const;

/** Compétences suivies séparément par item (§9). */
export type Competency = 'recognition' | 'recall' | 'listening' | 'production' | 'spelling' | 'transfer';

export type ItemType = 'letter' | 'lexeme' | 'structure';

/** Note de tentative : 0 échec, 1 réussite avec aide, 2 rappel autonome, 3 facile (§9). */
export type Grade = 0 | 1 | 2 | 3;

export type MasteryStatus = 'new' | 'learning' | 'reviewing' | 'mastered' | 'reopened';

export type ExerciseType =
  | 'letter_recognition'
  | 'letter_recall'
  | 'decoding'
  | 'lexical_recognition'
  | 'active_recall'
  | 'listening'
  | 'dictation'
  | 'fill_blank'
  | 'transformation';

export type ContentStatus = 'draft' | 'pending_review' | 'validated' | 'retired';

export interface ReviewState {
  item_id: string;
  competency: Competency;
  stage: number;
  due_at: Date | null;
  last_grade: Grade | null;
  streak: number;
  /** Vrai après un échec : la prochaine réussite est une remédiation (pas d'avancement de niveau). */
  remediation_pending: boolean;
  mastery_status: MasteryStatus;
}

export interface ScoredAttempt {
  grade: Grade;
  assisted: boolean;
  abandoned?: boolean;
  unscorable?: boolean;
}
