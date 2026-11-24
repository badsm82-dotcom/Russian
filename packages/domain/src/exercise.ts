/**
 * ExerciseEngine — définition et correction déterministe des exercices (§8, F07).
 * Le corrigé n'est jamais transmis au client avant la notation : la correction est faite côté serveur.
 */
import type { Competency, ContentStatus, ExerciseType, Grade } from './types.js';
import { detectScript, latinLookalikesToCyrillic, levenshtein, normalizeAnswer } from './unicode.js';
import { acceptsTransliteration } from './transliteration.js';

export interface Choice {
  id: string;
  label: string;
  /** Texte russe à lire dans le choix (contrôle des prérequis de lecture). */
  ru?: string;
}

export type AnswerSpec =
  | { kind: 'choice'; correct: string }
  | { kind: 'cyrillic'; accepted: string[]; distinguish_yo?: boolean; case_sensitive?: boolean }
  | { kind: 'transliteration'; russian: string; variants: string[] };

export interface ExerciseStimulus {
  /** Texte russe affiché (s'il est lu, il doit figurer dans `reads`). */
  ru?: string;
  fr?: string;
  /** Texte à prononcer par l'audio (TTS ou enregistrement). */
  audio_text?: string;
  /** Faux pour l'écoute : le texte n'est pas montré avant la réponse (§8). */
  show_text_before_answer?: boolean;
}

export interface ExerciseDef {
  id: string;
  slug: string;
  version: number;
  type: ExerciseType;
  unit_id: string;
  item_id: string;
  competency: Competency;
  prompt_fr: string;
  stimulus: ExerciseStimulus;
  choices?: Choice[];
  answer: AnswerSpec;
  hints: string[];
  /** Textes russes que l'apprenant doit lire (lettres prérequises). */
  reads: string[];
  /** Textes russes que l'apprenant doit écrire (lettres prérequises). */
  writes: string[];
  /** Items qui doivent avoir été enseignés (présentation sonore + démonstration). */
  requires_items: string[];
  difficulty: 1 | 2 | 3;
  /** Exercice plus simple à proposer après 3 échecs sur le concept (§6). */
  easier_exercise_slug?: string;
  /** Transfert contrôlé explicitement prévu (AC20) : peut contenir un mot non vu mais décodable. */
  controlled_transfer?: boolean;
  /** Explication brève affichée après correction. */
  explanation_fr?: string;
  status: ContentStatus;
}

/** Vue client : aucune information de corrigé. */
export type ClientExercise = Omit<ExerciseDef, 'answer' | 'easier_exercise_slug' | 'explanation_fr'> & {
  input: 'choice' | 'cyrillic' | 'latin';
};

export function toClientExercise(ex: ExerciseDef): ClientExercise {
  const { answer, easier_exercise_slug: _e, explanation_fr: _x, ...rest } = ex;
  const input = answer.kind === 'choice' ? 'choice' : answer.kind === 'cyrillic' ? 'cyrillic' : 'latin';
  return { ...rest, input };
}

export interface AnswerPayload {
  choice_id?: string;
  text?: string;
}

export interface GradingContext {
  assisted: boolean;
  duration_ms: number;
  previous_grade: Grade | null;
}

export type GradingOutcome = 'correct' | 'incorrect' | 'unscorable';

export interface GradingResult {
  outcome: GradingOutcome;
  grade: Grade;
  accepted: boolean;
  feedback_fr: string;
  /** Réponse attendue, révélée après la notation. */
  expected: string;
  error_codes: string[];
}

/** Durées en dessous desquelles une réponse autonome peut être jugée « facile » (indicatif, ajustable). */
export const EASY_DURATION_MS: Record<ExerciseType, number> = {
  letter_recognition: 2500,
  letter_recall: 4000,
  decoding: 5000,
  lexical_recognition: 3000,
  active_recall: 6000,
  listening: 4000,
  dictation: 7000,
  fill_blank: 6000,
  transformation: 8000,
};

function expectedDisplay(ex: ExerciseDef): string {
  const a = ex.answer;
  if (a.kind === 'choice') return ex.choices?.find((c) => c.id === a.correct)?.label ?? a.correct;
  if (a.kind === 'cyrillic') return a.accepted[0] ?? '';
  return a.variants[0] ?? a.russian;
}

