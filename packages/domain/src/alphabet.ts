/**
 * Critère de sortie du module alphabet (§5) :
 * ≥ 90 % de reconnaissance sur deux jours distincts, ≥ 80 % de décodage sur mots non vus,
 * chaque lettre revue, aucune lettre durablement non maîtrisée. Sinon, prolonger au-delà de 7 jours.
 */
import type { Grade } from './types.js';
import { localDayKey } from './mastery.js';

export const ALPHABET_LETTER_COUNT = 33;
export const RECOGNITION_THRESHOLD = 0.9;
export const DECODING_THRESHOLD = 0.8;
export const MIN_ATTEMPTS_PER_DAY = 10;
export const MIN_DECODING_ATTEMPTS = 5;

export interface AlphabetAttempt {
  letter: string | null;
  kind: 'recognition' | 'recall' | 'decoding_unseen';
  grade: Grade;
  assisted: boolean;
  created_at: Date;
}

export interface AlphabetExitStatus {
  passed: boolean;
  recognition_days_passed: number;
  decoding_rate: number | null;
  letters_reviewed: number;
  weak_letters: string[];
  reasons_fr: string[];
}

const ok = (a: AlphabetAttempt) => a.grade >= 2 && !a.assisted;

export function alphabetExitStatus(attempts: readonly AlphabetAttempt[], allLetters: readonly string[], timeZone = 'UTC'): AlphabetExitStatus {
  const byDay = new Map<string, AlphabetAttempt[]>();
  for (const a of attempts.filter((x) => x.kind === 'recognition')) {
    const k = localDayKey(a.created_at, timeZone);
    byDay.set(k, [...(byDay.get(k) ?? []), a]);
  }
  let daysPassed = 0;
  for (const list of byDay.values()) {
    if (list.length >= MIN_ATTEMPTS_PER_DAY && list.filter(ok).length / list.length >= RECOGNITION_THRESHOLD) daysPassed++;
  }
  const dec = attempts.filter((a) => a.kind === 'decoding_unseen');
  const decodingRate = dec.length >= MIN_DECODING_ATTEMPTS ? dec.filter(ok).length / dec.length : null;

  const perLetter = new Map<string, AlphabetAttempt[]>();
  for (const a of attempts) if (a.letter) perLetter.set(a.letter, [...(perLetter.get(a.letter) ?? []), a]);
  const reviewed = allLetters.filter((l) => perLetter.has(l));
  const weak = allLetters.filter((l) => {
    const list = (perLetter.get(l) ?? []).sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    const lastTwo = list.slice(-2);
    return lastTwo.length === 2 && lastTwo.every((a) => a.grade === 0);
  });

  const reasons: string[] = [];
  if (daysPassed < 2) reasons.push(`Reconnaissance ≥ 90 % atteinte sur ${daysPassed}/2 jours distincts.`);
  if (decodingRate === null) reasons.push('Pas encore assez de décodage de mots inédits.');
  else if (decodingRate < DECODING_THRESHOLD) reasons.push(`Décodage de mots inédits : ${Math.round(decodingRate * 100)} % (objectif 80 %).`);
  if (reviewed.length < allLetters.length) reasons.push(`Lettres revues : ${reviewed.length}/${allLetters.length}.`);
  if (weak.length) reasons.push(`Lettres à reprendre : ${weak.join(' ')}.`);
  return {
    passed: reasons.length === 0,
    recognition_days_passed: daysPassed,
    decoding_rate: decodingRate,
    letters_reviewed: reviewed.length,
    weak_letters: weak,
    reasons_fr: reasons,
  };
}
