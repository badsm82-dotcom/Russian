/**
 * Profil d'entrée A0 intégral (§3, F01) et profil linguistique (§2.1, F14).
 * Aucun acquis présumé : compteurs à zéro, scores non évalués (null) — jamais des échecs.
 */
import type { KnownLanguage, LanguageCode, Proficiency, SkillDomain } from './types.js';
import { SKILL_DOMAINS } from './types.js';

export interface LanguageProfile {
  interface_language: LanguageCode;
  target_language: 'ru';
  target_entry_level: 'A0';
  known_languages: KnownLanguage[];
}

/** Profil déclaré du cahier des charges (§2.1). */
export const DEFAULT_KNOWN_LANGUAGES: readonly KnownLanguage[] = [
  { code: 'fr', proficiency: 'fluent', bridges_enabled: true },
  { code: 'en', proficiency: 'fluent', bridges_enabled: true },
  { code: 'de', proficiency: 'fluent', bridges_enabled: true },
  { code: 'pt', proficiency: 'fluent', bridges_enabled: true },
  { code: 'es', proficiency: 'functional_communication', bridges_enabled: true },
  { code: 'it', proficiency: 'functional_communication', bridges_enabled: true },
  { code: 'ro', proficiency: 'A2', bridges_enabled: true },
];

export function defaultLanguageProfile(): LanguageProfile {
  return {
    interface_language: 'fr',
    target_language: 'ru',
    target_entry_level: 'A0',
    known_languages: DEFAULT_KNOWN_LANGUAGES.map((l) => ({ ...l })),
  };
}

export const LANGUAGE_NAMES_FR: Record<LanguageCode, string> = {
  fr: 'français', en: 'anglais', de: 'allemand', pt: 'portugais', es: 'espagnol', it: 'italien', ro: 'roumain', ru: 'russe',
};

export const PROFICIENCY_VALUES: readonly Proficiency[] = ['fluent', 'functional_communication', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'native'];

export interface A0Baseline {
  entry_level: 'A0';
  placement_required: false;
  letters_mastered: 0;
  active_lemmas: 0;
  receptive_lemmas: 0;
  skills: Record<SkillDomain, 'A0'>;
  assessment_scores: null;
  first_unit: string;
}

export function a0Baseline(firstUnit = 'A0-01'): A0Baseline {
  const skills = Object.fromEntries(SKILL_DOMAINS.map((d) => [d, 'A0'])) as Record<SkillDomain, 'A0'>;
  return {
    entry_level: 'A0',
    placement_required: false,
    letters_mastered: 0,
    active_lemmas: 0,
    receptive_lemmas: 0,
    skills,
    assessment_scores: null,
    first_unit: firstUnit,
  };
}

export interface LearnerSettings {
  daily_minutes: 5 | 15 | 25 | 35 | 60;
  days_per_week: number;
  preferred_time: string | null;
  timezone: string;
  interests: string[];
  personal_context_enabled: boolean;
  microphone_consent: boolean;
  /** Affichage de la translittération : auto = masquée progressivement selon la maîtrise. */
  transliteration: 'auto' | 'always' | 'never';
  show_stress_marks: boolean;
  correction_timing: 'after_turn' | 'end_of_dialogue';
  font_scale: number;
  theme: 'system' | 'light' | 'dark';
  notifications_enabled: boolean;
  bridges_enabled: boolean;
  audio_rate: 0.75 | 0.9 | 1 | 1.15;
  manual_difficulty: 'auto' | 'easier' | 'harder';
  /** Jour de départ du programme de 52 semaines (AAAA-MM-JJ) ; par défaut, la date de création du compte. */
  goal_start_date?: string | null;
}

export const DEFAULT_INTERESTS = [
  'famille', 'cuisine', 'galerie d’art', 'travail', 'commerce', 'automobile', 'voyages', 'immobilier', 'actualité',
];

export function defaultSettings(): LearnerSettings {
  return {
    daily_minutes: 35,
    days_per_week: 6,
    preferred_time: null,
    timezone: 'Europe/Zurich',
    interests: [...DEFAULT_INTERESTS],
    personal_context_enabled: true,
    microphone_consent: false,
    transliteration: 'auto',
    show_stress_marks: true,
    correction_timing: 'after_turn',
    font_scale: 1,
    theme: 'system',
    notifications_enabled: false,
    bridges_enabled: true,
    audio_rate: 1,
    manual_difficulty: 'auto',
  };
}

/** Translittération masquée progressivement (§3, §5, §11) selon la maîtrise individuelle des lettres d'un mot. */
export function shouldShowTransliteration(
  mode: LearnerSettings['transliteration'],
  lettersInWord: Iterable<string>,
  reliablyDecodedLetters: ReadonlySet<string>,
): boolean {
  if (mode === 'always') return true;
  if (mode === 'never') return false;
  for (const l of lettersInWord) if (!reliablyDecodedLetters.has(l)) return true;
  return false;
}
