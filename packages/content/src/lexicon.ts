/**
 * Lexique et structures de la première semaine (§7, §21).
 * Les mots oraux contenant des lettres inconnues sont appris par audio, sans évaluation en lecture :
 * leurs exercices de lecture/écriture ne deviennent disponibles qu'une fois les lettres enseignées.
 * Translittérations approximatives : l'audio validé fait référence.
 */
export interface LexemeDef {
  item_id: string;
  type: 'lexeme' | 'structure';
  /** Séance d'introduction orale (A0-0x). */
  unit: number;
  ru: string; // avec accent pédagogique
  translit_fr: string;
  fr: string;
  pos: 'interjection' | 'particle' | 'noun' | 'verb' | 'pronoun' | 'adverb' | 'phrase';
  gender?: 'm' | 'f' | 'n';
  note_fr: string;
  examples: { ru: string; fr: string }[];
  /** Réponses russes acceptées pour le rappel actif (variantes validées). */
  accepted: string[];
  themes: string[];
  frequency_band: 1 | 2 | 3;
}

export const LEXEMES: LexemeDef[] = [
  { item_id: 'lex:privet', type: 'lexeme', unit: 1, ru: 'Приве́т', translit_fr: 'priviet', fr: 'salut (en arrivant)', pos: 'interjection',
    note_fr: 'Salutation familière, entre amis ou proches. Avec des inconnus, on dit plutôt Здра́вствуйте (vu plus tard).',
    examples: [{ ru: 'Приве́т, ма́ма!', fr: 'Salut, maman !' }], accepted: ['Привет'], themes: ['famille'], frequency_band: 1 },
  { item_id: 'lex:da', type: 'lexeme', unit: 1, ru: 'Да', translit_fr: 'da', fr: 'oui', pos: 'particle', note_fr: 'Réponse affirmative.',
    examples: [{ ru: 'Да, спаси́бо.', fr: 'Oui, merci.' }], accepted: ['Да'], themes: [], frequency_band: 1 },
  { item_id: 'lex:net', type: 'lexeme', unit: 1, ru: 'Нет', translit_fr: 'niet', fr: 'non', pos: 'particle', note_fr: 'Réponse négative.',
    examples: [{ ru: 'Нет, спаси́бо.', fr: 'Non, merci.' }], accepted: ['Нет'], themes: [], frequency_band: 1 },
  { item_id: 'lex:spasibo', type: 'lexeme', unit: 1, ru: 'Спаси́бо', translit_fr: 'spassiba', fr: 'merci', pos: 'interjection',
    note_fr: 'Le о final non accentué se prononce presque [a] : réduction vocalique.',
    examples: [{ ru: 'Спаси́бо!', fr: 'Merci !' }], accepted: ['Спасибо'], themes: [], frequency_band: 1 },
  { item_id: 'lex:poka', type: 'lexeme', unit: 1, ru: 'Пока́', translit_fr: 'paka', fr: 'salut (en partant)', pos: 'interjection',
    note_fr: 'Au revoir familier. Le premier о, non accentué, se prononce [a].',
    examples: [{ ru: 'Пока́, ма́ма!', fr: 'Salut, maman !' }], accepted: ['Пока'], themes: ['famille'], frequency_band: 1 },
  { item_id: 'struct:kak_dela', type: 'structure', unit: 2, ru: 'Как дела́?', translit_fr: 'kak dila', fr: 'comment ça va ?', pos: 'phrase',
    note_fr: 'Question familière. Réponse simple : Хорошо́ ! (bien).',
    examples: [{ ru: 'Приве́т! Как дела́?', fr: 'Salut ! Comment ça va ?' }], accepted: ['Как дела?', 'Как дела'], themes: [], frequency_band: 1 },
  { item_id: 'lex:khorosho', type: 'lexeme', unit: 2, ru: 'Хорошо́', translit_fr: 'kharacho', fr: 'bien', pos: 'adverb',
    note_fr: 'Accent sur la dernière syllabe ; les deux premiers о se réduisent : [kharacho].',
    examples: [{ ru: 'Хорошо́, спаси́бо.', fr: 'Bien, merci.' }], accepted: ['Хорошо'], themes: [], frequency_band: 1 },
  { item_id: 'struct:menya_zovut', type: 'structure', unit: 3, ru: 'Меня́ зову́т…', translit_fr: 'minia zavout', fr: 'je m’appelle…', pos: 'phrase',
    note_fr: 'Littéralement « on m’appelle… ». Il n’y a pas de verbe « être » ici : on ajoute directement le prénom.',
    examples: [{ ru: 'Меня́ зову́т А́нна.', fr: 'Je m’appelle Anna.' }], accepted: ['Меня зовут'], themes: [], frequency_band: 1 },
  { item_id: 'struct:ya_khochu', type: 'structure', unit: 4, ru: 'Я хочу́…', translit_fr: 'ya khatchou', fr: 'je veux…', pos: 'phrase',
    note_fr: 'Structure productive : Я хочу́ + ce que l’on veut. On ne met pas d’article : « je veux café ».',
    examples: [{ ru: 'Я хочу́ ко́фе.', fr: 'Je veux un café.' }], accepted: ['Я хочу'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:kofe', type: 'lexeme', unit: 5, ru: 'ко́фе', translit_fr: 'kofié', fr: 'café', pos: 'noun', gender: 'm',
    note_fr: 'Mot invariable (il ne change jamais de forme).', examples: [{ ru: 'Я хочу́ ко́фе.', fr: 'Je veux un café.' }],
    accepted: ['кофе'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:chai', type: 'lexeme', unit: 5, ru: 'чай', translit_fr: 'tchaï', fr: 'thé', pos: 'noun', gender: 'm',
    note_fr: 'Une seule syllabe : ч + а + й.', examples: [{ ru: 'Я хочу́ чай.', fr: 'Je veux du thé.' }],
    accepted: ['чай'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:ne', type: 'lexeme', unit: 5, ru: 'не', translit_fr: 'nié', fr: 'ne… pas (négation)', pos: 'particle',
    note_fr: 'Se place juste avant le verbe : Я не хочу́ — je ne veux pas.', examples: [{ ru: 'Я не хочу́ ко́фе.', fr: 'Je ne veux pas de café.' }],
    accepted: ['не'], themes: [], frequency_band: 1 },
  { item_id: 'lex:eto', type: 'lexeme', unit: 6, ru: 'э́то', translit_fr: 'èta', fr: 'c’est ; ceci', pos: 'pronoun',
    note_fr: 'Au présent, pas de verbe « être » : Э́то чай — c’est du thé.', examples: [{ ru: 'Э́то ма́ма.', fr: 'C’est maman.' }],
    accepted: ['это'], themes: ['famille'], frequency_band: 1 },
];
