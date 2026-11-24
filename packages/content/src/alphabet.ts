/**
 * Les 33 lettres de l'alphabet russe (§5, F03), réparties en 6 séances + 1 séance de consolidation.
 * Toutes les approximations françaises sont signalées comme telles ; l'audio validé reste la référence.
 * Statut : pending_review — à faire relire par un russophone compétent avant publication (§17).
 */

export interface WordExample {
  ru: string; // avec accent pédagogique
  fr: string;
  /** Prononciations approximatives acceptées en plus de la translittération lettre à lettre. */
  pron?: string[];
}

export interface LetterDef {
  upper: string;
  lower: string;
  name_ru: string;
  group: 1 | 2 | 3 | 4 | 5 | 6;
  /** Étiquette courte du son (choix de QCM). */
  sound_label_fr: string;
  /** Explication du son, approximation française signalée. */
  sound_fr: string;
  approximation: boolean;
  kind: 'vowel' | 'consonant' | 'sign' | 'semivowel';
  /** Lettres souvent confondues (contrastes latin/cyrillique, paires sourdes/sonores). */
  confusions: string[];
  /** Piège latin éventuel : ce que la lettre « ressemble » être. */
  latin_trap_fr?: string;
  /** Mots d'exemple montrés lors de la présentation (décodables avec les lettres connues). */
  examples: WordExample[];
}

