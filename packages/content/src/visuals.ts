/**
 * Supports visuels et didactiques des fiches (double codage image + mot, tableaux de structures, catégories de lettres).
 * Ils enrichissent les fiches de présentation uniquement : les exercices versionnés ne changent pas.
 */

/** Pictogramme associé à chaque expression (aide-mémoire visuel, jamais une réponse attendue). */
export const ITEM_EMOJI: Record<string, string> = {
  'lex:privet': '👋', 'lex:da': '✅', 'lex:net': '❌', 'lex:spasibo': '🙏', 'lex:poka': '🚶‍♂️👋',
  'struct:kak_dela': '🙂❓', 'lex:khorosho': '👍', 'struct:menya_zovut': '🏷️', 'struct:ya_khochu': '🤲',
  'lex:kofe': '☕', 'lex:chai': '🍵', 'lex:ne': '🚫', 'lex:eto': '👉',
  'lex:ya': '🙋', 'lex:ty': '🧑‍🤝‍🧑', 'lex:vy': '🤵', 'lex:zdravstvuyte': '🤝', 'struct:ochen_priyatno': '😊',
  'struct:kak_tebya_zovut': '🏷️❓', 'struct:kak_vas_zovut': '📛❓',
  'lex:kto': '🧑❓', 'lex:chto': '📦❓', 'lex:on': '👨', 'lex:ona': '👩', 'lex:drug': '🤜🤛',
  'lex:khochesh': '🫵', 'lex:khotite': '🫴', 'lex:voda': '💧', 'lex:sok': '🧃', 'lex:vino': '🍷',
  'lex:pozhaluysta': '💁', 'lex:izvinite': '🙇', 'lex:gde': '📍', 'lex:tualet': '🚻',
  'struct:mne_nuzhno': '❗', 'struct:skolko_stoit': '💶', 'struct:dialog_kafe': '☕🗣️',
};

export interface CardTable {
  caption_fr: string;
  headers: string[];
  /** Cellules : texte russe (avec accent pédagogique) ou français ; `muted` grise un mot absent en russe. */
  rows: { cells: string[]; highlight?: boolean }[];
  note_fr?: string;
}

/** Tableaux de structures (§7 : apprendre par blocs, un contraste à la fois). */
export const ITEM_TABLES: Record<string, CardTable> = {
  'lex:ne': {
    caption_fr: 'La négation : не juste avant le verbe',
    headers: ['Affirmatif', 'Négatif'],
    rows: [{ cells: ['Я хочу́ ко́фе.', 'Я не хочу́ ко́фе.'], highlight: true }, { cells: ['je veux un café', 'je ne veux pas de café'] }],
  },
  'lex:eto': {
    caption_fr: 'Au présent : pas de verbe « être », pas d’article',
    headers: ['Russe', 'Mot à mot', 'Français'],
    rows: [{ cells: ['Э́то чай.', 'ceci — thé', 'C’est du thé.'], highlight: true }, { cells: ['Э́то ма́ма.', 'ceci — maman', 'C’est maman.'] }],
    note_fr: 'Le tiret « — » marque la place du verbe « être », qui ne se dit pas.',
  },
  'lex:vy': {
    caption_fr: 'Tu ou vous ?',
    headers: ['', 'À qui ?', 'Comme en français'],
    rows: [{ cells: ['ты', 'ami, famille, enfant', 'tu'] }, { cells: ['вы', 'inconnu, client, collègue, ou plusieurs personnes', 'vous'], highlight: true }],
  },
  'struct:kak_vas_zovut': {
    caption_fr: 'Demander le prénom',
    headers: ['Familier (ты)', 'Poli (вы)'],
    rows: [{ cells: ['Как тебя́ зову́т?', 'Как вас зову́т?'], highlight: true }, { cells: ['tebia = toi', 'vas = vous'] }],
  },
  'lex:on': {
    caption_fr: 'Les pronoms vus jusqu’ici',
    headers: ['Russe', 'Français'],
    rows: [{ cells: ['я', 'je'] }, { cells: ['ты', 'tu'] }, { cells: ['он', 'il'], highlight: true }, { cells: ['она́', 'elle'], highlight: true }, { cells: ['вы', 'vous'] }],
  },
  'lex:drug': {
    caption_fr: 'Phrase sans verbe « être »',
    headers: ['Russe', 'Mot à mot', 'Français'],
    rows: [{ cells: ['Он друг.', 'il — ami', 'C’est un ami.'], highlight: true }, { cells: ['Она́ ма́ма.', 'elle — maman', 'Elle est maman.'] }],
  },
  'lex:khochesh': {
    caption_fr: 'Хоте́ть (vouloir) au présent — formes vues',
    headers: ['Pronom', 'Verbe', 'Français'],
    rows: [{ cells: ['я', 'хочу́', 'je veux'] }, { cells: ['ты', 'хо́чешь', 'tu veux'], highlight: true }, { cells: ['вы', 'хоти́те', 'vous voulez'] }],
    note_fr: 'Question = même phrase, intonation qui monte : Ты хо́чешь чай?',
  },
  'lex:khotite': {
    caption_fr: 'Хоте́ть (vouloir) au présent — formes vues',
    headers: ['Pronom', 'Verbe', 'Français'],
    rows: [{ cells: ['я', 'хочу́', 'je veux'] }, { cells: ['ты', 'хо́чешь', 'tu veux'] }, { cells: ['вы', 'хоти́те', 'vous voulez'], highlight: true }],
  },
  'struct:skolko_stoit': {
    caption_fr: 'Demander un prix',
    headers: ['Russe', 'Français'],
    rows: [{ cells: ['Ско́лько сто́ит ко́фе?', 'Combien coûte le café ?'], highlight: true }, { cells: ['Ско́лько сто́ит чай?', 'Combien coûte le thé ?'] }],
  },
};

