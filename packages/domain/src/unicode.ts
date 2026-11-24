/**
 * Normalisation Unicode et comparaison de réponses (§8, §15).
 *  - NFC systématique ;
 *  - l'accent pédagogique (U+0301) n'est jamais pénalisé ;
 *  - ё/е : е accepté pour ё en écriture courante, sauf exercice ciblé ;
 *  - détection des lettres latines « sosies » saisies à la place du cyrillique.
 */

const COMBINING_ACUTE = '́';
const COMBINING_GRAVE = '̀';

export function nfc(s: string): string {
  return s.normalize('NFC');
}

/** Retire les accents toniques pédagogiques, en préservant й et ё (qui se décomposent aussi en NFD). */
export function stripStressMarks(s: string): string {
  return nfc(
    s
      .normalize('NFD')
      .replace(new RegExp(`[${COMBINING_ACUTE}${COMBINING_GRAVE}]`, 'g'), '')
      .normalize('NFC'),
  );
}

export interface NormalizeOptions {
  /** Si vrai, ё et е sont distingués (exercice ciblé sur ё). */
  distinguishYo?: boolean;
  /** Si vrai, la casse compte (exercice majuscule/minuscule). */
  caseSensitive?: boolean;
}

export function normalizeAnswer(input: string, opts: NormalizeOptions = {}): string {
  let s = stripStressMarks(nfc(input));
  s = s.replace(/[ \s]+/g, ' ').trim();
  // La ponctuation n'est jamais l'objet de l'exercice : virgules, points, tirets de dialogue, guillemets ignorés.
  s = s.replace(/[.!?…,;:«»"“”„—–]+/gu, ' ').replace(/\s+/g, ' ').trim();
  if (!opts.caseSensitive) s = s.toLocaleLowerCase('ru');
  if (!opts.distinguishYo) s = s.replace(/ё/g, 'е').replace(/Ё/g, 'Е');
  return s;
}

/** Lettres latines visuellement confondables avec le cyrillique. */
const LATIN_LOOKALIKES: Record<string, string> = {
  A: 'А', a: 'а', B: 'В', E: 'Е', e: 'е', K: 'К', k: 'к', M: 'М', H: 'Н', O: 'О', o: 'о',
  P: 'Р', p: 'р', C: 'С', c: 'с', T: 'Т', y: 'у', X: 'Х', x: 'х', Y: 'У',
};

const CYRILLIC_RE = /[Ѐ-ӿ]/u;
const LATIN_RE = /[A-Za-z]/;

export type ScriptKind = 'cyrillic' | 'latin' | 'mixed' | 'none';

export function detectScript(s: string): ScriptKind {
  const hasC = CYRILLIC_RE.test(s);
  const hasL = LATIN_RE.test(s);
  if (hasC && hasL) return 'mixed';
  if (hasC) return 'cyrillic';
  if (hasL) return 'latin';
  return 'none';
}

/** Si la saisie latine ne contient que des sosies, renvoie la version cyrillique supposée (pour expliquer, pas pour noter). */
export function latinLookalikesToCyrillic(s: string): string | null {
  let out = '';
  for (const ch of s) {
    if (LATIN_RE.test(ch)) {
      const c = LATIN_LOOKALIKES[ch];
      if (!c) return null;
      out += c;
    } else out += ch;
  }
  return out;
}

/** Comparaison d'édition par caractère (dictée : « erreurs par caractère », §8). */
export function levenshtein(a: string, b: string): number {
  const A = [...a];
  const B = [...b];
  const prev = new Array<number>(B.length + 1);
  for (let j = 0; j <= B.length; j++) prev[j] = j;
  for (let i = 1; i <= A.length; i++) {
    let diag = prev[0]!;
    prev[0] = i;
    for (let j = 1; j <= B.length; j++) {
      const tmp = prev[j]!;
      prev[j] = Math.min(prev[j]! + 1, prev[j - 1]! + 1, diag + (A[i - 1] === B[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[B.length]!;
}

/** Lettres cyrilliques (minuscules, sans accent) nécessaires pour lire un texte. */
export function lettersInText(text: string): Set<string> {
  const out = new Set<string>();
  for (const ch of stripStressMarks(text).toLocaleLowerCase('ru')) {
    if (/[а-яё]/u.test(ch)) out.add(ch);
  }
  return out;
}
