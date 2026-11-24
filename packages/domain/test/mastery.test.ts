import { describe, expect, it } from 'vitest';
import { activeMastery, masteryScore, isReceptivelyKnown, type HistoryAttempt } from '../src/index.js';

const d = (iso: string) => new Date(iso);
const a = (iso: string, over: Partial<HistoryAttempt> = {}): HistoryAttempt => ({
  competency: 'recall', grade: 2, assisted: false, created_at: d(iso), in_context: false, ...over,
});

describe('Maîtrise (§9, AC04)', () => {
  it('une réussite QCM ne valide pas le vocabulaire actif', () => {
    const h = [1, 2, 3, 20].map((n) => a(`2026-11-${String(n).padStart(2, '0')}T08:00:00Z`, { competency: 'recognition' }));
    expect(activeMastery(h).mastered).toBe(false);
    expect(isReceptivelyKnown(h)).toBe(true);
  });
  it('exige 3 jours distincts, un succès ≥ 14 j après le premier et une utilisation en contexte', () => {
    const h = [a('2026-11-01T08:00:00Z'), a('2026-11-03T08:00:00Z'), a('2026-11-16T08:00:00Z')];
    expect(activeMastery(h).mastered).toBe(false); // pas de contexte
    const withCtx = [...h, a('2026-11-16T09:00:00Z', { competency: 'transfer', in_context: true })];
    expect(activeMastery(withCtx).mastered).toBe(true);
    const sameDay = [a('2026-11-01T08:00:00Z'), a('2026-11-01T09:00:00Z'), a('2026-11-15T09:00:00Z'), a('2026-11-15T10:00:00Z', { in_context: true })];
    expect(activeMastery(sameDay).mastered).toBe(false);
  });
  it('les aides ne comptent pas comme rappel autonome', () => {
    const h = ['01', '03', '16'].map((x) => a(`2026-11-${x}T08:00:00Z`, { assisted: true, grade: 1 }));
    expect(activeMastery(h).autonomous_recall_days).toBe(0);
  });
  it('deux échecs récents réouvrent', () => {
    const h = [a('2026-11-01T08:00:00Z'), a('2026-11-03T08:00:00Z'), a('2026-11-16T08:00:00Z', { in_context: true }),
      a('2026-11-20T08:00:00Z', { grade: 0 }), a('2026-11-21T08:00:00Z', { grade: 0 })];
    expect(activeMastery(h)).toMatchObject({ mastered: false, reopened: true });
  });
  it('score : données insuffisantes si aucune mesure, renormalisé sinon', () => {
    expect(masteryScore([])).toMatchObject({ score: null, insufficient_data: true });
    const s = masteryScore([a('2026-11-01T08:00:00Z', { competency: 'recognition' })]);
    expect(s.score).toBe(100);
    expect(s.components.recall).toBeNull();
  });
});