export const LETTERS: LetterDef[] = [
  // Séance 1 — А К М О Т
  { upper: 'А', lower: 'а', name_ru: 'а', group: 1, kind: 'vowel', sound_label_fr: '[a] comme « papa »', sound_fr: '[a] comme dans « papa ».', approximation: false, confusions: ['о'],
    examples: [{ ru: 'ма́ма', fr: 'maman' }] },
  { upper: 'К', lower: 'к', name_ru: 'ка', group: 1, kind: 'consonant', sound_label_fr: '[k] comme « kilo »', sound_fr: '[k] comme dans « kilo ».', approximation: false, confusions: ['г', 'х'],
    examples: [{ ru: 'кот', fr: 'chat (animal)' }, { ru: 'мак', fr: 'pavot' }] },
  { upper: 'М', lower: 'м', name_ru: 'эм', group: 1, kind: 'consonant', sound_label_fr: '[m] comme « mot »', sound_fr: '[m] comme dans « mot ». La minuscule imprimée м ressemble à un petit M.', approximation: false, confusions: ['т'],
    examples: [{ ru: 'ма́ма', fr: 'maman' }, { ru: 'там', fr: 'là-bas' }] },
  { upper: 'О', lower: 'о', name_ru: 'о', group: 1, kind: 'vowel', sound_label_fr: '[o] comme « mot »', sound_fr: '[o] sous l’accent tonique. Hors accent, il se réduit vers [a] : c’est la réduction vocalique.', approximation: true, confusions: ['а'],
    examples: [{ ru: 'кот', fr: 'chat (animal)' }] },
  { upper: 'Т', lower: 'т', name_ru: 'тэ', group: 1, kind: 'consonant', sound_label_fr: '[t] comme « tard »', sound_fr: '[t] comme dans « tard ». La minuscule т ressemble à un petit T (et en écriture manuscrite à un m).', approximation: false, confusions: ['м'],
    examples: [{ ru: 'там', fr: 'là-bas' }, { ru: 'так', fr: 'ainsi, comme ça' }] },
  // Séance 2 — В Н Р С У Х (faux amis visuels latin/cyrillique)
  { upper: 'В', lower: 'в', name_ru: 'вэ', group: 2, kind: 'consonant', sound_label_fr: '[v] comme « vous »', sound_fr: '[v] comme dans « vous ».', approximation: false, confusions: ['б'],
    latin_trap_fr: 'Ressemble au B latin, mais se lit [v].', examples: [{ ru: 'вот', fr: 'voici' }] },
  { upper: 'Н', lower: 'н', name_ru: 'эн', group: 2, kind: 'consonant', sound_label_fr: '[n] comme « nez »', sound_fr: '[n] comme dans « nez ».', approximation: false, confusions: ['п', 'и'],
    latin_trap_fr: 'Ressemble au H latin, mais se lit [n].', examples: [{ ru: 'нос', fr: 'nez' }, { ru: 'сон', fr: 'sommeil, rêve' }] },
  { upper: 'Р', lower: 'р', name_ru: 'эр', group: 2, kind: 'consonant', sound_label_fr: '[r] roulé', sound_fr: '[r] roulé du bout de la langue (approximation : r italien ou espagnol).', approximation: true, confusions: ['н'],
    latin_trap_fr: 'Ressemble au P latin, mais se lit [r].', examples: [{ ru: 'рот', fr: 'bouche' }] },
  { upper: 'С', lower: 'с', name_ru: 'эс', group: 2, kind: 'consonant', sound_label_fr: '[s] comme « sac »', sound_fr: '[s] comme dans « sac », toujours [s], jamais [z] entre voyelles.', approximation: false, confusions: ['з'],
    latin_trap_fr: 'Ressemble au C latin, mais se lit toujours [s].', examples: [{ ru: 'сок', fr: 'jus' }, { ru: 'нос', fr: 'nez' }] },
  { upper: 'У', lower: 'у', name_ru: 'у', group: 2, kind: 'vowel', sound_label_fr: '[ou] comme « fou »', sound_fr: '[ou] comme dans « fou ».', approximation: false, confusions: ['ю'],
    latin_trap_fr: 'Ressemble au Y latin, mais se lit [ou].', examples: [{ ru: 'рука́', fr: 'main, bras', pron: ['rouka'] }, { ru: 'му́ха', fr: 'mouche', pron: ['moukha', 'mukha'] }] },
  { upper: 'Х', lower: 'х', name_ru: 'ха', group: 2, kind: 'consonant', sound_label_fr: '[kh] comme le ch de « Bach »', sound_fr: '[kh] : souffle rauque comme le ch allemand de « Bach » (approximation).', approximation: true, confusions: ['к'],
    latin_trap_fr: 'Ressemble au X latin, mais se lit [kh].', examples: [{ ru: 'му́ха', fr: 'mouche', pron: ['moukha', 'mukha'] }] },
  // Séance 3 — Б Г Д З Л П Ф (paires sourdes/sonores)
  { upper: 'Б', lower: 'б', name_ru: 'бэ', group: 3, kind: 'consonant', sound_label_fr: '[b] comme « bon »', sound_fr: '[b] comme dans « bon ». En fin de mot, il s’assourdit en [p].', approximation: false, confusions: ['п', 'в'],
    examples: [{ ru: 'банк', fr: 'banque' }] },
  { upper: 'Г', lower: 'г', name_ru: 'гэ', group: 3, kind: 'consonant', sound_label_fr: '[g] dur comme « gare »', sound_fr: '[g] toujours dur, comme dans « gare » (même devant е et и). En fin de mot : [k].', approximation: false, confusions: ['к'],
    examples: [{ ru: 'газ', fr: 'gaz', pron: ['gas'] }] },
  { upper: 'Д', lower: 'д', name_ru: 'дэ', group: 3, kind: 'consonant', sound_label_fr: '[d] comme « dame »', sound_fr: '[d] comme dans « dame ». En fin de mot : [t].', approximation: false, confusions: ['т'],
    examples: [{ ru: 'дом', fr: 'maison' }] },
  { upper: 'З', lower: 'з', name_ru: 'зэ', group: 3, kind: 'consonant', sound_label_fr: '[z] comme « zéro »', sound_fr: '[z] comme dans « zéro ». Attention : ressemble au chiffre 3.', approximation: false, confusions: ['с'],
    examples: [{ ru: 'газ', fr: 'gaz', pron: ['gas'] }] },
  { upper: 'Л', lower: 'л', name_ru: 'эль', group: 3, kind: 'consonant', sound_label_fr: '[l] comme « lac » (plus sombre)', sound_fr: '[l] plus sombre que le l français devant а, о, у (approximation : l anglais de « full »).', approximation: true, confusions: ['п'],
    examples: [{ ru: 'ла́мпа', fr: 'lampe' }] },
  { upper: 'П', lower: 'п', name_ru: 'пэ', group: 3, kind: 'consonant', sound_label_fr: '[p] comme « papa »', sound_fr: '[p] comme dans « papa ». Ressemble à la lettre grecque pi.', approximation: false, confusions: ['б', 'н', 'л'],
    examples: [{ ru: 'суп', fr: 'soupe' }, { ru: 'парк', fr: 'parc' }] },
  { upper: 'Ф', lower: 'ф', name_ru: 'эф', group: 3, kind: 'consonant', sound_label_fr: '[f] comme « fort »', sound_fr: '[f] comme dans « fort ».', approximation: false, confusions: ['в'],
    examples: [{ ru: 'фо́то', fr: 'photo', pron: ['fota'] }] },
  // Séance 4 — Е Ё И Й Ю Я (voyelles « molles » et palatalisation)
  { upper: 'Е', lower: 'е', name_ru: 'е', group: 4, kind: 'vowel', sound_label_fr: '[yé] / [é] + consonne adoucie', sound_fr: 'En début de mot ou après une voyelle : [yé]. Après une consonne : [é], et cette consonne devient « molle » (palatalisée). Ce n’est donc pas toujours deux sons.', approximation: true, confusions: ['э', 'ё'],
    examples: [{ ru: 'нет', fr: 'non', pron: ['niet', 'nyet'] }] },
  { upper: 'Ё', lower: 'ё', name_ru: 'ё', group: 4, kind: 'vowel', sound_label_fr: '[yo] / [o] + consonne adoucie', sound_fr: 'Comme е mais avec [o] : [yo] en début de mot, [o] après une consonne adoucie. Toujours accentué. Dans les textes courants, on l’écrit souvent е.', approximation: true, confusions: ['е', 'о'],
    examples: [{ ru: 'мёд', fr: 'miel', pron: ['miot', 'myot', 'miod'] }, { ru: 'ёлка', fr: 'sapin', pron: ['iolka', 'yolka'] }] },
  { upper: 'И', lower: 'и', name_ru: 'и', group: 4, kind: 'vowel', sound_label_fr: '[i] comme « ici »', sound_fr: '[i] comme dans « ici » ; la consonne précédente devient molle. Ressemble à un N latin à l’envers.', approximation: false, confusions: ['н', 'й', 'ы'],
    examples: [{ ru: 'мир', fr: 'paix ; monde' }, { ru: 'кино́', fr: 'cinéma' }] },
  { upper: 'Й', lower: 'й', name_ru: 'и кра́ткое', group: 4, kind: 'semivowel', sound_label_fr: '[y] bref comme « paille »', sound_fr: '[y] bref, comme dans « paille » ou « yoga ». C’est un и avec une brève.', approximation: true, confusions: ['и'],
    examples: [{ ru: 'мой', fr: 'mon, le mien', pron: ['moï', 'moy'] }] },
  { upper: 'Ю', lower: 'ю', name_ru: 'ю', group: 4, kind: 'vowel', sound_label_fr: '[you] / [ou] + consonne adoucie', sound_fr: '[you] en début de mot ou après une voyelle ; [ou] après une consonne qui devient molle.', approximation: true, confusions: ['у'],
    examples: [{ ru: 'ю́мор', fr: 'humour', pron: ['youmar', 'iumar', 'youmor'] }] },
  { upper: 'Я', lower: 'я', name_ru: 'я', group: 4, kind: 'vowel', sound_label_fr: '[ya] / [a] + consonne adoucie', sound_fr: '[ya] en début de mot ou après une voyelle ; [a] après une consonne qui devient molle. Seul, я veut dire « je ». Ressemble à un R latin inversé.', approximation: true, confusions: ['а'],
    examples: [{ ru: 'мя́со', fr: 'viande', pron: ['miassa', 'myasa', 'miasa'] }] },
  // Séance 5 — Ж Ш Ч Щ Ц (chuintantes et sifflante)
  { upper: 'Ж', lower: 'ж', name_ru: 'жэ', group: 5, kind: 'consonant', sound_label_fr: '[j] comme « jour » (dur)', sound_fr: '[j] comme dans « jour », mais plus dur (langue reculée). En fin de mot : [ch].', approximation: true, confusions: ['ш'],
    examples: [{ ru: 'жена́', fr: 'épouse', pron: ['jena', 'zhena', 'jina'] }] },
  { upper: 'Ш', lower: 'ш', name_ru: 'ша', group: 5, kind: 'consonant', sound_label_fr: '[ch] comme « chat » (dur)', sound_fr: '[ch] proche du ch français de « chat », mais plus dur (approximation).', approximation: true, confusions: ['щ', 'ж'],
    examples: [{ ru: 'ша́пка', fr: 'bonnet', pron: ['chapka'] }] },
  { upper: 'Ч', lower: 'ч', name_ru: 'чэ', group: 5, kind: 'consonant', sound_label_fr: '[tch] comme « tchèque »', sound_fr: '[tch] proche de « tchèque », toujours mou (approximation).', approximation: true, confusions: ['щ', 'ц'],
    examples: [{ ru: 'чай', fr: 'thé', pron: ['tchaï', 'chai', 'tchai'] }, { ru: 'час', fr: 'heure (durée)', pron: ['tchas'] }] },
  { upper: 'Щ', lower: 'щ', name_ru: 'ща', group: 5, kind: 'consonant', sound_label_fr: '[chch] long et mou', sound_fr: 'Un ch mou et prolongé, la langue plus en avant que pour ш (approximation).', approximation: true, confusions: ['ш', 'ч'],
    examples: [{ ru: 'щи', fr: 'chtchi (soupe au chou)', pron: ['chtchi', 'shchi', 'chchi'] }] },
  { upper: 'Ц', lower: 'ц', name_ru: 'цэ', group: 5, kind: 'consonant', sound_label_fr: '[ts] comme « tsar »', sound_fr: '[ts] comme dans « tsé-tsé », toujours dur.', approximation: false, confusions: ['ч'],
    examples: [{ ru: 'центр', fr: 'centre', pron: ['tsentr'] }, { ru: 'у́лица', fr: 'rue', pron: ['oulitsa'] }] },
  // Séance 6 — Ы Э Ь Ъ
  { upper: 'Ы', lower: 'ы', name_ru: 'ы', group: 6, kind: 'vowel', sound_label_fr: '[ɨ] : i prononcé langue en arrière', sound_fr: 'Pas d’équivalent français : dire [i] en reculant la langue, lèvres non arrondies. Distinct de и. N’apparaît jamais en début de mot.', approximation: true, confusions: ['и'],
    examples: [{ ru: 'мы', fr: 'nous', pron: ['my', 'mui'] }, { ru: 'сыр', fr: 'fromage', pron: ['syr', 'suir'] }] },
  { upper: 'Э', lower: 'э', name_ru: 'э', group: 6, kind: 'vowel', sound_label_fr: '[è] comme « fête »', sound_fr: '[è] comme dans « fête », sans adoucir la consonne précédente.', approximation: false, confusions: ['е'],
    examples: [{ ru: 'э́то', fr: 'c’est ; ceci', pron: ['èta', 'eta', 'eto'] }, { ru: 'мэр', fr: 'maire' }] },
  { upper: 'Ь', lower: 'ь', name_ru: 'мя́гкий знак', group: 6, kind: 'sign', sound_label_fr: 'aucun son : adoucit la consonne', sound_fr: 'Signe mou : pas de son propre. Il rend « molle » (palatalisée) la consonne qui précède.', approximation: false, confusions: ['ъ', 'ы'],
    examples: [{ ru: 'соль', fr: 'sel', pron: ['sol'] }, { ru: 'день', fr: 'jour', pron: ['dien', 'dyen'] }] },
  { upper: 'Ъ', lower: 'ъ', name_ru: 'твёрдый знак', group: 6, kind: 'sign', sound_label_fr: 'aucun son : sépare', sound_fr: 'Signe dur : pas de son propre. Rare ; il sépare une consonne de la voyelle е, ё, ю, я qui suit (on entend alors [y]).', approximation: false, confusions: ['ь'],
    examples: [{ ru: 'объе́кт', fr: 'objet', pron: ['abiekt', 'obyekt'] }] },
];

