import { describe, expect, it } from 'vitest';
import { gradeAnswer, toClientExercise, type ExerciseDef } from '../src/index.js';

const base = {
  id: '00000000-0000-5000-8000-000000000000', version: 1, unit_id: 'A0-01', hints: [], reads: [], writes: [], requires_items: [],
  difficulty: 1 as const, status: 'pending_review' as const, stimulus: {},
};
const mcq: ExerciseDef = {
  ...base, slug: 'mcq', type: 'letter_recognition', item_id: 'letter:к', competency: 'recognition', prompt_fr: 'Quel son ?',
  choices: [{ id: 'k', label: '[k]' }, { id: 'n', label: '[n]' }], answer: { kind: 'choice', correct: 'k' },
};
const typed: ExerciseDef = {
  ...base, slug: 'typed', type: 'active_recall', item_id: 'lex:kofe', competency: 'recall', prompt_fr: 'Écris « Je veux un café »',
  answer: { kind: 'cyrillic', accepted: ['Я хочу́ ко́фе.'] },
};
const ctx = { assisted: false, duration_ms: 9000, previous_grade: null };

describe('Correction déterministe (§8)', () => {
  it('ne transmet jamais le corrigé au client', () => {
    const c = toClientExercise(mcq) as Record<string, unknown>;
    expect(c.answer).toBeUndefined();
    expect(JSON.stringify(c)).not.toContain('"correct"');
  });
  it('QCM correct = 2, erreur = 0 avec code de confusion', () => {
    expect(gradeAnswer(mcq, { choice_id: 'k' }, ctx).grade).toBe(2);
    const r = gradeAnswer(mcq, { choice_id: 'n' }, ctx);
    expect(r.grade).toBe(0);
    expect(r.error_codes).toContain('confusion:k>n');
  });
  it('réponse assistée correcte = 1 (ne compte pas comme rappel autonome)', () => {
    expect(gradeAnswer(mcq, { choice_id: 'k' }, { ...ctx, assisted: true }).grade).toBe(1);
  });
  it('« facile » = 3 seulement si rapide, autonome et déjà réussi auparavant', () => {
    expect(gradeAnswer(mcq, { choice_id: 'k' }, { assisted: false, duration_ms: 1000, previous_grade: 2 }).grade).toBe(3);
    expect(gradeAnswer(mcq, { choice_id: 'k' }, { assisted: false, duration_ms: 1000, previous_grade: null }).grade).toBe(2);
  });
  it('n’exige ni accent pédagogique ni ponctuation', () => {
    expect(gradeAnswer(typed, { text: 'я хочу кофе' }, ctx).accepted).toBe(true);
  });
  it('saisie latine : demande de clarification sans pénalité', () => {
    const r = gradeAnswer(typed, { text: 'ya hochu kofe' }, ctx);
    expect(r.outcome).toBe('unscorable');
    expect(r.error_codes).toContain('latin_script');
  });
  it('n’accepte pas une phrase seulement proche pour un exercice de forme précise', () => {
    const r = gradeAnswer(typed, { text: 'я хочу чай' }, ctx);
    expect(r.accepted).toBe(false);
  });
  it('signale une faute d’orthographe d’une lettre', () => {
    expect(gradeAnswer(typed, { text: 'я хачу кофе' }, ctx).error_codes).toContain('spelling');
  });
  it('réponse vide non notée', () => {
    expect(gradeAnswer(typed, { text: '   ' }, ctx).outcome).toBe('unscorable');
  });
  it('décodage en translittération ; cyrillique recopié → clarification', () => {
    const dec: ExerciseDef = { ...base, slug: 'dec', type: 'decoding', item_id: 'letter:м', competency: 'recognition', prompt_fr: 'Lis',
      reads: ['мама'], answer: { kind: 'transliteration', russian: 'мама', variants: ['mama'] } };
    expect(gradeAnswer(dec, { text: 'mama' }, ctx).accepted).toBe(true);
    expect(gradeAnswer(dec, { text: 'мама' }, ctx).outcome).toBe('unscorable');
  });
});
