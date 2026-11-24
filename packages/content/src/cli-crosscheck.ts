import { EXERCISES, LEXEMES, LETTERS, TEACH_CARDS, stressCrossCheck } from './index.js';

const texts = [
  ...LEXEMES.flatMap((x) => [x.ru, ...x.examples.map((e) => e.ru)]),
  ...LETTERS.flatMap((l) => l.examples.map((e) => e.ru)),
  ...TEACH_CARDS.flatMap((c) => c.examples.map((e) => e.ru)),
  ...EXERCISES.flatMap((e) => [e.stimulus.ru ?? '', ...e.reads]),
];
const m = stressCrossCheck(texts);
console.log(`Contrôle des accents avec OpenRussian : ${m.length} divergence(s) à vérifier.`);
for (const x of m) console.log(`  ${x.word} : notre accent « ${x.ours} », référence « ${x.reference} »`);
