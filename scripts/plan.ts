/**
 * Génère le plan personnel daté sur 52 semaines (docs/PLAN_12_MOIS.md), à partir des repères du cahier des charges.
 * Usage : npx tsx scripts/plan.ts 2026-11-24 [minutes_par_jour=35] [jours_par_semaine=6]
 */
import { writeFileSync } from 'node:fs';
import { CHECKPOINTS, expectedLemmas, monthForWeek, MONTHLY_TARGETS, WEEKLY_RHYTHM_FR, weekStart, addDaysUtc } from '../packages/domain/src/index.js';
import { UNITS } from '../packages/content/src/index.js';

const startArg = process.argv[2] ?? new Date().toISOString().slice(0, 10);
const perDay = Number(process.argv[3] ?? 35);
const days = Number(process.argv[4] ?? 6);
const start = new Date(`${startArg}T00:00:00Z`);
const fmt = (d: Date) => d.toLocaleDateString('fr-CH', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const short = (d: Date) => d.toLocaleDateString('fr-CH', { day: 'numeric', month: 'short', timeZone: 'UTC' });

/** Focus des 4 premières semaines (contenu disponible). */
const MONTH1: Record<number, string> = {
  1: 'Alphabet séances 1–6 (А К М О Т → Ы Э Ь Ъ) + premières formules (Привет, Да, Нет, Спасибо, Как дела?, Меня зовут…, Я хочу…). Unités A0-01 à A0-06.',
  2: 'Consolidation de l’alphabet (A0-07 : majuscules, mots inédits, dictée) + je/tu/vous, se présenter (A0-08) ; phrases sans verbe « être » (A0-09). **Bilan alphabet J7–J14.**',
  3: 'Vouloir, refuser, questions (A0-10) ; besoins et demandes polies (A0-11). Lire des phrases courtes.',
  4: 'Dialogue guidé au café 30–60 s (A0-12) ; révisions ciblées. **Bilan M1.**',
};

const weekly = perDay * days;
let md = `# Mon plan Russian 365 — 12 mois\n\n`;
md += `Départ : **${fmt(start)}** · rythme : **${perDay} min × ${days} jours = ${weekly} min/semaine** (≈ ${Math.round((weekly * 52) / 60)} h sur l’année) · arrivée prévue : **${fmt(addDaysUtc(start, 52 * 7 - 1))}**.\n\n`;
md += `**But (§1)** : tenir une conversation familière de 10–15 minutes et lire seul un livre gradué A2. Objectifs indicatifs : 1 500 mots actifs, 2 500 compris, 33 lettres, 6 cas rencontrés en contexte.\n\n`;
md += `L’application suit ce plan pour toi (accueil : « Mon objectif » ; onglet Progrès : « Mon plan sur 12 mois ») et indique si tu es dans les temps.\n\n`;
md += `## Les règles du jeu\n\n`;
md += `1. **Tous les jours prévus, une séance** (même 5 min les jours chargés : révisions + une production). La régularité compte plus que la durée.\n`;
md += `2. **Les révisions dues d’abord.** Si elles s’accumulent, l’application suspend les nouveautés : c’est voulu.\n`;
md += `3. **Les semaines sont des repères, pas des verrous.** En cas de retard, on consolide l’essentiel ; les dates glissent, le programme n’est pas comprimé (§4).\n`;
md += `4. **Après une absence**, reprendre avec une séance légère, sans culpabilité : aucune série n’est perdue.\n`;
md += `5. **Le 7e jour** : repos ou immersion légère (chanson russe, dessin animé sous-titré, réécouter les dialogues).\n`;
md += `6. **Les bilans** se font sans aide ni traduction ; ils servent à ajuster, pas à juger.\n\n`;
md += `### Une semaine type (§4)\n\n${WEEKLY_RHYTHM_FR.map((d) => `- ${d}`).join('\n')}\n\n`;
md += `### Une séance de 35 min (§6)\n\n- 7 min : révisions dues\n- 8 min : découverte (5–8 mots ou 1 structure)\n- 7 min : construction / grammaire\n- 8 min : écoute et oral (répéter à voix haute)\n- 5 min : lecture / transfert sur des mots inédits\n\n`;
md += `## Les bilans datés\n\n| Bilan | Vers le | Contenu |\n|---|---|---|\n`;
for (const c of CHECKPOINTS) md += `| ${c.label_fr} | ${short(addDaysUtc(weekStart(start, c.week), 6))} | ${c.content_fr} |\n`;
md += `\n## Les 12 mois\n\n| Mois | Dates | Contenu | Mission | Cible actifs / compris |\n|---|---|---|---|---|\n`;
for (const m of MONTHLY_TARGETS) {
  const s = weekStart(start, m.weeks[0]);
  const e = addDaysUtc(weekStart(start, m.weeks[1]), 6);
  md += `| ${m.month} | ${short(s)} → ${short(e)} | ${m.content_fr} | ${m.mission_fr} | ${m.active} / ${m.receptive} |\n`;
}
md += `\n## Semaine par semaine\n\n| Sem. | Du → au | Mois | Focus | Heures cumulées prévues | Mots actifs / compris attendus |\n|---|---|---|---|---|---|\n`;
for (let w = 1; w <= 52; w++) {
  const s = weekStart(start, w);
  const m = monthForWeek(w);
  const cp = CHECKPOINTS.find((c) => c.week === w);
  const focus = (MONTH1[w] ?? (w === m.weeks[0] ? `Début du mois ${m.month} : ${m.content_fr}` : `Mois ${m.month} : ${m.mission_fr}`)) + (cp && !MONTH1[w] ? ` **${cp.label_fr}.**` : '');
  const exp = expectedLemmas(w);
  md += `| ${w} | ${short(s)} → ${short(addDaysUtc(s, 6))} | ${m.month} | ${focus} | ${Math.round((weekly * w) / 60)} h | ${exp.active} / ${exp.receptive} |\n`;
}
md += `\n## Ce qui est déjà disponible dans l’application\n\n`;
md += `- Mois 1 complet : ${UNITS.length} unités (A0-01 à A0-${String(UNITS.length).padStart(2, '0')}), alphabet, dialogue guidé au café, dictionnaire de 8 300 mots, mode hors ligne.\n`;
md += `- Les mois 2 à 12 seront ajoutés au fur et à mesure, dans l’ordre des cas du référentiel russe pour étrangers (prépositionnel → accusatif → génitif → datif → instrumental), avant que tu y arrives.\n`;
md += `\n_Objectifs indicatifs, inspirés du CECRL, sans valeur de certification. Plan généré automatiquement ; l’application recalcule ta position chaque jour._\n`;
writeFileSync('docs/PLAN_12_MOIS.md', md);
console.log('docs/PLAN_12_MOIS.md écrit.');
