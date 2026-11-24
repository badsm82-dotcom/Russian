/**
 * Contrôle des prérequis (AC03, AC20) : aucun exercice évalué ne requiert une lettre,
 * un mot ou une structure non enseignés, sauf transfert contrôlé explicitement prévu
 * (qui peut contenir un mot inédit mais jamais une lettre inconnue).
 */
import type { ExerciseDef } from './exercise.js';
import { lettersInText } from './unicode.js';

export const LETTER_ITEM_PREFIX = 'letter:';

export function letterItemId(lowercaseLetter: string): string {
  return `${LETTER_ITEM_PREFIX}${lowercaseLetter}`;
}

export function lettersFromTaughtItems(taughtItemIds: Iterable<string>): Set<string> {
  const out = new Set<string>();
  for (const id of taughtItemIds) if (id.startsWith(LETTER_ITEM_PREFIX)) out.add(id.slice(LETTER_ITEM_PREFIX.length));
  return out;
}

export function lettersRequired(ex: ExerciseDef): Set<string> {
  const out = new Set<string>();
  const texts = [...ex.reads, ...ex.writes, ...(ex.choices ?? []).map((c) => c.ru ?? '')];
  for (const t of texts) for (const l of lettersInText(t)) out.add(l);
  return out;
}

export interface MissingPrerequisites {
  items: string[];
  letters: string[];
}

export function missingPrerequisites(ex: ExerciseDef, taughtItemIds: ReadonlySet<string>): MissingPrerequisites {
  const letters = lettersFromTaughtItems(taughtItemIds);
  const missingLetters = [...lettersRequired(ex)].filter((l) => !letters.has(l)).sort();
  const required = ex.controlled_transfer ? ex.requires_items.filter((i) => i.startsWith(LETTER_ITEM_PREFIX)) : ex.requires_items;
  const missingItems = [...new Set([ex.item_id, ...required])].filter((i) => !taughtItemIds.has(i)).sort();
  return { items: missingItems, letters: missingLetters };
}

export function isExerciseAvailable(ex: ExerciseDef, taughtItemIds: ReadonlySet<string>): boolean {
  const m = missingPrerequisites(ex, taughtItemIds);
  return m.items.length === 0 && m.letters.length === 0;
}
