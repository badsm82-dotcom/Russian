import { describe, expect, it } from 'vitest';
import { normalizeAnswer, stripStressMarks, detectScript, lettersInText, levenshtein, acceptsTransliteration, displayTransliteration } from '../src/index.js';

describe('Unicode (§8, §15)', () => {
  it('normalise en NFC et retire l’accent pédagogique sans abîmer й ni ё', () => {
    expect(stripStressMarks('хоте́ть')).toBe('хотеть');
    expect(stripStressMarks('мой')).toBe('мой');
    expect(stripStressMarks('ёлка')).toBe('ёлка');
    // й décomposé (и + brève) recomposé en NFC
    expect(stripStressMarks('мой')).toBe('мой');
  });

  it('accepte е pour ё hors exercice ciblé, ignore casse, espaces et ponctuation finale', () => {
    expect(normalizeAnswer('  Я  хочу́ ко́фе. ')).toBe('я хочу кофе');
    expect(normalizeAnswer('ещё')).toBe(normalizeAnswer('еще'));
    expect(normalizeAnswer('ещё', { distinguishYo: true })).not.toBe(normalizeAnswer('еще', { distinguishYo: true }));
  });

  it('détecte les scripts latins / mixtes', () => {
    expect(detectScript('кот')).toBe('cyrillic');
    expect(detectScript('kot')).toBe('latin');
    expect(detectScript('кoт')).toBe('mixed'); // o latin
  });

  it('extrait les lettres à lire', () => {
    expect([...lettersInText('Ма́ма!')].sort()).toEqual(['а', 'м']);
  });

  it('distance d’édition par caractère', () => {
    expect(levenshtein('мама', 'мам')).toBe(1);
    expect(levenshtein('кот', 'кот')).toBe(0);
  });
});

describe('Translittération (aide temporaire)', () => {
  it('accepte plusieurs systèmes courants', () => {
    expect(acceptsTransliteration('мама', 'mama')).toBe(true);
    expect(acceptsTransliteration('хорошо', 'khorosho')).toBe(true);
    expect(acceptsTransliteration('хорошо', 'horosho')).toBe(true);
    expect(acceptsTransliteration('хорошо', 'kharacho', ['kharacho'])).toBe(true);
    expect(acceptsTransliteration('кот', 'kit')).toBe(false);
    expect(acceptsTransliteration('там', 'tam')).toBe(true);
  });
  it('affiche une translittération lisible', () => {
    expect(displayTransliteration('Привет')).toBe('Privie' + 't');
  });
});
