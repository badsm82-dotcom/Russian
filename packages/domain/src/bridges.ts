/**
 * Moteur de passerelles linguistiques (§2.2–2.3, F14).
 *  - seules les passerelles validées sont affichées ;
 *  - langue d'appui désactivée → jamais proposée ;
 *  - priorité aux langues courantes ; les autres seulement pour une analogie élémentaire ;
 *  - une seule passerelle par défaut, alternatives sur demande (« autre comparaison ») ;
 *  - aucune analogie fiable → rien n'est affiché (explication française seule).
 */
import type { ContentStatus, KnownLanguage, LanguageCode } from './types.js';

export type BridgeType =
  | 'phonetic'
  | 'lexical_loanword' // emprunt attesté
  | 'lexical_cognate' // parenté historique
  | 'mnemonic' // simple ressemblance mnémotechnique
  | 'grammatical'
  | 'false_friend';

export interface LanguageBridge {
  id: string;
  concept_id: string;
  source_language: LanguageCode;
  source_expression: string;
  russian_expression: string;
  bridge_type: BridgeType;
  /** Analogie élémentaire : autorisée pour les langues non courantes (es, it, ro). */
  elementary: boolean;
  explanation_fr: string;
  limitations_fr: string;
  validation_status: ContentStatus;
  source_reference: string;
  version: number;
}

export interface BridgeFeedbackStats {
  bridge_id: string;
  helpful: number;
  not_helpful: number;
}

export const BRIDGE_TYPE_LABEL_FR: Record<BridgeType, string> = {
  phonetic: 'Analogie de son',
  lexical_loanword: 'Emprunt attesté',
  lexical_cognate: 'Parenté historique',
  mnemonic: 'Ressemblance mnémotechnique (pas une étymologie)',
  grammatical: 'Analogie grammaticale',
  false_friend: 'Attention, faux ami',
};

export interface BridgeSelection {
  default: LanguageBridge | null;
  alternatives: LanguageBridge[];
}

function isEligible(b: LanguageBridge, langs: ReadonlyMap<LanguageCode, KnownLanguage>): boolean {
  if (b.validation_status !== 'validated') return false;
  if (b.source_language === 'fr') return true; // langue d'interface, toujours connue
  const l = langs.get(b.source_language);
  if (!l || !l.bridges_enabled) return false;
  if (l.proficiency === 'fluent' || l.proficiency === 'native') return true;
  return b.elementary;
}

function preferenceScore(b: LanguageBridge, stats: ReadonlyMap<string, BridgeFeedbackStats>, langScore: ReadonlyMap<LanguageCode, number>): number {
  // Ajustement progressif : lissage de Laplace pour ne pas conclure sur quelques essais (§2.3).
  const s = stats.get(b.id);
  const own = s ? (s.helpful + 1) / (s.helpful + s.not_helpful + 2) : 0.5;
  return own * 0.6 + (langScore.get(b.source_language) ?? 0.5) * 0.4;
}

/** Préférence lissée par langue à partir des retours de l'apprenant. */
export function languagePreferenceScores(
  bridges: readonly LanguageBridge[],
  stats: readonly BridgeFeedbackStats[],
): Map<LanguageCode, number> {
  const byId = new Map(bridges.map((b) => [b.id, b]));
  const agg = new Map<LanguageCode, { h: number; n: number }>();
  for (const s of stats) {
    const b = byId.get(s.bridge_id);
    if (!b) continue;
    const cur = agg.get(b.source_language) ?? { h: 0, n: 0 };
    cur.h += s.helpful;
    cur.n += s.not_helpful;
    agg.set(b.source_language, cur);
  }
  const out = new Map<LanguageCode, number>();
  for (const [lang, { h, n }] of agg) out.set(lang, (h + 2) / (h + n + 4));
  return out;
}

export function selectBridges(
  conceptId: string,
  catalog: readonly LanguageBridge[],
  knownLanguages: readonly KnownLanguage[],
  options: { enabled: boolean; feedback?: readonly BridgeFeedbackStats[] } = { enabled: true },
): BridgeSelection {
  if (!options.enabled) return { default: null, alternatives: [] };
  const langs = new Map(knownLanguages.map((l) => [l.code, l]));
  const feedback = options.feedback ?? [];
  const stats = new Map(feedback.map((s) => [s.bridge_id, s]));
  const langScore = languagePreferenceScores(catalog, feedback);
  const fluentRank = (b: LanguageBridge) => {
    const p = langs.get(b.source_language)?.proficiency;
    return b.source_language === 'fr' || p === 'fluent' || p === 'native' ? 0 : 1;
  };
  const eligible = catalog
    .filter((b) => b.concept_id === conceptId && isEligible(b, langs))
    .sort((a, b) => {
      // Les alertes de faux ami passent en premier : elles évitent une erreur.
      const ff = Number(b.bridge_type === 'false_friend') - Number(a.bridge_type === 'false_friend');
      if (ff !== 0) return ff;
      const fr = fluentRank(a) - fluentRank(b);
      if (fr !== 0) return fr;
      const pref = preferenceScore(b, stats, langScore) - preferenceScore(a, stats, langScore);
      if (pref !== 0) return pref;
      return a.id.localeCompare(b.id);
    });
  return { default: eligible[0] ?? null, alternatives: eligible.slice(1) };
}

export interface BridgeEffectSample {
  with_bridge: boolean;
  /** Rappel sans aide réussi à J1 / J7 (null si non mesuré). */
  recall_d1: boolean | null;
  recall_d7: boolean | null;
}

export const BRIDGE_EFFECT_MIN_SAMPLES = 20;

export interface BridgeEffectReport {
  with_bridge: { n: number; d1_rate: number | null; d7_rate: number | null };
  without_bridge: { n: number; d1_rate: number | null; d7_rate: number | null };
  sufficient_data: boolean;
  note_fr: string;
}

/** Comparaison descriptive de la rétention différée, sans conclusion sur un profil cognitif (§2.3, recette 6). */
export function bridgeEffectReport(samples: readonly BridgeEffectSample[]): BridgeEffectReport {
  const summarize = (list: BridgeEffectSample[]) => {
    const d1 = list.filter((s) => s.recall_d1 !== null);
    const d7 = list.filter((s) => s.recall_d7 !== null);
    return {
      n: list.length,
      d1_rate: d1.length ? d1.filter((s) => s.recall_d1).length / d1.length : null,
      d7_rate: d7.length ? d7.filter((s) => s.recall_d7).length / d7.length : null,
    };
  };
  const w = summarize(samples.filter((s) => s.with_bridge));
  const wo = summarize(samples.filter((s) => !s.with_bridge));
  const sufficient = w.n >= BRIDGE_EFFECT_MIN_SAMPLES && wo.n >= BRIDGE_EFFECT_MIN_SAMPLES;
  return {
    with_bridge: w,
    without_bridge: wo,
    sufficient_data: sufficient,
    note_fr: sufficient
      ? 'Comparaison descriptive sur notions de difficulté comparable ; ne diagnostique aucun profil cognitif.'
      : `Données insuffisantes (au moins ${BRIDGE_EFFECT_MIN_SAMPLES} notions par groupe nécessaires) : aucune conclusion.`,
  };
}
