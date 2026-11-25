/**
 * Ressources ouvertes russe ↔ français collectées par scripts/collect_sources.py (GitHub Actions) :
 *  - emprunts du russe au français (Wiktionary, CC BY-SA 4.0) → passerelles CANDIDATES (jamais affichées sans validation) ;
 *  - phrases Tatoeba russe → français (CC BY 2.0 FR) → lecture de phrases réelles composées de mots connus.
 */
import type { LanguageBridge } from '@r365/domain';
import { normalizeAnswer, stripStressMarks } from '@r365/domain';
import loans from '../data/sources/wiktionary_ru_from_fr.json' with { type: 'json' };
import tatoeba from '../data/sources/tatoeba_ru_fr.json' with { type: 'json' };
import { lemmatize } from './dictionary.js';

interface Loan { ru: string; ru_stressed: string | null; fr: string; gloss_en: string; url: string }
interface Pair { ru_id: number; ru: string; fr_id: number; fr: string; ru_author: string; fr_author: string }

export const SOURCES_LICENSES = {
  wiktionary: (loans as { license: string }).license,
  tatoeba: (tatoeba as { license: string }).license,
};

/** Concept « mot » : permet d'attacher une passerelle à un mot du dictionnaire, pas seulement à un item de leçon. */
export const wordConcept = (ru: string) => `word:${normalizeAnswer(stripStressMarks(ru))}`;

export const FRENCH_LOAN_BRIDGES: LanguageBridge[] = (loans.items as Loan[])
  .filter((l) => l.fr && /^[a-zàâäçéèêëîïôöùûüÿœæ' -]+$/i.test(l.fr) && !/\s{2,}/.test(l.fr))
  .map((l) => ({
    id: `brg_frloan_${normalizeAnswer(l.ru).replace(/\s+/g, '_')}`,
    concept_id: wordConcept(l.ru),
    source_language: 'fr' as const,
    source_expression: l.fr,
    russian_expression: l.ru_stressed ?? l.ru,
    bridge_type: 'lexical_loanword' as const,
    elementary: true,
    explanation_fr: `« ${l.ru_stressed ?? l.ru} » est un emprunt au français « ${l.fr} ».`,
    limitations_fr: `Le sens et la prononciation ont pu changer en russe${l.gloss_en ? ` (sens donné par la source, en anglais : ${l.gloss_en})` : ''}. Vérifie avant de t’y fier.`,
    validation_status: 'pending_review' as const,
    source_reference: `Wiktionary — ${l.url} — CC BY-SA 4.0`,
    version: 1,
  }));

export interface ReadingSentence {
  id: number;
  ru: string;
  fr: string;
  lemmas: string[];
  attribution: string;
}

const tokenRe = /[а-яё-]+/gi;
/** Lemmes possibles d'un mot (forme fléchie comprise) ; le mot lui-même si inconnu du dictionnaire. */
export function tokenLemmas(token: string): string[] {
  const k = normalizeAnswer(token);
  const c = lemmatize(k).map((e) => normalizeAnswer(e.b));
  return [...new Set([k, ...c])];
}

let sentences: { s: ReadingSentence; tokens: string[][] }[] | null = null;
export function readingSentences() {
  if (!sentences) {
    sentences = (tatoeba.items as Pair[]).map((p) => {
      // Formes de surface normalisées (le débutant doit avoir appris la forme exacte) : pas de lemmatisation ici.
      const toks = (p.ru.match(tokenRe) ?? []).map((t) => [normalizeAnswer(t)]);
      return {
        s: {
          id: p.ru_id, ru: p.ru, fr: p.fr, lemmas: toks.map((t) => t[t.length - 1] ?? t[0]!),
          attribution: `Tatoeba n° ${p.ru_id} (${p.ru_author || 'anonyme'}) → n° ${p.fr_id} (${p.fr_author || 'anonyme'}), CC BY 2.0 FR`,
        },
        tokens: toks,
      };
    });
  }
  return sentences;
}

/** Phrases dont toutes les formes (ou ≥ minCoverage) ont été apprises. `known` = formes de surface normalisées. */
export function sentencesForKnown(known: ReadonlySet<string>, opts: { minCoverage?: number; limit?: number; minWords?: number } = {}): ReadingSentence[] {
  const min = opts.minCoverage ?? 1;
  const out: ReadingSentence[] = [];
  for (const { s, tokens } of readingSentences()) {
    if (tokens.length < (opts.minWords ?? 2)) continue;
    // Débutant : la FORME exacte doit avoir été apprise (pas seulement le verbe à l'infinitif).
    const ok = tokens.filter((cands) => known.has(cands[0]!)).length / tokens.length;
    if (ok >= min) out.push(s);
    if (out.length >= (opts.limit ?? 30)) break;
  }
  return out;
}