/** Mots inédits pour le transfert contrôlé (décodage de mots non vus), par séance. */
export const TRANSFER_WORDS: Record<number, WordExample[]> = {
  1: [{ ru: 'ток', fr: 'courant électrique' }, { ru: 'том', fr: 'tome, volume' }, { ru: 'мака́ка', fr: 'macaque' }],
  2: [{ ru: 'мост', fr: 'pont' }, { ru: 'хор', fr: 'chœur' }, { ru: 'нау́ка', fr: 'science', pron: ['naouka'] }, { ru: 'су́мка', fr: 'sac', pron: ['soumka'] }],
  3: [{ ru: 'сад', fr: 'jardin', pron: ['sat'] }, { ru: 'глаз', fr: 'œil', pron: ['glas'] }, { ru: 'бока́л', fr: 'verre à pied', pron: ['bakal'] }, { ru: 'го́род', fr: 'ville', pron: ['gorat', 'gorot'] }],
  4: [{ ru: 'меню́', fr: 'menu', pron: ['miniou', 'menu', 'meniou'] }, { ru: 'биле́т', fr: 'billet', pron: ['biliet', 'bilet'] }, { ru: 'мо́ре', fr: 'mer', pron: ['morie', 'more'] }, { ru: 'дя́дя', fr: 'oncle', pron: ['diadia', 'dyadya'] }],
  5: [{ ru: 'маши́на', fr: 'voiture', pron: ['machina', 'mashina'] }, { ru: 'шокола́д', fr: 'chocolat', pron: ['chakalat', 'shokolad'] }, { ru: 'врач', fr: 'médecin', pron: ['vratch'] }, { ru: 'ко́шка', fr: 'chatte, chat', pron: ['kochka', 'koshka'] }],
  6: [{ ru: 'му́зыка', fr: 'musique', pron: ['mouzyka', 'muzyka'] }, { ru: 'семья́', fr: 'famille', pron: ['sémia', 'semya', 'simia', 'semia'] }, { ru: 'слова́рь', fr: 'dictionnaire', pron: ['slavar', 'slovar'] }, { ru: 'поэ́т', fr: 'poète', pron: ['paèt', 'poet', 'paet'] }],
};