function finalize(ex: ExerciseDef, ctx: GradingContext, correct: boolean, codes: string[], feedback: string): GradingResult {
  let grade: Grade;
  if (!correct) grade = 0;
  else if (ctx.assisted) grade = 1;
  else if (ctx.duration_ms > 0 && ctx.duration_ms <= EASY_DURATION_MS[ex.type] && (ctx.previous_grade ?? 0) >= 2) grade = 3;
  else grade = 2;
  const expected = expectedDisplay(ex);
  let fb = feedback;
  if (correct && ctx.assisted) fb += ' Réponse avec aide : elle ne compte pas comme rappel autonome.';
  if (!correct && ex.explanation_fr) fb += ` ${ex.explanation_fr}`;
  return { outcome: correct ? 'correct' : 'incorrect', grade, accepted: correct, feedback_fr: fb.trim(), expected, error_codes: codes };
}

function unscorable(ex: ExerciseDef, feedback: string, codes: string[]): GradingResult {
  return { outcome: 'unscorable', grade: 0, accepted: false, feedback_fr: feedback, expected: '', error_codes: codes };
}

export function gradeAnswer(ex: ExerciseDef, answer: AnswerPayload, ctx: GradingContext): GradingResult {
  const spec = ex.answer;

  if (spec.kind === 'choice') {
    if (!answer.choice_id) return unscorable(ex, 'Aucune réponse choisie.', ['empty']);
    if (!ex.choices?.some((c) => c.id === answer.choice_id)) return unscorable(ex, 'Choix inconnu.', ['invalid_choice']);
    const ok = answer.choice_id === spec.correct;
    const codes = ok ? [] : [`confusion:${spec.correct}>${answer.choice_id}`];
    const chosen = ex.choices.find((c) => c.id === answer.choice_id)?.label ?? '';
    return finalize(ex, ctx, ok, codes, ok ? 'Correct.' : `Pas tout à fait : tu as choisi « ${chosen} ».`);
  }

  const raw = (answer.text ?? '').trim();
  if (!raw) return unscorable(ex, 'Réponse vide : rien n’est compté.', ['empty']);

  if (spec.kind === 'transliteration') {
    const script = detectScript(raw);
    if (script === 'cyrillic') {
      // L'apprenant a recopié le mot en cyrillique : on demande une transcription, sans pénalité.
      return unscorable(ex, 'Ici, écris en lettres latines comment se prononce le mot (par exemple « mama »).', ['wrong_script']);
    }
    const ok = acceptsTransliteration(spec.russian, raw, spec.variants);
    return finalize(ex, ctx, ok, ok ? [] : ['decoding'], ok ? 'Correct, bien décodé.' : 'Ce n’est pas la bonne lecture.');
  }

  // Saisie cyrillique.
  const script = detectScript(raw);
  if (script === 'latin' || script === 'mixed') {
    const guess = latinLookalikesToCyrillic(raw);
    const hint =
      guess !== null
        ? ' Certaines lettres latines ressemblent au cyrillique mais sont différentes pour l’ordinateur.'
        : '';
    // Demande de clarification sans pénalité (§8 : incertitude du correcteur).
    return unscorable(ex, `Utilise le clavier cyrillique (bouton « Clavier russe »).${hint}`, ['latin_script']);
  }

  const opts = { distinguishYo: spec.distinguish_yo, caseSensitive: spec.case_sensitive };
  const given = normalizeAnswer(raw, opts);
  const accepted = spec.accepted.map((a) => normalizeAnswer(a, opts));
  if (accepted.includes(given)) {
    const codes: string[] = [];
    let fb = 'Correct.';
    if (!spec.distinguish_yo && /ё/i.test(spec.accepted[0] ?? '') && !/ё/i.test(raw)) {
      codes.push('yo_as_ye_accepted');
      fb += ' (En écriture courante, е remplace souvent ё : accepté.)';
    }
    return finalize(ex, ctx, true, codes, fb);
  }
  // Casse seule erronée dans un exercice ciblé majuscule/minuscule.
  const codes: string[] = [];
  const caseInsensitiveMatch = spec.accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(raw));
  if (spec.case_sensitive && caseInsensitiveMatch) codes.push('case');
  else if (spec.distinguish_yo && spec.accepted.some((a) => normalizeAnswer(a) === normalizeAnswer(raw))) codes.push('yo_missing');
  else {
    const minDist = Math.min(...accepted.map((a) => levenshtein(a, given)));
    codes.push(minDist <= 1 && given.length > 2 ? 'spelling' : 'form');
  }
  const fb =
    codes[0] === 'spelling'
      ? 'Presque : une lettre diffère.'
      : codes[0] === 'case'
        ? 'Attention à la majuscule/minuscule.'
        : codes[0] === 'yo_missing'
          ? 'Dans cet exercice, il faut écrire ё.'
          : 'Ce n’est pas la forme attendue.';
  return finalize(ex, ctx, false, codes, fb);
}
