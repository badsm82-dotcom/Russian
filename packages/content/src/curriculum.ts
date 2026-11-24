/**
 * Construction déterministe du parcours A0 (semaine 1, §5 et §21) :
 * unités, fiches de présentation et banque d'exercices.
 * Chaque exercice est rattaché à la première unité où toutes ses lettres et items sont enseignés (AC03, AC20).
 */
import { createHash } from 'node:crypto';
import {
  letterItemId,
  lettersInText,
  stripStressMarks,
  displayTransliteration,
  type Choice,
  type Competency,
  type ContentStatus,
  type ExerciseDef,
  type ExerciseType,
  type UnitDef,
} from '@r365/domain';
import { LETTERS, TRANSFER_WORDS, type LetterDef, type WordExample } from './alphabet.js';
import { LEXEMES, type LexemeDef } from './lexicon.js';

export const CONTENT_VERSION = 1;
/** Contenu rédigé mais non relu par un russophone : à valider avant mise en production (§17). */
export const DEFAULT_STATUS: ContentStatus = 'pending_review';

const UUID_NAMESPACE = 'b6a2c1f4-3e8d-4c7a-9f10-5d2e8a7c3b91';

/** UUID v5 déterministe à partir d'un identifiant lisible (identifiants UUID, §15). */
export function uuidFromSlug(slug: string): string {
  const ns = Buffer.from(UUID_NAMESPACE.replace(/-/g, ''), 'hex');
  const h = createHash('sha1').update(ns).update(slug, 'utf8').digest();
  h[6] = (h[6]! & 0x0f) | 0x50;
  h[8] = (h[8]! & 0x3f) | 0x80;
  const x = h.subarray(0, 16).toString('hex');
  return `${x.slice(0, 8)}-${x.slice(8, 12)}-${x.slice(12, 16)}-${x.slice(16, 20)}-${x.slice(20, 32)}`;
}

function hash(s: string): number {
  return createHash('sha1').update(s).digest().readUInt32BE(0);
}

