import { describe, expect, it } from 'vitest';
import { missingPrerequisites, type ExerciseDef } from '../src/index.js';

const ex: ExerciseDef = {
  id: 'x', slug: 'x', version: 1, type: 'decoding', unit_id: 'A0-01', item_id: 'lex:kot', competency: 'recognition', prompt_fr: '',
  stimulus: { ru: 'кот' }, answer: { kind: 'transliteration', russian: 'кот', variants: [] }, hints: [], reads: ['кот'], writes: [],
  requires_items: ['letter:к', 'letter:о', 'letter:т'], difficulty: 1, status: 'validated',
};

describe('Prérequis (AC03, AC20)', () => {
  it('signale les lettres et items non enseignés', () => {
    const m = missingPrerequisites(ex, new Set(['letter:к', 'letter:о']));
    expect(m.letters).toEqual(['т']);
    expect(m.items).toContain('lex:kot');
  });
  it('transfert contrôlé : mot inédit autorisé, lettres inconnues interdites', () => {
    const t = { ...ex, controlled_transfer: true };
    expect(missingPrerequisites(t, new Set(['letter:к', 'letter:о', 'letter:т']))).toEqual({ items: ['lex:kot'], letters: [] });
    const t2 = { ...t, item_id: 'letter:к' };
    expect(missingPrerequisites(t2, new Set(['letter:к', 'letter:о', 'letter:т']))).toEqual({ items: [], letters: [] });
  });
});
