/**
 * Catalogue de passerelles linguistiques (§2.2).
 * Statut « validated » uniquement pour les analogies fournies par le cahier des charges V1.2 (§2.2, §5),
 * validées par le responsable produit ; toute autre suggestion reste en brouillon et n'est jamais affichée.
 * Aucune étymologie n'est inventée : en cas de doute, la passerelle est typée « mnemonic ».
 */
import type { LanguageBridge } from '@r365/domain';

const SPEC = 'Cahier des charges Russian 365 V1.2, §2.2 (exemple fourni par le responsable produit)';
const SPEC5 = 'Cahier des charges Russian 365 V1.2, §5 (exemple fourni par le responsable produit)';

type B = Omit<LanguageBridge, 'version'> & { version?: number };

const RAW: B[] = [
  { id: 'brg_chai_pt', concept_id: 'lex:chai', source_language: 'pt', source_expression: 'chá', russian_expression: 'чай',
    bridge_type: 'lexical_loanword', elementary: true,
    explanation_fr: 'Le portugais « chá » et le russe « чай » désignent tous deux le thé et viennent du chinois.',
    limitations_fr: 'La prononciation diffère : le russe se termine par й [ï].', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_da_ro', concept_id: 'lex:da', source_language: 'ro', source_expression: 'da', russian_expression: 'да',
    bridge_type: 'mnemonic', elementary: true,
    explanation_fr: 'En roumain aussi, « da » veut dire « oui ».',
    limitations_fr: 'Simple point d’appui de mémoire ; le reste du vocabulaire roumain n’est pas comparable aussi directement.',
    validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_vino_it', concept_id: 'lex:vino', source_language: 'it', source_expression: 'vino', russian_expression: 'вино́',
    bridge_type: 'mnemonic', elementary: true, explanation_fr: 'Comme en italien et en espagnol, « вино́ » veut dire « vin ».',
    limitations_fr: 'L’accent tombe sur la dernière syllabe en russe : vi-NO.', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_vino_es', concept_id: 'lex:vino', source_language: 'es', source_expression: 'vino', russian_expression: 'вино́',
    bridge_type: 'mnemonic', elementary: true, explanation_fr: 'Comme en espagnol, « вино́ » veut dire « vin ».',
    limitations_fr: 'L’accent tombe sur la dernière syllabe en russe : vi-NO.', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_buterbrod_de', concept_id: 'lex:buterbrod', source_language: 'de', source_expression: 'Butterbrot', russian_expression: 'бутербро́д',
    bridge_type: 'lexical_loanword', elementary: false,
    explanation_fr: '« бутербро́д » est un emprunt à l’allemand « Butterbrot ».',
    limitations_fr: 'En russe, le mot désigne toute tartine ou sandwich ouvert, pas seulement le pain beurré.', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_shlagbaum_de', concept_id: 'lex:shlagbaum', source_language: 'de', source_expression: 'Schlagbaum', russian_expression: 'шлагба́ум',
    bridge_type: 'lexical_loanword', elementary: false, explanation_fr: '« шлагба́ум » (barrière levante) est un emprunt à l’allemand « Schlagbaum ».',
    limitations_fr: 'Mot assez spécialisé ; utile surtout pour la circulation et les parkings.', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_biznes_en', concept_id: 'lex:biznes', source_language: 'en', source_expression: 'business', russian_expression: 'би́знес',
    bridge_type: 'lexical_loanword', elementary: false, explanation_fr: '« би́знес » est un emprunt à l’anglais « business ».',
    limitations_fr: 'La prononciation suit le russe : [biznèss], accent sur la première syllabe.', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_kh_de', concept_id: 'letter:х', source_language: 'de', source_expression: 'Bach', russian_expression: 'х',
    bridge_type: 'phonetic', elementary: false, explanation_fr: 'Х se prononce comme le « ch » allemand de « Bach ».',
    limitations_fr: 'Approximation : le х russe est souvent un peu moins raclé. Écoute l’audio russe, qui fait référence.', validation_status: 'validated', source_reference: SPEC5 },
  { id: 'brg_magazin_en_ff', concept_id: 'lex:magazin', source_language: 'en', source_expression: 'magazine', russian_expression: 'магази́н',
    bridge_type: 'false_friend', elementary: false,
    explanation_fr: 'Faux ami : « магази́н » signifie « magasin, boutique », pas « magazine » (une revue se dit журна́л).',
    limitations_fr: 'Le sens russe correspond au français « magasin ».', validation_status: 'validated', source_reference: SPEC },
  { id: 'brg_cases_de', concept_id: 'concept:declension', source_language: 'de', source_expression: 'der/den/dem/des', russian_expression: 'паде́жи',
    bridge_type: 'grammatical', elementary: false,
    explanation_fr: 'Comme en allemand, le russe change la forme des mots selon leur fonction dans la phrase : c’est la déclinaison.',
    limitations_fr: 'Le russe a six cas et décline surtout la fin des noms, sans article ; les cas allemands ne correspondent pas un à un aux cas russes.',
    validation_status: 'validated', source_reference: SPEC },
  // Brouillons : jamais affichés tant qu'un russophone compétent ne les a pas validés (§2.3).
  { id: 'brg_r_es_draft', concept_id: 'letter:р', source_language: 'es', source_expression: 'pero', russian_expression: 'р',
    bridge_type: 'phonetic', elementary: true, explanation_fr: 'Le р russe est roulé, proche du r simple espagnol de « pero ».',
    limitations_fr: 'À valider.', validation_status: 'draft', source_reference: 'Suggestion interne non vérifiée' },
  { id: 'brg_sh_fr', concept_id: 'letter:ш', source_language: 'fr', source_expression: 'chat', russian_expression: 'ш',
    bridge_type: 'phonetic', elementary: true, explanation_fr: 'Ш est proche du « ch » français de « chat ».',
    limitations_fr: 'Approximation : le ш russe est plus dur, la langue plus reculée.', validation_status: 'validated', source_reference: SPEC5 },
  { id: 'brg_ch_fr', concept_id: 'letter:ч', source_language: 'fr', source_expression: 'tchèque', russian_expression: 'ч',
    bridge_type: 'phonetic', elementary: true, explanation_fr: 'Ч est proche de « tch » dans « tchèque ».',
    limitations_fr: 'Approximation : le ч russe est toujours mou.', validation_status: 'validated', source_reference: SPEC5 },
];

export const BRIDGES: LanguageBridge[] = RAW.map((b) => ({ version: 1, ...b }));