/** Mélange déterministe (même ordre à chaque génération). */
function shuffle<T>(arr: T[], seed: string): T[] {
  return arr
    .map((v, i) => ({ v, k: hash(`${seed}:${i}`) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.v);
}

// ---------------------------------------------------------------------------
// Unités
// ---------------------------------------------------------------------------

const UNIT_META: { title_fr: string; mission_fr: string }[] = [
  { title_fr: 'Premières lettres : А К М О Т', mission_fr: 'Lire мама, кот, там ; saluer, dire oui/non, remercier.' },
  { title_fr: 'Faux amis visuels : В Н Р С У Х', mission_fr: 'Ne plus confondre les lettres qui ressemblent au latin ; demander « ça va ? ».' },
  { title_fr: 'Consonnes : Б Г Д З Л П Ф', mission_fr: 'Distinguer б/п, д/т, г/к ; dire comment on s’appelle.' },
  { title_fr: 'Voyelles molles : Е Ё И Й Ю Я', mission_fr: 'Comprendre la palatalisation ; dire « je veux… ».' },
  { title_fr: 'Chuintantes : Ж Ш Ч Щ Ц', mission_fr: 'Discriminer ж/ш/ч/щ/ц ; commander un thé ou un café.' },
  { title_fr: 'Ы Э Ь Ъ', mission_fr: 'Distinguer ы et и ; signes sans son ; se présenter en quelques mots.' },
  { title_fr: 'Consolidation : les 33 lettres', mission_fr: 'Majuscules/minuscules, mots inédits, dictée simple.' },
  { title_fr: 'Je, tu, vous : se présenter', mission_fr: 'Saluer poliment, demander et dire son prénom, tutoyer ou vouvoyer.' },
  { title_fr: 'Qui ? Quoi ? Sans verbe « être »', mission_fr: 'Dire « c’est… », « il est… » sans verbe être ; poser des questions simples.' },
  { title_fr: 'Vouloir, refuser, demander', mission_fr: 'Proposer et accepter une boisson ; dire non poliment.' },
  { title_fr: 'Besoins et demandes polies', mission_fr: 'S’excuser, demander où se trouve quelque chose, le prix, exprimer un besoin.' },
  { title_fr: 'Dialogue guidé : au café', mission_fr: 'Tenir un court dialogue (30–60 s) : saluer, commander, remercier, demander les toilettes.' },
];

export function unitId(n: number): string {
  return `A0-${String(n).padStart(2, '0')}`;
}

const lettersOfGroup = (g: number) => LETTERS.filter((l) => l.group === g);

export const UNITS: UnitDef[] = UNIT_META.map((m, i) => {
  const n = i + 1;
  const letters = n <= 6 ? lettersOfGroup(n).map((l) => letterItemId(l.lower)) : [];
  const lex = LEXEMES.filter((x) => x.unit === n).map((x) => x.item_id);
  return { id: unitId(n), order: n, level: 'A0', title_fr: m.title_fr, mission_fr: m.mission_fr, items: [...letters, ...lex] };
});

/** Numéro d'unité où un item est introduit. */
const ITEM_UNIT = new Map<string, number>();
UNITS.forEach((u) => u.items.forEach((it) => ITEM_UNIT.set(it, u.order)));

function unitForLetters(text: string): number {
  let max = 1;
  for (const l of lettersInText(text)) {
    const u = ITEM_UNIT.get(letterItemId(l));
    if (u === undefined) throw new Error(`Lettre sans unité : ${l}`);
    max = Math.max(max, u);
  }
  return max;
}

// ---------------------------------------------------------------------------
// Fiches de présentation (son, traduction et démonstration avant tout exercice évalué)
// ---------------------------------------------------------------------------

export interface TeachCard {
  item_id: string;
  item_type: 'letter' | 'lexeme' | 'structure';
  title_fr: string;
  ru: string;
  ru_upper?: string;
  ru_lower?: string;
  translit_fr: string;
  fr: string;
  explanation_fr: string;
  /** Seconde explication proposée après 3 échecs (§6). */
  alternative_explanation_fr: string;
  approximation: boolean;
  audio_text: string;
  examples: { ru: string; fr: string; translit_fr: string }[];
  warnings_fr: string[];
  /** Lettres nécessaires pour lire la fiche : si inconnues, apprentissage par l'audio seulement. */
  letters: string[];
  status: ContentStatus;
}

function letterCard(l: LetterDef): TeachCard {
  const warnings: string[] = [];
  if (l.latin_trap_fr) warnings.push(l.latin_trap_fr);
  if (l.approximation) warnings.push('La comparaison avec le français est une approximation : l’audio russe fait référence.');
  const confus = l.confusions.length ? `Ne pas confondre avec ${l.confusions.join(', ')}.` : '';
  const alt = [
    l.latin_trap_fr ? `Astuce : oublie la lettre latine qui lui ressemble. ${l.upper} ${l.lower} = ${l.sound_label_fr}.` : `Retiens : ${l.upper} ${l.lower} = ${l.sound_label_fr}.`,
    confus,
    l.examples[0] ? `Lis lentement « ${stripStressMarks(l.examples[0].ru)} » en pointant chaque lettre.` : '',
  ].filter(Boolean).join(' ');
  return {
    item_id: letterItemId(l.lower),
    item_type: 'letter',
    title_fr: `Lettre ${l.upper} ${l.lower}`,
    ru: `${l.upper} ${l.lower}`,
    ru_upper: l.upper,
    ru_lower: l.lower,
    translit_fr: displayTransliteration(l.lower) || '—',
    fr: l.sound_label_fr,
    explanation_fr: [l.sound_fr, confus].filter(Boolean).join(' '),
    alternative_explanation_fr: alt,
    approximation: l.approximation,
    audio_text: l.examples.map((e) => stripStressMarks(e.ru)).join(', '),
    examples: l.examples.map((e) => ({ ru: e.ru, fr: e.fr, translit_fr: e.pron?.[0] ?? displayTransliteration(e.ru) })),
    warnings_fr: warnings,
    letters: [...new Set(l.examples.flatMap((e) => [...lettersInText(e.ru)]))],
    status: DEFAULT_STATUS,
  };
}

function lexemeCard(x: LexemeDef): TeachCard {
  return {
    item_id: x.item_id,
    item_type: x.type,
    title_fr: x.fr,
    ru: x.ru,
    translit_fr: x.translit_fr,
    fr: x.fr,
    explanation_fr: x.note_fr,
    alternative_explanation_fr: `Écoute plusieurs fois et répète à voix haute : « ${x.translit_fr} » (approximation). ${x.note_fr}`,
    approximation: true,
    audio_text: stripStressMarks(x.ru).replace('…', ''),
    examples: x.examples.map((e) => ({ ...e, translit_fr: displayTransliteration(e.ru) })),
    warnings_fr: ['Translittération approximative : écoute l’audio, qui fait référence.'],
    letters: [...lettersInText(x.ru)],
    status: DEFAULT_STATUS,
  };
}

export const TEACH_CARDS: TeachCard[] = [...LETTERS.map(letterCard), ...LEXEMES.map(lexemeCard)];

// ---------------------------------------------------------------------------
// Exercices
// ---------------------------------------------------------------------------

interface ExInput {
  slug: string;
  type: ExerciseType;
  item_id: string;
  competency: Competency;
  prompt_fr: string;
  stimulus: ExerciseDef['stimulus'];
  choices?: Choice[];
  answer: ExerciseDef['answer'];
  hints?: string[];
  reads?: string[];
  writes?: string[];
  requires_items?: string[];
  difficulty: 1 | 2 | 3;
  easier_exercise_slug?: string;
  controlled_transfer?: boolean;
  explanation_fr?: string;
  minUnit?: number;
}

function build(e: ExInput): ExerciseDef {
  const reads = e.reads ?? [];
  const writes = e.writes ?? [];
  const requires = e.requires_items ?? [];
  let unit = Math.max(e.minUnit ?? 1, ITEM_UNIT.get(e.item_id) ?? 1);
  for (const t of [...reads, ...writes, ...(e.choices ?? []).map((c) => c.ru ?? '')]) unit = Math.max(unit, unitForLetters(t));
  for (const r of requires) unit = Math.max(unit, ITEM_UNIT.get(r) ?? 1);
  const letterReqs = new Set<string>();
  for (const t of [...reads, ...writes, ...(e.choices ?? []).map((c) => c.ru ?? '')]) for (const l of lettersInText(t)) letterReqs.add(letterItemId(l));
  return {
    id: uuidFromSlug(`exercise:${e.slug}`),
    slug: e.slug,
    version: CONTENT_VERSION,
    type: e.type,
    unit_id: unitId(unit),
    item_id: e.item_id,
    competency: e.competency,
    prompt_fr: e.prompt_fr,
    stimulus: e.stimulus,
    choices: e.choices,
    answer: e.answer,
    hints: e.hints ?? [],
    reads,
    writes,
    requires_items: [...new Set([...requires, ...letterReqs])].sort(),
    difficulty: e.difficulty,
    easier_exercise_slug: e.easier_exercise_slug,
    controlled_transfer: e.controlled_transfer,
    explanation_fr: e.explanation_fr,
    status: DEFAULT_STATUS,
  };
}

function letterDistractors(l: LetterDef, n: number): LetterDef[] {
  const known = LETTERS.filter((x) => x.group <= l.group && x.lower !== l.lower);
  const conf = l.confusions.map((c) => LETTERS.find((x) => x.lower === c)).filter((x): x is LetterDef => !!x && x.group <= Math.max(l.group, x.group));
  const pool = [...conf.filter((c) => c.group <= l.group), ...shuffle(known, l.lower)];
  const out: LetterDef[] = [];
  for (const x of pool) if (!out.includes(x) && out.length < n) out.push(x);
  // Si trop peu de lettres connues (séance 1), compléter par des sons « pièges » non cyrilliques.
  return out;
}

const LATIN_TRAP_LABELS: Record<string, string> = {
  в: '[b] comme « bon »', н: '[h] aspiré', р: '[p] comme « papa »', с: '[k] comme « car »', у: '[i] comme « ici »', х: '[ks] comme « taxi »',
};

function letterExercises(l: LetterDef): ExerciseDef[] {
  const id = letterItemId(l.lower);
  const out: ExerciseDef[] = [];
  const distract = letterDistractors(l, 3);
  const labels = new Set([l.sound_label_fr]);
  const choices: Choice[] = [{ id: l.lower, label: l.sound_label_fr }];
  const trap = LATIN_TRAP_LABELS[l.lower];
  if (trap) {
    choices.push({ id: `latin_${l.lower}`, label: trap });
    labels.add(trap);
  }
  for (const d of distract) {
    if (choices.length >= 4) break;
    if (!labels.has(d.sound_label_fr)) {
      choices.push({ id: d.lower, label: d.sound_label_fr });
      labels.add(d.sound_label_fr);
    }
  }
  // Séance 1 : peu de lettres connues → sons fréquents comme distracteurs explicites.
  const fillers = ['[i] comme « ici »', '[p] comme « papa »', '[s] comme « sac »', '[l] comme « lac »'];
  for (const f of fillers) if (choices.length < 4 && !labels.has(f)) { choices.push({ id: `filler_${choices.length}`, label: f }); labels.add(f); }

  // 1. Reconnaissance : lettre → son (QCM)
  out.push(build({
    slug: `letter_rec_${l.lower}`, type: 'letter_recognition', item_id: id, competency: 'recognition', difficulty: 1,
    prompt_fr: 'Quel son correspond à cette lettre ?', stimulus: { ru: `${l.upper} ${l.lower}`, audio_text: l.examples[0] ? stripStressMarks(l.examples[0].ru) : undefined, show_text_before_answer: true },
    choices: shuffle(choices, `rec_${l.lower}`), answer: { kind: 'choice', correct: l.lower }, reads: [l.lower],
    hints: [l.latin_trap_fr ?? `Pense à l’exemple « ${stripStressMarks(l.examples[0]?.ru ?? '')} ».`],
    explanation_fr: `${l.upper} ${l.lower} = ${l.sound_label_fr}.${l.latin_trap_fr ? ' ' + l.latin_trap_fr : ''}`,
  }));
  // 2. Association inverse : son → lettre parmi des lettres connues (QCM = reconnaissance, ne valide pas le rappel)
  const letterChoices: Choice[] = shuffle([l, ...distract.slice(0, 3)].map((x) => ({ id: x.lower, label: x.lower, ru: x.lower })), `assoc_${l.lower}`);
  if (letterChoices.length >= 2) {
    out.push(build({
      slug: `letter_assoc_${l.lower}`, type: 'letter_recognition', item_id: id, competency: 'recognition', difficulty: 1,
      prompt_fr: `Quelle lettre se lit ${l.sound_label_fr} ?`, stimulus: { fr: l.sound_label_fr }, choices: letterChoices,
      answer: { kind: 'choice', correct: l.lower }, explanation_fr: `${l.sound_label_fr} s’écrit ${l.lower}.`,
    }));
  }
  // 3. Rappel sans choix : son → lettre saisie (clavier virtuel disponible)
  out.push(build({
    slug: `letter_recall_${l.lower}`, type: 'letter_recall', item_id: id, competency: 'recall', difficulty: 2,
    prompt_fr: `Écris la lettre russe minuscule qui se lit ${l.sound_label_fr}.`, stimulus: { fr: l.sound_label_fr },
    answer: { kind: 'cyrillic', accepted: [l.lower], distinguish_yo: l.lower === 'ё' || l.lower === 'е' }, writes: [l.lower],
    hints: ['Utilise le bouton « Clavier russe » si besoin.'], easier_exercise_slug: `letter_assoc_${l.lower}`,
    explanation_fr: `La lettre attendue est ${l.lower} (majuscule ${l.upper}).`,
  }));
  // 4. Décodage des mots d'exemple (vus dans la fiche)
  l.examples.forEach((w, i) => {
    out.push(build({
      slug: `decode_${l.lower}_${i}`, type: 'decoding', item_id: id, competency: 'recognition', difficulty: 2,
      prompt_fr: 'Lis ce mot et écris en lettres latines comment il se prononce.', stimulus: { ru: w.ru, audio_text: stripStressMarks(w.ru), show_text_before_answer: true },
      answer: { kind: 'transliteration', russian: w.ru, variants: [displayTransliteration(w.ru), ...(w.pron ?? [])] }, reads: [w.ru],
      hints: ['Lis lettre par lettre, puis écoute.'], explanation_fr: `« ${stripStressMarks(w.ru)} » se lit à peu près « ${w.pron?.[0] ?? displayTransliteration(w.ru)} » et veut dire « ${w.fr} ».`,
    }));
  });
  return out;
}

function transferExercises(): ExerciseDef[] {
  const out: ExerciseDef[] = [];
  for (const [g, words] of Object.entries(TRANSFER_WORDS)) {
    const group = Number(g);
    const newest = lettersOfGroup(group);
    words.forEach((w: WordExample, i) => {
      // Rattacher l'exercice à une lettre de la séance présente dans le mot (à défaut, la première de la séance).
      const letter = newest.find((l) => lettersInText(w.ru).has(l.lower)) ?? newest[0]!;
      out.push(build({
        slug: `transfer_${group}_${i}`, type: 'decoding', item_id: letterItemId(letter.lower), competency: 'transfer', difficulty: 3,
        prompt_fr: 'Mot inédit : lis-le et écris en lettres latines comment il se prononce.',
        stimulus: { ru: w.ru, audio_text: stripStressMarks(w.ru), show_text_before_answer: true },
        answer: { kind: 'transliteration', russian: w.ru, variants: [displayTransliteration(w.ru), ...(w.pron ?? [])] }, reads: [w.ru],
        controlled_transfer: true, minUnit: group,
        explanation_fr: `« ${stripStressMarks(w.ru)} » se lit à peu près « ${w.pron?.[0] ?? displayTransliteration(w.ru)} » et veut dire « ${w.fr} ».`,
      }));
    });
  }
  return out;
}

function lexemeExercises(x: LexemeDef): ExerciseDef[] {
  const out: ExerciseDef[] = [];
  if (x.generate === false) return out;
  const others = LEXEMES.filter((o) => o.item_id !== x.item_id && o.unit <= Math.max(x.unit, 2));
  const distract = shuffle(others, x.item_id).slice(0, 3);
  const meaningChoices = shuffle([x, ...distract].map((o) => ({ id: o.item_id, label: o.fr })), `mean_${x.item_id}`);
  const audio = stripStressMarks(x.ru).replace('…', '');
  // Écoute : audio seul → sens (texte masqué avant la réponse). Pas de lecture requise.
  out.push(build({
    slug: `listen_${x.item_id}`, type: 'listening', item_id: x.item_id, competency: 'listening', difficulty: 1,
    prompt_fr: 'Écoute, puis choisis ce que cela veut dire.', stimulus: { audio_text: audio, show_text_before_answer: false },
    choices: meaningChoices, answer: { kind: 'choice', correct: x.item_id }, explanation_fr: `« ${x.ru} » (${x.translit_fr}) = ${x.fr}.`,
  }));
  // Lecture : russe → sens (disponible quand toutes les lettres sont enseignées).
  out.push(build({
    slug: `read_${x.item_id}`, type: 'lexical_recognition', item_id: x.item_id, competency: 'recognition', difficulty: 2,
    prompt_fr: 'Que veut dire ceci ?', stimulus: { ru: x.ru, show_text_before_answer: true },
    choices: shuffle(meaningChoices, `read_${x.item_id}`), answer: { kind: 'choice', correct: x.item_id }, reads: [x.ru],
    explanation_fr: `« ${x.ru} » = ${x.fr}.`,
  }));
  // Rappel actif : français → russe (saisie, sans choix).
  out.push(build({
    slug: `recall_${x.item_id}`, type: 'active_recall', item_id: x.item_id, competency: 'recall', difficulty: 3,
    prompt_fr: `Écris en russe : « ${x.fr} »`, stimulus: { fr: x.fr }, answer: { kind: 'cyrillic', accepted: x.accepted },
    writes: [x.accepted[0]!], hints: [`Ça commence par « ${stripStressMarks(x.ru).charAt(0)} ».`], easier_exercise_slug: `read_${x.item_id}`,
    explanation_fr: `On écrit « ${stripStressMarks(x.ru)} ».`,
  }));
  return out;
}

/** Exercices de structures : variation sujet/négation/objet (§7). */
function structureExercises(): ExerciseDef[] {
  return [
    build({
      slug: 'fill_ya_khochu_kofe', type: 'fill_blank', item_id: 'struct:ya_khochu', competency: 'production', difficulty: 2,
      prompt_fr: 'Complète pour dire « Je veux un café » : Я ___ ко́фе.', stimulus: { ru: 'Я ___ ко́фе.', fr: 'Je veux un café.' },
      answer: { kind: 'cyrillic', accepted: ['хочу'] }, reads: ['Я ко́фе'], writes: ['хочу'], requires_items: ['lex:kofe'],
      explanation_fr: '« je veux » = хочу́.',
    }),
    build({
      slug: 'build_ya_khochu_chai', type: 'active_recall', item_id: 'struct:ya_khochu', competency: 'transfer', difficulty: 3,
      prompt_fr: 'Commande : écris en russe « Je veux du thé ».', stimulus: { fr: 'Je veux du thé.' },
      answer: { kind: 'cyrillic', accepted: ['Я хочу чай', 'Я хочу чаю', 'Хочу чай'] }, writes: ['Я хочу чай'], requires_items: ['lex:chai'],
      explanation_fr: 'Я хочу́ чай. (Чаю est aussi possible, forme vue plus tard.)',
    }),
    build({
      slug: 'transform_neg_ya_khochu', type: 'transformation', item_id: 'lex:ne', competency: 'production', difficulty: 3,
      prompt_fr: 'Mets à la forme négative : Я хочу́ ко́фе.', stimulus: { ru: 'Я хочу́ ко́фе.', fr: 'Je veux un café.' },
      answer: { kind: 'cyrillic', accepted: ['Я не хочу кофе'] }, reads: ['Я хочу́ ко́фе.'], writes: ['Я не хочу кофе'],
      requires_items: ['struct:ya_khochu', 'lex:kofe'], explanation_fr: 'не se place juste avant le verbe : Я не хочу́ ко́фе.',
    }),
    build({
      slug: 'build_menya_zovut', type: 'active_recall', item_id: 'struct:menya_zovut', competency: 'transfer', difficulty: 3,
      prompt_fr: 'Présente-toi : écris en russe « Je m’appelle Anna ».', stimulus: { fr: 'Je m’appelle Anna.' },
      answer: { kind: 'cyrillic', accepted: ['Меня зовут Анна'] }, writes: ['Меня зовут Анна'], explanation_fr: 'Меня́ зову́т А́нна.',
    }),
    build({
      slug: 'build_eto_chai', type: 'active_recall', item_id: 'lex:eto', competency: 'transfer', difficulty: 3,
      prompt_fr: 'Écris en russe « C’est du thé ».', stimulus: { fr: 'C’est du thé.' }, answer: { kind: 'cyrillic', accepted: ['Это чай'] },
      writes: ['Это чай'], requires_items: ['lex:chai'], explanation_fr: 'Pas de verbe « être » au présent : Э́то чай.',
    }),
    build({
      slug: 'dialog_kak_dela', type: 'active_recall', item_id: 'lex:khorosho', competency: 'transfer', difficulty: 3,
      prompt_fr: 'On te demande « Как дела́? ». Réponds « Bien, merci ».', stimulus: { ru: 'Как дела́?', audio_text: 'Как дела?', show_text_before_answer: true },
      answer: { kind: 'cyrillic', accepted: ['Хорошо, спасибо', 'Спасибо, хорошо', 'Хорошо спасибо'] }, reads: ['Как дела́?'],
      writes: ['Хорошо, спасибо'], requires_items: ['struct:kak_dela', 'lex:spasibo'], explanation_fr: 'Хорошо́, спаси́бо.',
    }),
  ];
}

/** Consolidation (A0-07) : majuscules/minuscules et dictée simple. */
function consolidationExercises(): ExerciseDef[] {
  const out: ExerciseDef[] = [];
  const caseLetters = ['д', 'г', 'б', 'л', 'п', 'т', 'ё', 'я', 'ж', 'ф'];
  for (const lower of caseLetters) {
    const l = LETTERS.find((x) => x.lower === lower)!;
    const others = shuffle(LETTERS.filter((x) => x.lower !== lower && x.kind === l.kind), `case_${lower}`).slice(0, 3);
    out.push(build({
      slug: `case_${lower}`, type: 'letter_recognition', item_id: letterItemId(lower), competency: 'spelling', difficulty: 2,
      prompt_fr: `Quelle minuscule correspond à la majuscule ${l.upper} ?`, stimulus: { ru: l.upper, show_text_before_answer: true },
      choices: shuffle([l, ...others].map((x) => ({ id: x.lower, label: x.lower, ru: x.lower })), `casech_${lower}`),
      answer: { kind: 'choice', correct: lower }, reads: [l.upper], minUnit: 7, explanation_fr: `${l.upper} ↔ ${l.lower}.`,
    }));
  }
  const dictation: { ru: string; letter: string }[] = [
    { ru: 'мама', letter: 'м' }, { ru: 'кот', letter: 'к' }, { ru: 'нос', letter: 'н' }, { ru: 'дом', letter: 'д' },
    { ru: 'суп', letter: 'п' }, { ru: 'мир', letter: 'и' }, { ru: 'чай', letter: 'ч' }, { ru: 'сыр', letter: 'ы' },
  ];
  for (const d of dictation) {
    out.push(build({
      slug: `dictation_${d.ru}`, type: 'dictation', item_id: letterItemId(d.letter), competency: 'spelling', difficulty: 3,
      prompt_fr: 'Dictée : écoute et écris le mot en cyrillique.', stimulus: { audio_text: d.ru, show_text_before_answer: false },
      answer: { kind: 'cyrillic', accepted: [d.ru] }, writes: [d.ru], minUnit: 7, explanation_fr: `On écrit « ${d.ru} ».`,
    }));
  }
  return out;
}

/** Semaines 2 à 4 du mois 1 (§4) : structures en contexte, transfert, lecture de phrases, dialogue guidé. */
function monthOneExercises(): ExerciseDef[] {
  const cyr = (slug: string, item_id: string, competency: Competency, type: ExerciseType, prompt_fr: string, accepted: string[], o: Partial<ExInput> = {}) =>
    build({ slug, type, item_id, competency, prompt_fr, stimulus: o.stimulus ?? {}, answer: { kind: 'cyrillic', accepted }, writes: [accepted[0]!], difficulty: o.difficulty ?? 3, ...o });
  const mcq = (slug: string, item_id: string, prompt_fr: string, stimulus: ExerciseDef['stimulus'], options: { id: string; label: string; ru?: string }[], correct: string, o: Partial<ExInput> = {}) =>
    build({ slug, type: o.type ?? 'lexical_recognition', item_id, competency: o.competency ?? 'recognition', prompt_fr, stimulus, choices: shuffle(options, slug), answer: { kind: 'choice', correct }, difficulty: o.difficulty ?? 2, ...o });
  const shown = (ru: string): Partial<ExInput> => ({ stimulus: { ru, audio_text: stripStressMarks(ru), show_text_before_answer: true }, reads: [ru] });
  return [
    // A0-08 — je / tu / vous
    mcq('register_vy_teacher', 'lex:vy', 'Tu parles à une personne que tu ne connais pas (un serveur, un collègue). Tu utilises…', {},
      [{ id: 'vy', label: 'вы', ru: 'вы' }, { id: 'ty', label: 'ты', ru: 'ты' }], 'vy', { explanation_fr: 'Avec un inconnu ou par politesse : вы, comme « vous ».' }),
    mcq('register_ty_friend', 'lex:ty', 'Tu parles à un ami proche. Tu utilises…', {},
      [{ id: 'ty', label: 'ты', ru: 'ты' }, { id: 'vy', label: 'вы', ru: 'вы' }], 'ty', { explanation_fr: 'Entre amis : ты, comme « tu ».' }),
    cyr('transform_tebya_vas', 'struct:kak_vas_zovut', 'production', 'transformation', 'Passe au vouvoiement : Как тебя́ зову́т?', ['Как вас зовут?'],
      { ...shown('Как тебя́ зову́т?'), requires_items: ['struct:kak_tebya_zovut'], explanation_fr: 'тебя́ (toi) → вас (vous) : Как вас зову́т?' }),
    cyr('build_zdravstvuyte_anna', 'lex:zdravstvuyte', 'transfer', 'active_recall', 'Présente-toi poliment : « Bonjour, je m’appelle Anna. »',
      ['Здравствуйте, меня зовут Анна', 'Здравствуйте, я Анна'], { requires_items: ['struct:menya_zovut'], explanation_fr: 'Здра́вствуйте! Меня́ зову́т А́нна.' }),
    cyr('reply_ochen_priyatno', 'struct:ochen_priyatno', 'transfer', 'active_recall', 'On te dit « Меня́ зову́т И́ра. » Réponds « Enchanté ! »', ['Очень приятно'],
      { ...shown('Меня́ зову́т И́ра.'), requires_items: ['struct:menya_zovut'], explanation_fr: 'О́чень прия́тно!' }),
    // A0-09 — sans verbe « être »
    cyr('fill_kto_eto', 'lex:kto', 'production', 'fill_blank', 'Complète : ___ э́то? — Э́то ма́ма. (Qui est-ce ?)', ['Кто'],
      { ...shown('___ э́то? — Э́то ма́ма.'), requires_items: ['lex:eto'], difficulty: 2, explanation_fr: 'Кто э́то? = Qui est-ce ?' }),
    cyr('build_chto_eto', 'lex:chto', 'transfer', 'active_recall', 'Demande : « Qu’est-ce que c’est ? »', ['Что это?'],
      { requires_items: ['lex:eto'], explanation_fr: 'Что э́то? — sans verbe « être ».' }),
    cyr('build_on_drug', 'lex:on', 'transfer', 'active_recall', 'Écris en russe : « C’est un ami. » en commençant par « il ».', ['Он друг'],
      { requires_items: ['lex:drug'], explanation_fr: 'Он друг : ni verbe « être » ni article.' }),
    cyr('build_ona_mama', 'lex:ona', 'transfer', 'active_recall', 'Écris en russe : « Elle est maman. »', ['Она мама'],
      { explanation_fr: 'Она́ ма́ма.' }),
    mcq('read_eto_moy_drug', 'lex:drug', 'Que veut dire cette phrase ?', { ru: 'Э́то мой друг.', show_text_before_answer: true },
      [{ id: 'a', label: 'C’est mon ami.' }, { id: 'b', label: 'Où est mon ami ?' }, { id: 'c', label: 'Je veux un ami.' }], 'a',
      { reads: ['Э́то мой друг.'], requires_items: ['lex:eto'], competency: 'recognition' }),
    // A0-10 — vouloir, négation, questions
    cyr('fill_ty_khochesh', 'lex:khochesh', 'production', 'fill_blank', 'Complète « Tu veux un café ? » : Ты ___ ко́фе?', ['хочешь'],
      { ...shown('Ты ___ ко́фе?'), requires_items: ['lex:kofe'], difficulty: 2, explanation_fr: 'я хочу́ → ты хо́чешь.' }),
    cyr('fill_vy_khotite', 'lex:khotite', 'production', 'fill_blank', 'Complète « Voulez-vous du thé ? » : Вы ___ чай?', ['хотите'],
      { ...shown('Вы ___ чай?'), requires_items: ['lex:chai'], difficulty: 2, explanation_fr: 'я хочу́ → вы хоти́те.' }),
    cyr('transform_question_sok', 'lex:khochesh', 'transfer', 'transformation', 'Transforme en question à « tu » : Я хочу́ сок.', ['Ты хочешь сок?'],
      { ...shown('Я хочу́ сок.'), requires_items: ['lex:sok', 'struct:ya_khochu'], explanation_fr: 'Même ordre des mots, intonation montante : Ты хо́чешь сок?' }),
    cyr('reply_net_vino', 'lex:vino', 'transfer', 'active_recall', 'On te demande « Вы хоти́те вино́? ». Réponds : « Non, je ne veux pas de vin. »',
      ['Нет, я не хочу вино', 'Нет, не хочу вино', 'Нет, я не хочу', 'Нет, спасибо, я не хочу вино'],
      { ...shown('Вы хоти́те вино́?'), requires_items: ['lex:net', 'lex:ne', 'struct:ya_khochu', 'lex:khotite'], explanation_fr: 'Нет, я не хочу́ вино́.' }),
    mcq('read_eto_voda', 'lex:voda', 'Que dit cette phrase ?', { ru: 'Э́то вода́.', show_text_before_answer: true },
      [{ id: 'a', label: 'C’est de l’eau.' }, { id: 'b', label: 'Je veux de l’eau.' }, { id: 'c', label: 'Où est l’eau ?' }], 'a',
      { reads: ['Э́то вода́.'], requires_items: ['lex:eto'] }),
    // A0-11 — besoins et demandes polies
    cyr('build_gde_tualet', 'lex:gde', 'transfer', 'active_recall', 'Demande : « Où sont les toilettes ? »', ['Где туалет?'],
      { requires_items: ['lex:tualet'], explanation_fr: 'Где туале́т? — sans verbe.' }),
    cyr('fill_izvinite', 'lex:izvinite', 'production', 'fill_blank', 'Complète poliment : ___, где туале́т? (Excusez-moi…)', ['Извините'],
      { ...shown('___, где туале́т?'), requires_items: ['lex:gde', 'lex:tualet'], difficulty: 2, explanation_fr: 'Извини́те, где туале́т?' }),
    cyr('build_kofe_pozhaluysta', 'lex:pozhaluysta', 'transfer', 'active_recall', 'Commande poliment : « Un café, s’il vous plaît. »', ['Кофе, пожалуйста', 'Пожалуйста, кофе'],
      { requires_items: ['lex:kofe'], explanation_fr: 'Ко́фе, пожа́луйста.' }),
    cyr('build_skolko_stoit_chai', 'struct:skolko_stoit', 'transfer', 'active_recall', 'Demande : « Combien coûte le thé ? »', ['Сколько стоит чай?'],
      { requires_items: ['lex:chai'], explanation_fr: 'Ско́лько сто́ит чай?' }),
    cyr('build_mne_nuzhno_tualet', 'struct:mne_nuzhno', 'transfer', 'active_recall', 'Dis : « J’ai besoin d’aller aux toilettes. »', ['Мне нужно в туалет'],
      { requires_items: ['lex:tualet'], explanation_fr: 'Мне ну́жно в туале́т (expression figée).' }),
    // A0-12 — dialogue guidé au café (30–60 s)
    mcq('dialog_listen_chto_vy_khotite', 'struct:dialog_kafe', 'Le serveur te parle. Écoute : que te demande-t-il ?', { audio_text: 'Здравствуйте! Что вы хотите?', show_text_before_answer: false },
      [{ id: 'a', label: 'Bonjour ! Que désirez-vous ?' }, { id: 'b', label: 'Bonjour ! Comment vous appelez-vous ?' }, { id: 'c', label: 'Bonjour ! Combien ça coûte ?' }], 'a',
      { type: 'listening', competency: 'listening', explanation_fr: 'Что вы хоти́те? = Que voulez-vous ?' }),
    cyr('dialog_reply_order', 'struct:dialog_kafe', 'transfer', 'active_recall', 'Le serveur : « Здра́вствуйте! Что вы хоти́те? » Salue et commande un café poliment.',
      ['Здравствуйте, кофе, пожалуйста', 'Здравствуйте, я хочу кофе', 'Здравствуйте, я хочу кофе, пожалуйста', 'Кофе, пожалуйста', 'Я хочу кофе, пожалуйста', 'Я хочу кофе'],
      { ...shown('Здра́вствуйте! Что вы хоти́те?'), requires_items: ['lex:zdravstvuyte', 'lex:khotite', 'lex:pozhaluysta', 'lex:kofe'], explanation_fr: 'Здра́вствуйте. Ко́фе, пожа́луйста.' }),
    cyr('dialog_reply_thanks', 'struct:dialog_kafe', 'transfer', 'active_recall', 'Le serveur pose la tasse : « Вот ко́фе. » Remercie-le.', ['Спасибо'],
      { ...shown('Вот ко́фе.'), requires_items: ['lex:spasibo'], difficulty: 2, explanation_fr: 'Спаси́бо!' }),
    cyr('dialog_ask_toilets', 'struct:dialog_kafe', 'transfer', 'active_recall', 'Interpelle poliment le serveur et demande où sont les toilettes.', ['Извините, где туалет?', 'Где туалет?'],
      { requires_items: ['lex:izvinite', 'lex:gde', 'lex:tualet'], explanation_fr: 'Извини́те, где туале́т?' }),
    mcq('dialog_read_comprehension', 'struct:dialog_kafe', 'Lis le dialogue. Que commande le client ?',
      { ru: '— Здра́вствуйте! Что вы хоти́те? — Здра́вствуйте. Ко́фе, пожа́луйста. — Вот ко́фе. — Спаси́бо!', show_text_before_answer: true },
      [{ id: 'kofe', label: 'Un café' }, { id: 'chai', label: 'Un thé' }, { id: 'vino', label: 'Du vin' }, { id: 'voda', label: 'De l’eau' }], 'kofe',
      { reads: ['— Здра́вствуйте! Что вы хоти́те? — Здра́вствуйте. Ко́фе, пожа́луйста. — Вот ко́фе. — Спаси́бо!'],
        requires_items: ['lex:zdravstvuyte', 'lex:khotite', 'lex:pozhaluysta', 'lex:kofe', 'lex:spasibo'] }),
    cyr('dialog_dictation_gde_tualet', 'struct:dialog_kafe', 'spelling', 'dictation', 'Dictée : écoute et écris la phrase en cyrillique.', ['Где туалет?'],
      { stimulus: { audio_text: 'Где туалет?', show_text_before_answer: false }, requires_items: ['lex:gde', 'lex:tualet'], explanation_fr: 'Где туале́т?' }),
  ];
}

export const EXERCISES: ExerciseDef[] = [
  ...LETTERS.flatMap(letterExercises),
  ...transferExercises(),
  ...LEXEMES.flatMap(lexemeExercises),
  ...structureExercises(),
  ...consolidationExercises(),
  ...monthOneExercises(),
];

export const SPEAKABLE_ITEMS: ReadonlySet<string> = new Set(LEXEMES.map((x) => x.item_id));

export const ALL_LETTERS: readonly string[] = LETTERS.map((l) => l.lower);
