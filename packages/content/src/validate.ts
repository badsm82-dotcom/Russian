/**
 * Validation automatique du contenu (§17) : Unicode, champs, cohérence, prérequis, doublons, droits.
 * Étape préalable à la revue par un russophone compétent : elle ne la remplace pas.
 */
import { lettersInText, missingPrerequisites, type ExerciseDef, type LanguageBridge, type UnitDef } from '@r365/domain';
import type { TeachCard } from './curriculum.js';

export interface ValidationIssue {
  level: 'error' | 'warning';
  ref: string;
  message: string;
}

const isNfc = (s: string) => s === s.normalize('NFC');

function walkStrings(v: unknown, out: string[] = []): string[] {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => walkStrings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => walkStrings(x, out));
  return out;
}

export function validateContent(input: {
  units: readonly UnitDef[];
  exercises: readonly ExerciseDef[];
  cards: readonly TeachCard[];
  bridges: readonly LanguageBridge[];
  letters: readonly string[];
}): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const err = (ref: string, message: string) => issues.push({ level: 'error', ref, message });
  const warn = (ref: string, message: string) => issues.push({ level: 'warning', ref, message });

  if (input.letters.length !== 33) err('alphabet', `33 lettres attendues, ${input.letters.length} trouvées`);
  if (new Set(input.letters).size !== input.letters.length) err('alphabet', 'Lettres en double');

  const unitOrder = new Map(input.units.map((u) => [u.id, u.order]));
  const itemUnit = new Map<string, number>();
  for (const u of input.units) for (const it of u.items) {
    if (itemUnit.has(it)) err(it, `Item introduit dans plusieurs unités`);
    itemUnit.set(it, u.order);
  }
  const cardIds = new Set(input.cards.map((c) => c.item_id));
  for (const it of itemUnit.keys()) if (!cardIds.has(it)) err(it, 'Item sans fiche de présentation (présentation avant exercice évalué)');

  const slugs = new Set<string>();
  const ids = new Set<string>();
  const covered = new Set<string>();
  for (const ex of input.exercises) {
    const ref = `exercise:${ex.slug}`;
    if (slugs.has(ex.slug)) err(ref, 'Slug en double');
    if (ids.has(ex.id)) err(ref, 'UUID en double');
    slugs.add(ex.slug);
    ids.add(ex.id);
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(ex.id)) err(ref, 'Identifiant non UUID v5');
    for (const s of walkStrings(ex)) if (!isNfc(s)) err(ref, `Texte non normalisé NFC : ${s}`);
    if (!ex.prompt_fr.trim()) err(ref, 'Consigne française vide');
    const order = unitOrder.get(ex.unit_id);
    if (order === undefined) { err(ref, `Unité inconnue ${ex.unit_id}`); continue; }
    if (!itemUnit.has(ex.item_id)) err(ref, `Item inconnu ${ex.item_id}`);
    covered.add(ex.item_id);
    const a = ex.answer;
    if (a.kind === 'choice') {
      if (!ex.choices || ex.choices.length < 2) err(ref, 'QCM avec moins de 2 choix');
      else {
        if (!ex.choices.some((c) => c.id === a.correct)) err(ref, 'Bonne réponse absente des choix');
        if (new Set(ex.choices.map((c) => c.label)).size !== ex.choices.length) err(ref, 'Choix en double');
      }
    } else if (a.kind === 'cyrillic') {
      if (a.accepted.length === 0) err(ref, 'Aucune réponse acceptée');
      for (const acc of a.accepted) if (/[A-Za-z]/.test(acc)) err(ref, `Réponse cyrillique contenant du latin : ${acc}`);
      if (ex.writes.length === 0) err(ref, 'Saisie cyrillique sans « writes » (prérequis d’écriture non contrôlés)');
    } else if (a.kind === 'transliteration') {
      if (!ex.reads.includes(a.russian)) err(ref, 'Mot à décoder absent de « reads »');
    }
    if (ex.stimulus.ru && ex.stimulus.show_text_before_answer !== false) {
      const shown = lettersInText(ex.stimulus.ru);
      const declared = new Set(ex.reads.flatMap((r) => [...lettersInText(r)]));
      for (const l of shown) if (!declared.has(l)) err(ref, `Lettre ${l} affichée mais non déclarée dans « reads »`);
    }
    if (ex.type === 'listening' && ex.stimulus.show_text_before_answer !== false) err(ref, 'Écoute : le texte ne doit pas être montré avant la réponse');
    // AC03/AC20 : prérequis enseignés au plus tard dans l'unité de l'exercice.
    const taught = new Set([...itemUnit].filter(([, u]) => u <= order).map(([i]) => i));
    const miss = missingPrerequisites(ex, taught);
    if (miss.letters.length) err(ref, `Lettres non enseignées à l’unité ${ex.unit_id} : ${miss.letters.join(' ')}`);
    if (miss.items.length) err(ref, `Items non enseignés à l’unité ${ex.unit_id} : ${miss.items.join(', ')}`);
    if (ex.easier_exercise_slug && !input.exercises.some((e) => e.slug === ex.easier_exercise_slug)) err(ref, 'Variante facile introuvable');
    if (ex.status !== 'validated') warn(ref, `Statut ${ex.status} : revue par un russophone requise`);
  }
  for (const it of itemUnit.keys()) if (!covered.has(it)) err(it, 'Item sans aucun exercice');

  const bIds = new Set<string>();
  for (const b of input.bridges) {
    const ref = `bridge:${b.id}`;
    if (bIds.has(b.id)) err(ref, 'Passerelle en double');
    bIds.add(b.id);
    if (!b.explanation_fr.trim() || !b.limitations_fr.trim()) err(ref, 'Explication ou limites manquantes');
    if (!b.source_reference.trim()) err(ref, 'Source manquante');
    if (b.bridge_type === 'grammatical' && b.limitations_fr.length < 20) err(ref, 'Analogie grammaticale sans limites explicites');
    for (const s of walkStrings(b)) if (!isNfc(s)) err(ref, 'Texte non NFC');
  }
  return issues;
}
