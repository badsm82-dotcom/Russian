import { describe, expect, it } from 'vitest';
import { a0Baseline, defaultLanguageProfile, SKILL_DOMAINS, shouldShowTransliteration } from '../src/index.js';

describe('Profil A0 (§3, AC19) et langues (§2.1, recette 1)', () => {
  it('zéro acquis, évaluations nulles, aucun test obligatoire', () => {
    const b = a0Baseline();
    expect(b).toMatchObject({ entry_level: 'A0', placement_required: false, letters_mastered: 0, active_lemmas: 0, receptive_lemmas: 0, assessment_scores: null, first_unit: 'A0-01' });
    for (const d of SKILL_DOMAINS) expect(b.skills[d]).toBe('A0');
  });
  it('les sept langues et leurs niveaux exacts', () => {
    const p = defaultLanguageProfile();
    expect(p.known_languages.map((l) => [l.code, l.proficiency])).toEqual([
      ['fr', 'fluent'], ['en', 'fluent'], ['de', 'fluent'], ['pt', 'fluent'],
      ['es', 'functional_communication'], ['it', 'functional_communication'], ['ro', 'A2'],
    ]);
    expect(p).toMatchObject({ interface_language: 'fr', target_language: 'ru', target_entry_level: 'A0' });
  });
  it('translittération masquée progressivement selon les lettres décodées', () => {
    expect(shouldShowTransliteration('auto', ['к', 'о'], new Set(['к']))).toBe(true);
    expect(shouldShowTransliteration('auto', ['к', 'о'], new Set(['к', 'о']))).toBe(false);
    expect(shouldShowTransliteration('always', [], new Set())).toBe(true);
  });
});
