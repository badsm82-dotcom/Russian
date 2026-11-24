import { describe, expect, it } from 'vitest';
import { expectedLemmas, goalReport, MONTHLY_TARGETS, type ActivityDay } from '../src/index.js';

const base = {
  start: new Date('2026-11-24T08:00:00Z'), timeZone: 'Europe/Zurich', daily_minutes: 35, days_per_week: 6,
  active_lemmas: 0, receptive_lemmas: 0, alphabet_passed: false, content_available_until_month: 1,
};
const days = (from: string, n: number, min: number): ActivityDay[] =>
  Array.from({ length: n }, (_, i) => ({ day: new Date(new Date(`${from}T00:00:00Z`).getTime() + i * 86400000).toISOString().slice(0, 10), active_minutes: min }));

describe('Objectifs et calendrier (§4, §12)', () => {
  it('12 mois, 52 semaines, cibles finales 1500/2500', () => {
    expect(MONTHLY_TARGETS).toHaveLength(12);
    expect(MONTHLY_TARGETS.at(-1)!.weeks[1]).toBe(52);
    expect(expectedLemmas(4)).toEqual({ active: 100, receptive: 180 });
    expect(expectedLemmas(52)).toEqual({ active: 1500, receptive: 2500 });
    expect(expectedLemmas(2).active).toBe(50);
  });
  it('jour 1 : semaine 1, pas commencé, bilan alphabet à venir', () => {
    const r = goalReport({ ...base, now: new Date('2026-11-24T10:00:00Z'), activity: [] });
    expect(r).toMatchObject({ week: 1, start_date: '2026-11-24', pace: { status: 'not_started' } });
    expect(r.this_week.target_minutes).toBe(210);
    expect(r.checkpoints[0]).toMatchObject({ id: 'alphabet', state: 'upcoming', date: '2026-12-07' });
  });
  it('rythme tenu → dans les temps ; moitié → en retard ; date d’arrivée estimée', () => {
    const now = new Date('2026-12-22T10:00:00Z'); // jour 28
    const ok = goalReport({ ...base, now, activity: days('2026-11-24', 28, 30) });
    expect(ok.week).toBe(5);
    expect(ok.pace.status).toBe('on_track');
    expect(ok.projection.estimated_end_date).toBeTruthy();
    const late = goalReport({ ...base, now, activity: days('2026-11-24', 28, 12) });
    expect(late.pace.status).toBe('behind');
    expect(late.next_steps_fr.join(' ')).toMatch(/révisions dues/);
  });
  it('bilan alphabet marqué fait quand le critère de sortie est atteint', () => {
    const r = goalReport({ ...base, now: new Date('2026-12-01T10:00:00Z'), activity: days('2026-11-24', 7, 35), alphabet_passed: true });
    expect(r.checkpoints[0]!.state).toBe('done');
    expect(r.this_week.done_days).toBe(0);
  });
});
