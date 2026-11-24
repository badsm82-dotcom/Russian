import { describe, expect, it } from 'vitest';
import { buildAlphabetAssessment, scoreAssessment, toClientExercise, type AssessmentAnswer } from '../src/index.js';

const letters = 'абвгдежзийклмнопрстуфхцчшщъыьэюя'.split('').map((l, i) => ({ upper: l.toUpperCase(), lower: l, sound_label_fr: `son ${i}`, confusions: [] }));
const words = ['стол', 'нож', 'ры́ба', 'кни́га', 'шко́ла', 'окно́', 'река́', 'луна́', 'мы́ло', 'жук', 'шум', 'ключ'].map((ru) => ({ ru, fr: ru }));

describe('Bilan alphabet (§5, §12, AC10)', () => {
  it('20 lettres + 10 mots, variantes différentes à chaque passage, identiques pour un même passage', () => {
    const a = buildAlphabetAssessment('run-a', letters, words);
    const b = buildAlphabetAssessment('run-b', letters, words);
    expect(a.tasks.filter((t) => t.part === 'recognition')).toHaveLength(20);
    expect(a.tasks.filter((t) => t.part === 'decoding')).toHaveLength(10);
    expect(JSON.stringify(a.tasks.map((t) => t.exercise.stimulus))).not.toBe(JSON.stringify(b.tasks.map((t) => t.exercise.stimulus)));
    expect(buildAlphabetAssessment('run-a', letters, words)).toEqual(a);
    // Aucun indice, aucun corrigé côté client.
    for (const t of a.tasks) {
      expect(t.exercise.hints).toEqual([]);
      expect(JSON.stringify(toClientExercise(t.exercise))).not.toMatch(/"answer"|"correct"/);
    }
  });
  it('seuils 90 % / 80 % ; non répondu et « je ne sais pas » comptent faux ; lettres à revoir', () => {
    const spec = buildAlphabetAssessment('run-c', letters, words);
    const all = new Map<number, AssessmentAnswer>();
    for (const t of spec.tasks) {
      const ans = t.exercise.answer;
      all.set(t.index, ans.kind === 'choice' ? { choice_id: ans.correct } : { text: ans.kind === 'transliteration' ? ans.variants[0] : '' });
    }
    expect(scoreAssessment(spec, all).passed).toBe(true);
    const rec = spec.tasks.filter((t) => t.part === 'recognition');
    const three = new Map(all);
    for (const t of rec.slice(0, 3)) three.set(t.index, { dont_know: true });
    const s = scoreAssessment(spec, three);
    expect(s.passed).toBe(false); // 17/20 = 85 % < 90 %
    expect(s.letters_to_review).toHaveLength(3);
    const missing = new Map(all);
    missing.delete(rec[0]!.index);
    expect(scoreAssessment(spec, missing).parts[0]!.correct).toBe(19);
  });
});
