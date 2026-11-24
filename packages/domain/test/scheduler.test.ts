import { describe, expect, it } from 'vitest';
import { initialReviewState, scheduleReview, applyAttempt, isDue, REVIEW_INTERVALS_DAYS } from '../src/index.js';

const T0 = new Date('2026-11-24T08:00:00Z');
const DAY = 86_400_000;
const days = (d: Date, from = T0) => (d.getTime() - from.getTime()) / DAY;

describe('ReviewScheduler (§9, AC05) — horloge simulée', () => {
  it('grade 2 : intervalle du niveau courant puis avancement', () => {
    let s = initialReviewState('letter:к', 'recall');
    let now = T0;
    const seen: number[] = [];
    for (let i = 0; i < REVIEW_INTERVALS_DAYS.length + 2; i++) {
      const r = scheduleReview(s, { grade: 2, assisted: false }, now);
      seen.push(days(r.state.due_at!, now));
      now = r.state.due_at!;
      s = r.state;
    }
    expect(seen).toEqual([1, 3, 7, 14, 30, 60, 120, 120, 120]);
    expect(s.stage).toBe(REVIEW_INTERVALS_DAYS.length - 1);
  });

  it('grade 3 : intervalle × 1,3 arrondi au supérieur, plafonné à 180 jours', () => {
    const s = { ...initialReviewState('x', 'recall'), stage: 2 };
    const r = scheduleReview(s, { grade: 3, assisted: false }, T0);
    expect(days(r.state.due_at!)).toBe(Math.ceil(7 * 1.3));
    expect(r.state.stage).toBe(3);
    const top = { ...initialReviewState('x', 'recall'), stage: 6 };
    expect(days(scheduleReview(top, { grade: 3, assisted: false }, T0).state.due_at!)).toBe(156);
    expect(days(scheduleReview(top, { grade: 3, assisted: false }, T0).state.due_at!)).toBeLessThanOrEqual(180);
  });

  it('grade 1 (aide) : niveau conservé, revoir dans 1 jour', () => {
    const s = { ...initialReviewState('x', 'recall'), stage: 3 };
    const r = scheduleReview(s, { grade: 1, assisted: true }, T0);
    expect(r.state.stage).toBe(3);
    expect(days(r.state.due_at!)).toBe(1);
  });

  it('grade 0 : recul de 2 niveaux (min 0), revoir dans 10 min, puis remédiation → lendemain sans avancement', () => {
    const s = { ...initialReviewState('x', 'recall'), stage: 3 };
    const fail = scheduleReview(s, { grade: 0, assisted: false }, T0);
    expect(fail.state.stage).toBe(1);
    expect(fail.state.due_at!.getTime() - T0.getTime()).toBe(10 * 60_000);
    expect(fail.state.remediation_pending).toBe(true);
    const t1 = new Date(T0.getTime() + 10 * 60_000);
    const rem = scheduleReview(fail.state, { grade: 2, assisted: false }, t1);
    expect(rem.remediation).toBe(true);
    expect(rem.state.stage).toBe(1); // pas d'avancement sur la remédiation
    expect(days(rem.state.due_at!, t1)).toBe(1);
    expect(rem.state.remediation_pending).toBe(false);
    // Après la remédiation, la progression normale reprend.
    const next = scheduleReview(rem.state, { grade: 2, assisted: false }, rem.state.due_at!);
    expect(next.state.stage).toBe(2);
    expect(days(next.state.due_at!, rem.state.due_at!)).toBe(3);

    const low = scheduleReview({ ...initialReviewState('y', 'recall'), stage: 1 }, { grade: 0, assisted: false }, T0);
    expect(low.state.stage).toBe(0);
  });

  it('une tentative abandonnée ou non notable ne change rien (pas un échec)', () => {
    const s = { ...initialReviewState('x', 'recall'), stage: 2, due_at: T0 };
    expect(scheduleReview(s, { grade: 0, assisted: false, abandoned: true }, T0)).toMatchObject({ changed: false, state: s });
    expect(scheduleReview(s, { grade: 0, assisted: false, unscorable: true }, T0)).toMatchObject({ changed: false, state: s });
  });

  it('un item jamais planifié n’est pas dû ; dû une fois l’échéance passée', () => {
    const s = initialReviewState('x', 'recall');
    expect(isDue(s, T0)).toBe(false);
    const r = scheduleReview(s, { grade: 2, assisted: false }, T0).state;
    expect(isDue(r, new Date(T0.getTime() + DAY - 1))).toBe(false);
    expect(isDue(r, new Date(T0.getTime() + DAY))).toBe(true);
  });

  it('un échec sur un item maîtrisé le réouvre', () => {
    const s = { ...initialReviewState('x', 'recall'), stage: 6, mastery_status: 'mastered' as const };
    expect(scheduleReview(s, { grade: 0, assisted: false }, T0).state.mastery_status).toBe('reopened');
  });

  it('révision anticipée : réussite non comptée pour l’avancement, échec pris en compte', () => {
    const s = scheduleReview(initialReviewState('x', 'recall'), { grade: 2, assisted: false }, T0).state;
    const later = new Date(T0.getTime() + 3600_000);
    expect(applyAttempt(s, { grade: 2, assisted: false }, later)).toMatchObject({ early: true, changed: false, state: s });
    const f = applyAttempt(s, { grade: 0, assisted: false }, later);
    expect(f.changed).toBe(true);
    expect(f.state.remediation_pending).toBe(true);
    // la remédiation reste possible avant l'échéance de 10 min
    expect(applyAttempt(f.state, { grade: 2, assisted: false }, new Date(later.getTime() + 60_000)).remediation).toBe(true);
  });
});
