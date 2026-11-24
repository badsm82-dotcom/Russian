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
  /** Faux : pas d'exercices générés automatiquement (écoute / lecture / rappel), seulement ceux écrits à la main. */
  generate?: boolean;
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

  // --- Semaine 2 : se présenter, je / tu / vous (A0-08) ---
  { item_id: 'lex:ya', type: 'lexeme', unit: 8, ru: 'я', translit_fr: 'ia', fr: 'je, moi', pos: 'pronoun',
    note_fr: 'Toujours en minuscule au milieu d’une phrase (contrairement à l’anglais « I »).',
    examples: [{ ru: 'Я Анна.', fr: 'Je suis Anna.' }], accepted: ['я'], themes: [], frequency_band: 1 },
  { item_id: 'lex:ty', type: 'lexeme', unit: 8, ru: 'ты', translit_fr: 'ty', fr: 'tu (familier)', pos: 'pronoun',
    note_fr: 'Pour la famille, les amis, les enfants. Comme le « tu » français.',
    examples: [{ ru: 'Ты Анна?', fr: 'Tu es Anna ?' }], accepted: ['ты'], themes: ['famille'], frequency_band: 1 },
  { item_id: 'lex:vy', type: 'lexeme', unit: 8, ru: 'вы', translit_fr: 'vy', fr: 'vous (politesse ou pluriel)', pos: 'pronoun',
    note_fr: 'Comme le « vous » français : poli envers une personne, ou pluriel. Le ы se prononce langue en arrière.',
    examples: [{ ru: 'Вы Анна?', fr: 'Vous êtes Anna ?' }], accepted: ['вы'], themes: [], frequency_band: 1 },
  { item_id: 'lex:zdravstvuyte', type: 'lexeme', unit: 8, ru: 'Здра́вствуйте', translit_fr: 'zdrastvouïtié', fr: 'bonjour (poli)', pos: 'interjection',
    note_fr: 'Bonjour poli (vouvoiement). Le premier в ne se prononce pas : [zdrastvouïtié].',
    examples: [{ ru: 'Здра́вствуйте! Меня́ зову́т А́нна.', fr: 'Bonjour ! Je m’appelle Anna.' }], accepted: ['Здравствуйте'], themes: ['travail'], frequency_band: 1 },
  { item_id: 'struct:ochen_priyatno', type: 'structure', unit: 8, ru: 'О́чень прия́тно', translit_fr: 'otchin’ priiatna', fr: 'enchanté(e)', pos: 'phrase',
    note_fr: 'Littéralement « très agréable ». Se dit après une présentation.',
    examples: [{ ru: 'Меня́ зову́т А́нна. — О́чень прия́тно!', fr: 'Je m’appelle Anna. — Enchanté !' }], accepted: ['Очень приятно'], themes: [], frequency_band: 1 },
  { item_id: 'struct:kak_tebya_zovut', type: 'structure', unit: 8, ru: 'Как тебя́ зову́т?', translit_fr: 'kak tibia zavout', fr: 'comment tu t’appelles ?', pos: 'phrase',
    note_fr: 'Littéralement « comment t’appelle-t-on ? ». Réponse : Меня́ зову́т…',
    examples: [{ ru: 'Приве́т! Как тебя́ зову́т?', fr: 'Salut ! Comment tu t’appelles ?' }], accepted: ['Как тебя зовут?'], themes: [], frequency_band: 1 },
  { item_id: 'struct:kak_vas_zovut', type: 'structure', unit: 8, ru: 'Как вас зову́т?', translit_fr: 'kak vas zavout', fr: 'comment vous appelez-vous ?', pos: 'phrase',
    note_fr: 'Version polie : тебя́ (toi) devient вас (vous).',
    examples: [{ ru: 'Здра́вствуйте! Как вас зову́т?', fr: 'Bonjour ! Comment vous appelez-vous ?' }], accepted: ['Как вас зовут?'], themes: ['travail'], frequency_band: 1 },
  // --- Semaine 2 : phrases sans verbe « être » (A0-09) ---
  { item_id: 'lex:kto', type: 'lexeme', unit: 9, ru: 'кто', translit_fr: 'kto', fr: 'qui ?', pos: 'pronoun',
    note_fr: 'Кто э́то? = Qui est-ce ? Pas de verbe « être » au présent.',
    examples: [{ ru: 'Кто э́то? — Э́то ма́ма.', fr: 'Qui est-ce ? — C’est maman.' }], accepted: ['кто'], themes: ['famille'], frequency_band: 1 },
  { item_id: 'lex:chto', type: 'lexeme', unit: 9, ru: 'что', translit_fr: 'chto', fr: 'quoi ? que ?', pos: 'pronoun',
    note_fr: 'Exception de prononciation : чт se dit [cht] → [chto].',
    examples: [{ ru: 'Что э́то? — Э́то чай.', fr: 'Qu’est-ce que c’est ? — C’est du thé.' }], accepted: ['что'], themes: [], frequency_band: 1 },
  { item_id: 'lex:on', type: 'lexeme', unit: 9, ru: 'он', translit_fr: 'on', fr: 'il, lui', pos: 'pronoun',
    note_fr: 'Он друг = il (est un) ami : ni verbe « être » ni article.',
    examples: [{ ru: 'Он друг.', fr: 'C’est un ami. / Il est un ami.' }], accepted: ['он'], themes: [], frequency_band: 1 },
  { item_id: 'lex:ona', type: 'lexeme', unit: 9, ru: 'она́', translit_fr: 'ana', fr: 'elle', pos: 'pronoun',
    note_fr: 'Le premier о, non accentué, se dit [a] : [ana].',
    examples: [{ ru: 'Она́ ма́ма.', fr: 'Elle est maman.' }], accepted: ['она'], themes: ['famille'], frequency_band: 1 },
  { item_id: 'lex:drug', type: 'lexeme', unit: 9, ru: 'друг', translit_fr: 'drouk', fr: 'ami', pos: 'noun', gender: 'm',
    note_fr: 'Le г final s’assourdit en [k] : [drouk].',
    examples: [{ ru: 'Э́то мой друг.', fr: 'C’est mon ami.' }], accepted: ['друг'], themes: ['famille'], frequency_band: 1 },
  // --- Semaine 3 : vouloir, négation, questions (A0-10) ---
  { item_id: 'lex:khochesh', type: 'lexeme', unit: 10, ru: 'ты хо́чешь', translit_fr: 'ty khotchich’', fr: 'tu veux', pos: 'verb',
    note_fr: 'Même verbe que я хочу́, à la 2e personne. Une question se fait seulement par l’intonation : Ты хо́чешь ко́фе?',
    examples: [{ ru: 'Ты хо́чешь чай?', fr: 'Tu veux du thé ?' }], accepted: ['ты хочешь'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:khotite', type: 'lexeme', unit: 10, ru: 'вы хоти́те', translit_fr: 'vy khatitié', fr: 'vous voulez', pos: 'verb',
    note_fr: 'Forme polie ou plurielle ; l’accent passe sur la fin : хоти́те.',
    examples: [{ ru: 'Что вы хоти́те?', fr: 'Que voulez-vous ?' }], accepted: ['вы хотите'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:voda', type: 'lexeme', unit: 10, ru: 'вода́', translit_fr: 'vada', fr: 'eau', pos: 'noun', gender: 'f',
    note_fr: 'Accent sur la fin ; le о non accentué se dit [a].',
    examples: [{ ru: 'Э́то вода́.', fr: 'C’est de l’eau.' }], accepted: ['вода'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:sok', type: 'lexeme', unit: 10, ru: 'сок', translit_fr: 'sok', fr: 'jus', pos: 'noun', gender: 'm',
    note_fr: 'Masculin, ne change pas dans Я хочу́ сок.',
    examples: [{ ru: 'Я хочу́ сок.', fr: 'Je veux du jus.' }], accepted: ['сок'], themes: ['cuisine'], frequency_band: 2 },
  { item_id: 'lex:vino', type: 'lexeme', unit: 10, ru: 'вино́', translit_fr: 'vino', fr: 'vin', pos: 'noun', gender: 'n',
    note_fr: 'Neutre, ne change pas dans Я хочу́ вино́. Accent sur la fin.',
    examples: [{ ru: 'Вы хоти́те вино́?', fr: 'Voulez-vous du vin ?' }], accepted: ['вино'], themes: ['cuisine'], frequency_band: 2 },
  // --- Semaine 3 : besoins et demandes (A0-11) ---
  { item_id: 'lex:pozhaluysta', type: 'lexeme', unit: 11, ru: 'пожа́луйста', translit_fr: 'pajalsta', fr: 's’il vous plaît ; je vous en prie', pos: 'interjection',
    note_fr: 'Prononcé souvent [pajalsta] : le й et le у s’effacent dans la conversation.',
    examples: [{ ru: 'Ко́фе, пожа́луйста.', fr: 'Un café, s’il vous plaît.' }], accepted: ['пожалуйста'], themes: ['cuisine'], frequency_band: 1 },
  { item_id: 'lex:izvinite', type: 'lexeme', unit: 11, ru: 'Извини́те', translit_fr: 'izvinitié', fr: 'excusez-moi', pos: 'interjection',
    note_fr: 'Pour interpeller poliment ou s’excuser.',
    examples: [{ ru: 'Извини́те, где туале́т?', fr: 'Excusez-moi, où sont les toilettes ?' }], accepted: ['Извините'], themes: ['voyages'], frequency_band: 1 },
  { item_id: 'lex:gde', type: 'lexeme', unit: 11, ru: 'где', translit_fr: 'gdié', fr: 'où ?', pos: 'adverb',
    note_fr: 'Где + chose cherchée, sans verbe : Где кафе́? = Où est le café ?',
    examples: [{ ru: 'Где туале́т?', fr: 'Où sont les toilettes ?' }], accepted: ['где'], themes: ['voyages'], frequency_band: 1 },
  { item_id: 'lex:tualet', type: 'lexeme', unit: 11, ru: 'туале́т', translit_fr: 'toualiet', fr: 'toilettes', pos: 'noun', gender: 'm',
    note_fr: 'Au singulier en russe.',
    examples: [{ ru: 'Туале́т там.', fr: 'Les toilettes sont là-bas.' }], accepted: ['туалет'], themes: ['voyages'], frequency_band: 2 },
  { item_id: 'struct:mne_nuzhno', type: 'structure', unit: 11, ru: 'Мне ну́жно…', translit_fr: 'mnié noujna', fr: 'j’ai besoin (de…)', pos: 'phrase',
    note_fr: 'Littéralement « à moi (il est) nécessaire ». Expression figée utile : Мне ну́жно в туале́т (j’ai besoin d’aller aux toilettes). Le reste viendra avec les verbes.',
    examples: [{ ru: 'Мне ну́жно в туале́т.', fr: 'J’ai besoin d’aller aux toilettes.' }], accepted: ['Мне нужно'], themes: ['voyages'], frequency_band: 1 },
  { item_id: 'struct:skolko_stoit', type: 'structure', unit: 11, ru: 'Ско́лько сто́ит?', translit_fr: 'skol’ka stoït', fr: 'combien ça coûte ?', pos: 'phrase',
    note_fr: 'Ско́лько сто́ит + chose : Ско́лько сто́ит ко́фе? = Combien coûte le café ?',
    examples: [{ ru: 'Ско́лько сто́ит чай?', fr: 'Combien coûte le thé ?' }], accepted: ['Сколько стоит?'], themes: ['commerce'], frequency_band: 1 },
  // --- Semaine 4 : dialogue guidé au café (A0-12) ---
  { item_id: 'struct:dialog_kafe', type: 'structure', unit: 12, ru: 'В кафе́', translit_fr: 'f kafé', fr: 'dialogue : au café', pos: 'phrase',
    note_fr: 'Un dialogue complet avec tout ce que tu as appris : saluer, commander poliment, remercier, demander où sont les toilettes.',
    examples: [
      { ru: '— Здра́вствуйте! Что вы хоти́те?', fr: '— Bonjour ! Que désirez-vous ?' },
      { ru: '— Здра́вствуйте. Ко́фе, пожа́луйста.', fr: '— Bonjour. Un café, s’il vous plaît.' },
      { ru: '— Вот ко́фе.', fr: '— Voici le café.' },
      { ru: '— Спаси́бо! Извини́те, где туале́т?', fr: '— Merci ! Excusez-moi, où sont les toilettes ?' },
      { ru: '— Там.', fr: '— Là-bas.' },
    ],
    accepted: ['В кафе'], themes: ['cuisine', 'voyages'], frequency_band: 1, generate: false },
];
