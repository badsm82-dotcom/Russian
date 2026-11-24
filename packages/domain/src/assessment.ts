/**
 * Bilans (§12, F11) : tests sans aide, variantes inédites à chaque passage (tirage pseudo-aléatoire reproductible),
 * corrigés côté serveur, aucun indice ni corrigé envoyé avant la remise.
 * Bilan alphabet J7–J14 (§5) : ≥ 90 % de reconnaissance des lettres et ≥ 80 % de décodage de mots inédits.
 */
import type { Choice, ExerciseDef, GradingResult } from './exercise.js';
import { gradeAnswer } from './exercise.js';
import { displayTransliteration } from './transliteration.js';
import { stripStressMarks } from './unicode.js';

/** Générateur pseudo-aléatoire déterministe (mulberry32) : le même identifiant de passage redonne le même test. */
export function seededRandom(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let a = h >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

export interface AssessmentLetter {
  upper: string;
  lower: string;
  sound_label_fr: string;
  confusions: string[];
}

export interface AssessmentWord {
  ru: string;
  fr: string;
  pron?: string[];
}

export interface AssessmentTask {
  index: number;
  part: 'recognition' | 'decoding';
  /** Lettre testée (reconnaissance) — pour le diagnostic « lettres à revoir ». */
  letter?: string;
  exercise: ExerciseDef;
}

export interface AssessmentSpec {
  id: string;
  version: number;
  title_fr: string;
  intro_fr: string;
  parts: { part: AssessmentTask['part']; label_fr: string; threshold: number }[];
  tasks: AssessmentTask[];
}

export const ALPHABET_ASSESSMENT_ID = 'alphabet';
export const ALPHABET_RECOGNITION_ITEMS = 20;
export const ALPHABET_DECODING_ITEMS = 10;

const base = (slug: string): Pick<ExerciseDef, 'id' | 'slug' | 'version' | 'unit_id' | 'hints' | 'writes' | 'requires_items' | 'difficulty' | 'status'> => ({
  id: slug,
  slug,
  version: 1,
  unit_id: 'assessment',
  hints: [],
  writes: [],
  requires_items: [],
  difficulty: 2,
  status: 'pending_review',
});

/** Construit un bilan alphabet inédit : lettres tirées au hasard (majuscule ou minuscule), mots jamais vus en leçon. */
export function buildAlphabetAssessment(runId: string, letters: readonly AssessmentLetter[], words: readonly AssessmentWord[]): AssessmentSpec {
  const rnd = seededRandom(runId);
  const tasks: AssessmentTask[] = [];
  const picked = shuffled(letters, rnd).slice(0, Math.min(ALPHABET_RECOGNITION_ITEMS, letters.length));
  picked.forEach((l, i) => {
    const shown = rnd() < 0.5 ? l.upper : l.lower;
    // Distracteurs : lettres souvent confondues d'abord, puis tirage ; étiquettes de son toutes différentes.
    const pool = [...letters.filter((x) => l.confusions.includes(x.lower)), ...shuffled(letters, rnd)].filter((x) => x.lower !== l.lower);
    const choices: Choice[] = [{ id: l.lower, label: l.sound_label_fr }];
    for (const d of pool) {
      if (choices.length >= 4) break;
      if (!choices.some((c) => c.label === d.sound_label_fr)) choices.push({ id: d.lower, label: d.sound_label_fr });
    }
    tasks.push({
      index: tasks.length,
      part: 'recognition',
      letter: l.lower,
      exercise: {
        ...base(`exam_alpha_${runId}_rec_${i}`),
        type: 'letter_recognition',
        item_id: `letter:${l.lower}`,
        competency: 'recognition',
        prompt_fr: 'Quel son correspond à cette lettre ?',
        stimulus: { ru: shown, show_text_before_answer: true },
        choices: shuffled(choices, rnd),
        answer: { kind: 'choice', correct: l.lower },
        reads: [shown],
      },
    });
  });
  shuffled(words, rnd)
    .slice(0, ALPHABET_DECODING_ITEMS)
    .forEach((w, i) => {
      tasks.push({
        index: tasks.length,
        part: 'decoding',
        exercise: {
          ...base(`exam_alpha_${runId}_dec_${i}`),
          type: 'decoding',
          item_id: 'assessment:decoding',
          competency: 'transfer',
          prompt_fr: 'Mot jamais vu : écris en lettres latines comment il se prononce.',
          stimulus: { ru: stripStressMarks(w.ru), show_text_before_answer: true },
          answer: { kind: 'transliteration', russian: w.ru, variants: [displayTransliteration(w.ru), ...(w.pron ?? [])] },
          reads: [w.ru],
          controlled_transfer: true,
          explanation_fr: `« ${stripStressMarks(w.ru)} » se lit à peu près « ${w.pron?.[0] ?? displayTransliteration(w.ru)} » et veut dire « ${w.fr} ».`,
        },
      });
    });
  return {
    id: ALPHABET_ASSESSMENT_ID,
    version: 1,
    title_fr: 'Bilan de l’alphabet (J7–J14)',
    intro_fr: `${ALPHABET_RECOGNITION_ITEMS} lettres à reconnaître et ${ALPHABET_DECODING_ITEMS} mots jamais vus à lire. Sans indice, sans audio, sans translittération : la correction arrive à la fin. Réussi avec au moins 90 % en lettres et 80 % en lecture.`,
    parts: [
      { part: 'recognition', label_fr: 'Reconnaissance des lettres', threshold: 0.9 },
      { part: 'decoding', label_fr: 'Lecture de mots inédits', threshold: 0.8 },
    ],
    tasks,
  };
}

export interface AssessmentAnswer {
  choice_id?: string;
  text?: string;
  dont_know?: boolean;
}

export interface AssessmentScore {
  passed: boolean;
  parts: { part: string; label_fr: string; correct: number; total: number; rate: number; threshold: number; passed: boolean }[];
  items: { index: number; part: string; correct: boolean; answered: boolean; expected: string; given: string; explanation_fr: string | null; letter?: string }[];
  letters_to_review: string[];
  recommendation_fr: string;
}

/** Note un bilan : chaque item non répondu ou « je ne sais pas » compte faux ; aucune aide n'existe en mode examen. */
export function scoreAssessment(spec: AssessmentSpec, answers: ReadonlyMap<number, AssessmentAnswer>): AssessmentScore {
  const items = spec.tasks.map((t) => {
    const a = answers.get(t.index);
    let r: GradingResult | null = null;
    if (a && !a.dont_know && (a.choice_id || a.text?.trim())) r = gradeAnswer(t.exercise, a, { assisted: false, duration_ms: 0, previous_grade: null });
    const ans = t.exercise.answer;
    const expected = ans.kind === 'choice' ? t.exercise.choices?.find((c) => c.id === ans.correct)?.label ?? '' : ans.kind === 'cyrillic' ? ans.accepted[0] ?? '' : ans.variants[0] ?? '';
    const given = a?.dont_know ? '« je ne sais pas »' : a?.choice_id ? t.exercise.choices?.find((c) => c.id === a.choice_id)?.label ?? '' : a?.text ?? '';
    return {
      index: t.index,
      part: t.part,
      correct: r?.outcome === 'correct',
      answered: !!a,
      expected,
      given,
      explanation_fr: t.exercise.explanation_fr ?? null,
      letter: t.letter,
    };
  });
  const parts = spec.parts.map((p) => {
    const list = items.filter((i) => i.part === p.part);
    const correct = list.filter((i) => i.correct).length;
    const rate = list.length ? correct / list.length : 0;
    return { part: p.part, label_fr: p.label_fr, correct, total: list.length, rate, threshold: p.threshold, passed: rate >= p.threshold };
  });
  const passed = parts.every((p) => p.passed);
  const lettersToReview = [...new Set(items.filter((i) => i.part === 'recognition' && !i.correct && i.letter).map((i) => i.letter!))];
  const recommendation = passed
    ? 'Bilan réussi : l’alphabet est acquis. Les révisions continuent d’elles-mêmes pour le garder.'
    : `Pas encore : on prolonge l’alphabet quelques jours${lettersToReview.length ? ` en insistant sur ${lettersToReview.join(' ')}` : ''}, puis on repasse le bilan (il sera différent).`;
  return { passed, parts, items, letters_to_review: lettersToReview, recommendation_fr: recommendation };
}
