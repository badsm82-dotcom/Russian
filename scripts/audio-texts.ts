/**
 * Liste des textes russes à sonoriser (fiches, exemples, consignes audio des exercices), avec la meilleure
 * version accentuée connue. Usage : npx tsx scripts/audio-texts.ts > audio-texts.json
 */
import { EXERCISES, LETTERS, LEXEMES, TEACH_CARDS, TRANSFER_WORDS } from '../packages/content/src/index.js';
import { normalizeAnswer, stripStressMarks } from '../packages/domain/src/index.js';

export const audioKey = (t: string) => normalizeAnswer(stripStressMarks(t));
const best = new Map<string, string>();
const add = (t: string | undefined) => {
  if (!t || !/[а-яё]/i.test(t)) return;
  const clean = t.replace(/^—\s*/, '').replace(/…/g, '').trim();
  const k = audioKey(clean);
  if (!k) return;
  const prev = best.get(k);
  if (!prev || (!prev.includes('́') && clean.includes('́'))) best.set(k, clean);
};
for (const c of TEACH_CARDS) {
  if (c.item_type !== 'letter') add(c.ru);
  add(c.audio_text);
  c.examples.forEach((e) => add(e.ru));
}
for (const l of LETTERS) l.examples.forEach((e) => add(e.ru));
for (const x of LEXEMES) { add(x.ru); x.examples.forEach((e) => add(e.ru)); }
for (const list of Object.values(TRANSFER_WORDS)) list.forEach((w) => add(w.ru));
for (const e of EXERCISES) { add(e.stimulus.audio_text); if (e.stimulus.ru && !e.stimulus.ru.includes('___')) add(e.stimulus.ru); }
const out = [...best].map(([key, text]) => ({ key, text, words: key.split(' ').length }));
process.stdout.write(JSON.stringify(out, null, 1));
