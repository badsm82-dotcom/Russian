/**
 * Translittération approximative (§3, §5) : aide temporaire, jamais une réponse attendue à long terme.
 * Sert à accepter une transcription latine lors du décodage, avec les systèmes courants
 * (français, anglais, allemand, scientifique) comme variantes. L'audio validé reste la référence.
 */
import { stripStressMarks } from './unicode.js';

/** Variantes latines acceptées par lettre (minuscules). */
const LETTER_VARIANTS: Record<string, string[]> = {
  а: ['a'], б: ['b'], в: ['v', 'w'], г: ['g', 'gu'], д: ['d'], е: ['e', 'ie', 'ye', 'je', 'é'], ё: ['yo', 'io', 'jo', 'ë', 'e', 'o'],
  ж: ['zh', 'j', 'ž', 'sch'], з: ['z', 's'], и: ['i', 'ee'], й: ['y', 'i', 'j', 'ï'], к: ['k', 'c', 'q'], л: ['l'], м: ['m'],
  н: ['n'], о: ['o'], п: ['p'], р: ['r'], с: ['s', 'ss', 'c'], т: ['t'], у: ['u', 'ou', 'oo'], ф: ['f', 'ph'],
  х: ['kh', 'h', 'x', 'ch', 'j'], ц: ['ts', 'tz', 'c', 'z'], ч: ['ch', 'tch', 'tsch', 'č'], ш: ['sh', 'ch', 'sch', 'š'],
  щ: ['shch', 'sch', 'chtch', 'chch', 'shh', 'ščh', 'šč', 'stch'], ъ: ['', '"', "'"], ы: ['y', 'i', 'ui', 'ы'], ь: ['', "'", 'j'],
  э: ['e', 'è', 'é'], ю: ['yu', 'iou', 'ju', 'iu', 'you'], я: ['ya', 'ia', 'ja'],
};

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Construit une expression régulière acceptant les translittérations lettre à lettre courantes. */
export function transliterationPattern(russian: string): RegExp {
  const word = stripStressMarks(russian).toLocaleLowerCase('ru');
  let src = '';
  for (const ch of word) {
    const v = LETTER_VARIANTS[ch];
    if (v) src += `(?:${v.map(escapeRe).join('|')})`;
    else if (/\s/.test(ch)) src += '\\s+';
    else if (/[-]/.test(ch)) src += '[-\\s]?';
    else src += escapeRe(ch);
  }
  return new RegExp(`^${src}$`, 'u');
}

/** Translittération lisible par défaut (système de type français/scientifique simplifié), pour affichage. */
const DISPLAY: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'ie', ё: 'io', ж: 'j', з: 'z', и: 'i', й: 'ï', к: 'k', л: 'l', м: 'm', н: 'n',
  о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'ou', ф: 'f', х: 'kh', ц: 'ts', ч: 'tch', ш: 'ch', щ: 'chtch', ъ: '', ы: 'y',
  ь: "'", э: 'è', ю: 'iou', я: 'ia',
};

export function displayTransliteration(russian: string): string {
  let out = '';
  for (const ch of stripStressMarks(russian)) {
    const lower = ch.toLocaleLowerCase('ru');
    const t = DISPLAY[lower];
    if (t === undefined) out += ch;
    else out += ch === lower ? t : t.charAt(0).toUpperCase() + t.slice(1);
  }
  return out;
}

export function normalizeLatin(input: string): string {
  return input
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’`´]/g, "'")
    .replace(/[.!?,;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Vrai si `input` est une transcription latine acceptable du mot russe :
 * translittération lettre à lettre, ou l'une des prononciations approximatives fournies par le contenu.
 */
export function acceptsTransliteration(russian: string, input: string, pronunciationVariants: readonly string[] = []): boolean {
  const n = normalizeLatin(input);
  if (!n) return false;
  if (pronunciationVariants.some((p) => normalizeLatin(p) === n)) return true;
  return transliterationPattern(russian).test(n);
}
