/**
 * Dictionnaire de référence dérivé d'OpenRussian (CC BY-SA 4.0) : accents, formes, aspect, fréquence,
 * traductions anglaises et allemandes (langues courantes de l'apprenant).
 * Sert au dictionnaire de l'application, au contrôle automatique des accents du contenu
 * et à la lemmatisation des formes fléchies (lecteur F10).
 */
import { normalizeAnswer, stripStressMarks } from '@r365/domain';
import data from '../data/openrussian.json' with { type: 'json' };

export interface DictEntry {
  b: string;
  a: string;
  p: 'noun' | 'verb' | 'adjective' | 'other';
  r: number;
  en: string;
  de: string;
  g?: string;
  asp?: string;
  pa?: string;
  f?: Record<string, string>;
}

export const DICTIONARY_SOURCE = { source: data.source, license: data.license, imported_at: data.imported_at };
const ENTRIES = data.entries as DictEntry[];

const key = (s: string) => normalizeAnswer(stripStressMarks(s));

let byLemma: Map<string, DictEntry[]> | null = null;
let byForm: Map<string, DictEntry[]> | null = null;

function index() {
  if (byLemma && byForm) return { byLemma, byForm };
  byLemma = new Map();
  byForm = new Map();
  const push = (m: Map<string, DictEntry[]>, k: string, e: DictEntry) => {
    const list = m.get(k) ?? [];
    if (!list.includes(e)) list.push(e);
    m.set(k, list);
  };
  for (const e of ENTRIES) {
    push(byLemma, key(e.b), e);
    for (const v of Object.values(e.f ?? {})) for (const form of v.split(/[,;]\s*/)) if (form) push(byForm, key(form), e);
  }
  return { byLemma, byForm };
}

export interface DictHit {
  entry: DictEntry;
  /** Comment le mot a été trouvé : forme de base, forme fléchie (ex. « кофе » ← « кофе »), ou début de mot. */
  match: 'lemma' | 'form' | 'prefix';
  matched_form?: string;
}

/** Recherche tolérante (accents, ё/е, casse) : lemme exact, puis forme fléchie, puis début de mot. */
export function lookup(query: string, limit = 12): DictHit[] {
  const q = key(query);
  if (!q) return [];
  const { byLemma: L, byForm: F } = index();
  const hits: DictHit[] = [];
  const seen = new Set<DictEntry>();
  const add = (e: DictEntry, match: DictHit['match'], matched_form?: string) => {
    if (seen.has(e) || hits.length >= limit) return;
    seen.add(e);
    hits.push({ entry: e, match, matched_form });
  };
  for (const e of L.get(q) ?? []) add(e, 'lemma');
  for (const e of F.get(q) ?? []) add(e, 'form', query);
  if (hits.length < limit && q.length >= 2) {
    const prefix = ENTRIES.filter((e) => key(e.b).startsWith(q)).sort((a, b) => a.r - b.r);
    for (const e of prefix) add(e, 'prefix');
  }
  return hits;
}

/** Lemmes possibles d'une forme (ex. « хочу » → хотеть). */
export function lemmatize(form: string): DictEntry[] {
  const k = key(form);
  const { byLemma: L, byForm: F } = index();
  return [...new Set([...(L.get(k) ?? []), ...(F.get(k) ?? [])])];
}

export interface StressMismatch {
  word: string;
  ours: string;
  reference: string;
}

/**
 * Contrôle automatique des accents : compare chaque mot accentué de notre contenu à OpenRussian.
 * Ne remplace pas la relecture par un russophone ; signale seulement les divergences à vérifier.
 */
export function stressCrossCheck(texts: readonly string[]): StressMismatch[] {
  const out: StressMismatch[] = [];
  const seen = new Set<string>();
  for (const t of texts) {
    for (const raw of t.split(/[\s,.!?…«»"—–()]+/)) {
      if (!raw.includes('́') || seen.has(raw)) continue;
      seen.add(raw);
      const cands = lemmatize(raw);
      if (!cands.length) continue;
      const lower = raw.toLocaleLowerCase('ru');
      const refs = new Set<string>();
      for (const e of cands) {
        if (key(e.b) === key(raw)) refs.add(e.a.toLocaleLowerCase('ru'));
        for (const v of Object.values(e.f ?? {})) for (const f of v.split(/[,;]\s*/)) if (key(f) === key(raw)) refs.add(f.toLocaleLowerCase('ru'));
      }
      // Les mots d'une syllabe n'ont parfois pas d'accent dans la source : on ignore ces cas.
      const marked = [...refs].filter((r) => r.includes('́') || /ё/.test(r));
      if (marked.length && !marked.includes(lower)) out.push({ word: stripStressMarks(raw), ours: raw, reference: marked.join(' / ') });
    }
  }
  return out;
}
