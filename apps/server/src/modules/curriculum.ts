/** Curriculum (§4) : parcours annuel indicatif, unités disponibles, alphabet. */
import type { FastifyInstance } from 'fastify';
import { LETTERS } from '@r365/content';
import { currentUnit, reachableUnitOrder, unitCompleted } from '@r365/domain';
import type { AppContext } from '../context.js';
import { loadStates, loadTaught } from '../learner-state.js';
import { requireUser } from './auth.js';

/** Repères mensuels (§4) : indicatifs, jamais des verrous calendaires. */
export const ROADMAP = [
  { month: 1, weeks: '1–4', content_fr: 'Alphabet, accent tonique, sons durs/mous, salutations, pronoms, présent de verbes fréquents, absence de copule', mission_fr: 'Lire 20 mots nouveaux décodables, se présenter 30–60 s', active: 100, receptive: 180 },
  { month: 2, weeks: '5–8', content_fr: 'Genre, pluriel, nombres, questions, négation, accusatif courant, у меня есть', mission_fr: 'Commander, parler de la famille 2 min', active: 220, receptive: 380 },
  { month: 3, weeks: '9–13', content_fr: 'Passé, futur composé, prépositionnel, lieu et temps, adjectifs simples', mission_fr: 'Raconter hier, lire 80–120 mots', active: 350, receptive: 600 },
  { month: 4, weeks: '14–17', content_fr: 'Génitif fréquent, quantités, absence, origine, accord des adjectifs', mission_fr: 'Faire des achats, comprendre un dialogue 2 min', active: 480, receptive: 800 },
  { month: 5, weeks: '18–21', content_fr: 'Datif, besoins, goûts, destinataire, modaux, futur perfectif courant', mission_fr: 'Inviter, proposer, expliquer un besoin', active: 620, receptive: 1000 },
  { month: 6, weeks: '22–26', content_fr: 'Instrumental, professions, accompagnement, aspects verbaux introductifs', mission_fr: 'Conversation guidée 5 min, texte de 150–250 mots', active: 750, receptive: 1250 },
  { month: 7, weeks: '27–30', content_fr: 'Verbes de mouvement идти/ходить, ехать/ездить, directions', mission_fr: 'Organiser un trajet, lire une histoire courte', active: 880, receptive: 1450 },
  { month: 8, weeks: '31–34', content_fr: 'Aspect en contexte, impératif, comparaison, connecteurs', mission_fr: 'Raconter un événement, demander des précisions', active: 1000, receptive: 1650 },
  { month: 9, weeks: '35–39', content_fr: 'Subordination simple, потому что, если, когда, который', mission_fr: 'Conversation 7–8 min et résumé de chapitre', active: 1130, receptive: 1850 },
  { month: 10, weeks: '40–43', content_fr: 'Consolidation des cas, préfixes de mouvement usuels, registre tu/vous', mission_fr: 'Présenter un projet, négocier un prix simple', active: 1260, receptive: 2050 },
  { month: 11, weeks: '44–47', content_fr: 'Lecture extensive, inférences, narration, reformulation', mission_fr: 'Lire plusieurs chapitres, discuter 10 min', active: 1380, receptive: 2250 },
  { month: 12, weeks: '48–52', content_fr: 'Révision ciblée, conversation spontanée, lecture autonome', mission_fr: 'Examen final, livre gradué de 3 000–8 000 mots', active: 1500, receptive: 2500 },
];

export function registerCurriculum(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/curriculum', async (req) => {
    const userId = requireUser(req);
    const [taught, states] = await Promise.all([loadTaught(ctx.db, ctx.content, userId), loadStates(ctx.db, ctx.content, userId)]);
    const cur = currentUnit({ units: ctx.content.units, taught, states, alphabetExitPassed: false });
    const reachable = reachableUnitOrder({ units: ctx.content.units, taught, states });
    const units = ctx.content.units.map((u) => ({
      id: u.id,
      order: u.order,
      level: u.level,
      title_fr: u.title_fr,
      mission_fr: u.mission_fr,
      items_total: u.items.length,
      items_taught: u.items.filter((i) => taught.has(i)).length,
      exercises: ctx.content.exercises.filter((e) => e.unit_id === u.id).length,
      completed: unitCompleted(u, taught, states),
      current: cur.unit?.id === u.id,
      locked: u.order > reachable,
    }));
    return {
      units,
      roadmap: ROADMAP.map((m) => ({ ...m, content_available: m.month === 1 ? 'partial' : 'not_yet' })),
      note_fr:
        'Les semaines sont des repères, pas des verrous : on passe à la suite quand les prérequis sont consolidés. Contenu disponible : semaine 1 (alphabet et premières formules) ; le reste du parcours annuel est à produire et à valider.',
    };
  });

  app.get('/v1/alphabet', async (req) => {
    const userId = requireUser(req);
    const [taught, states] = await Promise.all([loadTaught(ctx.db, ctx.content, userId), loadStates(ctx.db, ctx.content, userId)]);
    return {
      letters: LETTERS.map((l) => {
        const id = `letter:${l.lower}`;
        const st = states.filter((s) => s.item_id === id);
        return {
          upper: l.upper,
          lower: l.lower,
          group: l.group,
          sound_label_fr: l.sound_label_fr,
          sound_fr: l.sound_fr,
          approximation: l.approximation,
          latin_trap_fr: l.latin_trap_fr ?? null,
          examples: l.examples,
          taught: taught.has(id),
          recognition_stage: st.find((s) => s.competency === 'recognition')?.stage ?? null,
          recall_stage: st.find((s) => s.competency === 'recall')?.stage ?? null,
        };
      }),
    };
  });
}