export type LetterClassKey = 'vowel_hard' | 'vowel_soft' | 'consonant_voiced' | 'consonant_voiceless' | 'consonant_sonorant' | 'sign';

export interface LetterClass {
  key: LetterClassKey;
  label_fr: string;
  detail_fr: string;
}

const VOICED_PAIRS: Record<string, string> = { б: 'п', в: 'ф', г: 'к', д: 'т', ж: 'ш', з: 'с' };
const VOICELESS_PAIRS: Record<string, string> = Object.fromEntries(Object.entries(VOICED_PAIRS).map(([a, b]) => [b, a]));

/** Classe phonologique simple d'une lettre, pour un repère visuel coloré. */
export function letterClass(lower: string): LetterClass {
  if ('аоуыэ'.includes(lower)) return { key: 'vowel_hard', label_fr: 'Voyelle « dure »', detail_fr: 'La consonne d’avant reste dure.' };
  if ('яёюие'.includes(lower)) return { key: 'vowel_soft', label_fr: 'Voyelle « molle »', detail_fr: 'Elle adoucit (palatalise) la consonne d’avant.' };
  if ('ьъ'.includes(lower)) return { key: 'sign', label_fr: 'Signe (aucun son)', detail_fr: lower === 'ь' ? 'Adoucit la consonne d’avant.' : 'Sépare la consonne de la voyelle qui suit.' };
  if (VOICED_PAIRS[lower]) return { key: 'consonant_voiced', label_fr: 'Consonne sonore', detail_fr: `Paire sourde : ${VOICED_PAIRS[lower]}. En fin de mot, elle se prononce comme ${VOICED_PAIRS[lower]}.` };
  if (VOICELESS_PAIRS[lower]) return { key: 'consonant_voiceless', label_fr: 'Consonne sourde', detail_fr: `Paire sonore : ${VOICELESS_PAIRS[lower]}.` };
  if ('лмнрй'.includes(lower)) return { key: 'consonant_sonorant', label_fr: 'Consonne « sonante »', detail_fr: 'Pas de paire sourde/sonore.' };
  return { key: 'consonant_voiceless', label_fr: 'Consonne sourde', detail_fr: lower === 'ц' ? 'Toujours dure.' : lower === 'ч' || lower === 'щ' ? 'Toujours molle.' : 'Sans paire sonore.' };
}

/** Lettre latine qu'on risque de lire à la place (faux ami visuel). */
export const LATIN_LOOKALIKE: Record<string, string> = { в: 'B', н: 'H', р: 'P', с: 'C', у: 'Y', х: 'X' };
