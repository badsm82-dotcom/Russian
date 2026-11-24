import { describe, expect, it } from 'vitest';
import { planSession, simplificationActive, initialReviewState, alphabetExitStatus, type ExerciseDef, type UnitDef, type ReviewState } from '../src/index.js';

const now = new Date('2026-11-24T08:00:00Z');
const mk = (slug: string, item: string, comp: ExerciseDef['competency'], over: Partial<ExerciseDef> = {}): ExerciseDef => ({
  id: slug, slug, version: 1, type: comp === 'recognition' ? 'letter_recognition' : 'letter_recall', unit_id: 'u1', item_id: item,
  competency: comp, prompt_fr: '', stimulus: {}, answer: comp === 'recognition' ? { kind: 'choice', correct: 'a' } : { kind: 'cyrillic', accepted: ['к'] },
  choices: [{ id: 'a', label: 'a' }], hints: [], reads: [], writes: [], requires_items: [], difficulty: 1, status: 'validated', ...over,
});
const units: UnitDef[] = [
  { id: 'u1', order: 1, level: 'A0', title_fr: '', mission_fr: '', items: ['letter:а', 'letter:к', 'letter:м'] },
  { id: 'u2', order: 2, level: 'A0', title_fr: '', mission_fr: '', items: ['letter:о'] },
];
const exercises = ['а', 'к', 'м', 'о'].flatMap((l) => [mk(`rec_${l}`, `letter:${l}`, 'recognition'), mk(`rcl_${l}`, `letter:${l}`, 'recall')]);
const base = {
  minutes: 35 as const, now, timeZone: 'UTC', units, exercises, simplified: new Set<string>(), alphabetExitPassed: false,
  speakableItems: new Set<string>(),
};

describe('SessionPlanner (§6)', () => {
  it('première séance A0 : présentation avant tout exercice évalué de chaque item', () => {
    const p = planSession({ ...base, taught: new Set(), states: [] });
    expect(p.unit_id).toBe('u1');
    expect(p.new_items).toEqual(['letter:а', 'letter:к', 'letter:м']);
    const firstTeach = new Map<string, number>();
    p.steps.forEach((s, i) => { if (s.kind === 'teach' && !firstTeach.has(s.item_id)) firstTeach.set(s.item_id, i); });
    p.steps.forEach((s, i) => { if (s.kind === 'exercise') expect(firstTeach.get(s.item_id)!).toBeLessThan(i); });
    expect(p.steps.some((s) => s.kind === 'exercise' && s.item_id === 'letter:о')).toBe(false);
  });

  it('l’unité suivante reste fermée tant que la précédente n’est pas consolidée', () => {
    const taught = new Set(units[0]!.items);
    const p = planSession({ ...base, taught, states: [] });
    expect(p.new_items).toEqual([]);
    expect(p.explanations.map((e) => e.code)).toContain('unit_locked');
    const states: ReviewState[] = units[0]!.items.map((i) => ({ ...initialReviewState(i, 'recognition'), stage: 1, due_at: new Date(now.getTime() + 86400000) }));
    expect(planSession({ ...base, taught, states }).new_items).toEqual(['letter:о']);
  });

  it('dette de révision élevée : pas de nouveauté, les tâches dues restent', () => {
    const many: ExerciseDef[] = []; const states: ReviewState[] = []; const taught = new Set<string>(units[0]!.items);
    for (let i = 0; i < 400; i++) {
      many.push(mk(`r${i}`, `it${i}`, 'recall'));
      taught.add(`it${i}`);
      states.push({ ...initialReviewState(`it${i}`, 'recall'), stage: 1, due_at: new Date(now.getTime() - 1000) });
    }
    const p = planSession({ ...base, exercises: [...exercises, ...many], taught, states });
    expect(p.new_items).toEqual([]);
    expect(p.review_count).toBeGreaterThan(0);
    expect(p.explanations.map((e) => e.code)).toContain('review_debt');
  });

  it('3 échecs : explication alternative et exercice plus simple ; deux réussites espacées lèvent le mode', () => {
    const t = (h: number) => new Date(now.getTime() + h * 3600_000);
    expect(simplificationActive([{ grade: 0, created_at: t(0) }, { grade: 0, created_at: t(1) }, { grade: 0, created_at: t(2) }])).toBe(true);
    expect(simplificationActive([{ grade: 0, created_at: t(0) }, { grade: 0, created_at: t(1) }, { grade: 0, created_at: t(2) },
      { grade: 2, created_at: t(3) }, { grade: 2, created_at: t(4) }])).toBe(true);
    expect(simplificationActive([{ grade: 0, created_at: t(0) }, { grade: 0, created_at: t(1) }, { grade: 0, created_at: t(2) },
      { grade: 2, created_at: t(3) }, { grade: 2, created_at: t(30) }])).toBe(false);
    const hard = mk('hard_к', 'letter:к', 'recall', { difficulty: 3 });
    const taught = new Set(units[0]!.items);
    const states = [{ ...initialReviewState('letter:к', 'recall'), due_at: new Date(now.getTime() - 1), remediation_pending: true }];
    const p = planSession({ ...base, exercises: [hard, ...exercises], taught, states, simplified: new Set(['letter:к']) });
    expect(p.steps[0]).toMatchObject({ kind: 'teach', item_id: 'letter:к', alternative_explanation: true });
    expect(p.steps[1]).toMatchObject({ kind: 'exercise', exercise_slug: 'rcl_к', purpose: 'remediation' });
  });

  it('séance de 5 min : révisions + une production', () => {
    const taught = new Set(units[0]!.items);
    const states = [{ ...initialReviewState('letter:к', 'recall'), stage: 1, due_at: new Date(now.getTime() - 1) }];
    const p = planSession({ ...base, minutes: 5, taught, states, speakableItems: new Set(['letter:к']) });
    expect(p.new_items).toEqual([]);
    expect(p.steps.filter((s) => s.kind === 'speak')).toHaveLength(1);
    expect(p.estimated_seconds).toBeLessThanOrEqual(5 * 60);
  });
});

describe('Sortie du module alphabet (§5)', () => {
  it('exige deux jours ≥ 90 %, décodage ≥ 80 %, toutes lettres revues', () => {
    const letters = ['а', 'к'];
    const day = (d: string) => Array.from({ length: 10 }, (_, i) => ({ letter: letters[i % 2]!, kind: 'recognition' as const, grade: 2 as const, assisted: false, created_at: new Date(`${d}T08:0${i}:00Z`) }));
    const dec = Array.from({ length: 5 }, (_, i) => ({ letter: null, kind: 'decoding_unseen' as const, grade: 2 as const, assisted: false, created_at: new Date(`2026-11-02T09:0${i}:00Z`) }));
    expect(alphabetExitStatus(day('2026-11-01'), letters).passed).toBe(false);
    expect(alphabetExitStatus([...day('2026-11-01'), ...day('2026-11-02'), ...dec], letters).passed).toBe(true);
  });
});
