import { describe, expect, it } from 'vitest';
import { a0Baseline, gradeAnswer, isExerciseAvailable, planSession } from '@r365/domain';
import { ALL_LETTERS, BRIDGES, EXERCISES, SPEAKABLE_ITEMS, TEACH_CARDS, UNITS, LETTERS, validateContent, uuidFromSlug } from '../src/index.js';

describe('Contenu A0 (§5, §17, AC02, AC03, AC20)', () => {
  it('passe la validation automatique sans erreur', () => {
    const errors = validateContent({ units: UNITS, exercises: EXERCISES, cards: TEACH_CARDS, bridges: BRIDGES, letters: ALL_LETTERS }).filter((i) => i.level === 'error');
    expect(errors).toEqual([]);
  });
  it('couvre exactement 33 lettres, majuscules et minuscules', () => {
    expect(LETTERS).toHaveLength(33);
    expect(new Set(LETTERS.map((l) => l.upper)).size).toBe(33);
    for (const l of LETTERS) expect(l.upper.toLocaleLowerCase('ru')).toBe(l.lower);
    expect(EXERCISES.some((e) => e.slug.startsWith('case_'))).toBe(true);
  });
  it('chaque lettre a reconnaissance, rappel sans choix et décodage', () => {
    for (const l of LETTERS) {
      const own = EXERCISES.filter((e) => e.item_id === `letter:${l.lower}`);
      expect(own.some((e) => e.type === 'letter_recognition')).toBe(true);
      expect(own.some((e) => e.type === 'letter_recall' && e.answer.kind === 'cyrillic')).toBe(true);
      expect(own.some((e) => e.type === 'decoding')).toBe(true);
    }
  });
  it('aucun QCM n’est classé en rappel (AC04)', () => {
    for (const e of EXERCISES) if (e.answer.kind === 'choice') expect(['recognition', 'listening', 'spelling']).toContain(e.competency);
  });
  it('banque initiale ≈ 150 exercices variés', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(150);
    expect(new Set(EXERCISES.map((e) => e.type)).size).toBeGreaterThanOrEqual(8);
  });
  it('les mots oraux à lettres inconnues ne sont pas testés en lecture avant leurs lettres', () => {
    const read = EXERCISES.find((e) => e.slug === 'read_lex:privet')!;
    expect(read.unit_id).toBe('A0-04'); // п (A0-03), и/е (A0-04)
    expect(EXERCISES.find((e) => e.slug === 'listen_lex:privet')!.unit_id).toBe('A0-01');
  });
  it('UUID v5 déterministes', () => {
    expect(uuidFromSlug('x')).toBe(uuidFromSlug('x'));
    expect(uuidFromSlug('x')).not.toBe(uuidFromSlug('y'));
  });
  it('première séance d’un profil A0 : rien n’exige un prérequis non enseigné (AC01, AC20, AC21)', () => {
    expect(a0Baseline().first_unit).toBe(UNITS[0]!.id);
    const plan = planSession({ minutes: 35, now: new Date('2026-11-24T08:00:00Z'), timeZone: 'Europe/Zurich', units: UNITS, exercises: EXERCISES,
      taught: new Set(), states: [], simplified: new Set(), alphabetExitPassed: false, speakableItems: SPEAKABLE_ITEMS });
    expect(plan.unit_id).toBe('A0-01');
    expect(plan.steps.length).toBeGreaterThan(5);
    const taught = new Set<string>();
    const bySlug = new Map(EXERCISES.map((e) => [e.slug, e]));
    for (const s of plan.steps) {
      if (s.kind === 'teach') taught.add(s.item_id);
      if (s.kind === 'exercise') {
        const ex = bySlug.get(s.exercise_slug)!;
        expect(isExerciseAvailable(ex, taught), ex.slug).toBe(true);
        // Aucun exercice de la première séance n'exige un microphone ; le clavier virtuel suffit pour la saisie.
        expect(ex.type).not.toBe('dictation');
      }
    }
    expect(plan.estimated_seconds).toBeLessThanOrEqual(35 * 60);
  });
  it('les exercices se corrigent avec leur propre réponse attendue', () => {
    for (const ex of EXERCISES) {
      const a = ex.answer;
      const ans = a.kind === 'choice' ? { choice_id: a.correct } : a.kind === 'cyrillic' ? { text: a.accepted[0] } : { text: a.variants[0] };
      const r = gradeAnswer(ex, ans, { assisted: false, duration_ms: 10000, previous_grade: null });
      expect(r.accepted, ex.slug).toBe(true);
    }
  });
});

describe('Supports visuels', () => {
  it('chaque expression a un pictogramme et chaque lettre une catégorie', async () => {
    const { ITEM_EMOJI, ITEM_TABLES, LEXEMES: LX } = await import('../src/index.js');
    for (const x of LX) expect(ITEM_EMOJI[x.item_id], x.item_id).toBeTruthy();
    for (const c of TEACH_CARDS.filter((c) => c.item_type === 'letter')) expect(c.letter_class).toBeTruthy();
    for (const [id, t] of Object.entries(ITEM_TABLES)) {
      expect(LX.some((x) => x.item_id === id), id).toBe(true);
      for (const r of t.rows) expect(r.cells.length).toBe(t.headers.length);
    }
  });
});
