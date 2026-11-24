import { ALL_LETTERS, BRIDGES, EXERCISES, TEACH_CARDS, UNITS, validateContent } from './index.js';

const issues = validateContent({ units: UNITS, exercises: EXERCISES, cards: TEACH_CARDS, bridges: BRIDGES, letters: ALL_LETTERS });
const errors = issues.filter((i) => i.level === 'error');
const warnings = issues.filter((i) => i.level === 'warning');
for (const e of errors) console.error(`ERREUR ${e.ref} — ${e.message}`);
console.log(`Unités : ${UNITS.length} | fiches : ${TEACH_CARDS.length} | exercices : ${EXERCISES.length} | passerelles : ${BRIDGES.length} (${BRIDGES.filter((b) => b.validation_status === 'validated').length} validées)`);
const byUnit = new Map<string, number>();
for (const e of EXERCISES) byUnit.set(e.unit_id, (byUnit.get(e.unit_id) ?? 0) + 1);
console.log('Exercices par unité :', Object.fromEntries([...byUnit].sort()));
console.log(`Avertissements : ${warnings.length} (contenu en attente de revue linguistique)`);
console.log(errors.length ? `${errors.length} erreur(s).` : 'Aucune erreur bloquante.');
process.exit(errors.length ? 1 : 0);
