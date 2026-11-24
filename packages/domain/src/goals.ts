/**
 * Objectifs et calendrier (§1, §4, §12) : 52 semaines, ~35 min × 6 jours (≈ 182 h), repères mensuels
 * et contrôles indépendants datés. Les semaines sont des repères, jamais des verrous : en cas de retard,
 * on préserve les acquis essentiels plutôt que de comprimer artificiellement (§4).
 */
import { localDayKey } from './mastery.js';

export interface MonthTarget {
  month: number;
  weeks: [number, number];
  content_fr: string;
  mission_fr: string;
  active: number;
  receptive: number;
}

/** Repères mensuels du cahier des charges (§4). */
export const MONTHLY_TARGETS: readonly MonthTarget[] = [
  { month: 1, weeks: [1, 4], content_fr: 'Alphabet, accent tonique, sons durs/mous, salutations, pronoms, présent de verbes fréquents, absence de copule', mission_fr: 'Lire 20 mots nouveaux décodables, se présenter 30–60 s', active: 100, receptive: 180 },
  { month: 2, weeks: [5, 8], content_fr: 'Genre, pluriel, nombres, questions, négation, accusatif courant, у меня есть', mission_fr: 'Commander, parler de la famille 2 min', active: 220, receptive: 380 },
  { month: 3, weeks: [9, 13], content_fr: 'Passé, futur composé, prépositionnel, lieu et temps, adjectifs simples', mission_fr: 'Raconter hier, lire 80–120 mots', active: 350, receptive: 600 },
  { month: 4, weeks: [14, 17], content_fr: 'Génitif fréquent, quantités, absence, origine, accord des adjectifs', mission_fr: 'Faire des achats, comprendre un dialogue 2 min', active: 480, receptive: 800 },
  { month: 5, weeks: [18, 21], content_fr: 'Datif, besoins, goûts, destinataire, modaux, futur perfectif courant', mission_fr: 'Inviter, proposer, expliquer un besoin', active: 620, receptive: 1000 },
  { month: 6, weeks: [22, 26], content_fr: 'Instrumental, professions, accompagnement, aspects verbaux introductifs', mission_fr: 'Conversation guidée 5 min, texte de 150–250 mots', active: 750, receptive: 1250 },
  { month: 7, weeks: [27, 30], content_fr: 'Verbes de mouvement идти/ходить, ехать/ездить, directions', mission_fr: 'Organiser un trajet, lire une histoire courte', active: 880, receptive: 1450 },
  { month: 8, weeks: [31, 34], content_fr: 'Aspect en contexte, impératif, comparaison, connecteurs', mission_fr: 'Raconter un événement, demander des précisions', active: 1000, receptive: 1650 },
  { month: 9, weeks: [35, 39], content_fr: 'Subordination simple, потому что, если, когда, который', mission_fr: 'Conversation 7–8 min et résumé de chapitre', active: 1130, receptive: 1850 },
  { month: 10, weeks: [40, 43], content_fr: 'Consolidation des cas, préfixes de mouvement usuels, registre tu/vous', mission_fr: 'Présenter un projet, négocier un prix simple', active: 1260, receptive: 2050 },
  { month: 11, weeks: [44, 47], content_fr: 'Lecture extensive, inférences, narration, reformulation', mission_fr: 'Lire plusieurs chapitres, discuter 10 min', active: 1380, receptive: 2250 },
  { month: 12, weeks: [48, 52], content_fr: 'Révision ciblée, conversation spontanée, lecture autonome', mission_fr: 'Examen final, livre gradué de 3 000–8 000 mots', active: 1500, receptive: 2500 },
];

/** Contrôles indépendants (§12) : semaine de passage indicative. */
export const CHECKPOINTS: readonly { id: string; week: number; label_fr: string; content_fr: string }[] = [
  { id: 'alphabet', week: 2, label_fr: 'J7–J14 · Alphabet', content_fr: 'Lettres et mots inédits, sans aide (≥ 90 % reconnaissance, ≥ 80 % décodage).' },
  { id: 'M1', week: 4, label_fr: 'Bilan M1', content_fr: 'Décodage, se présenter, compréhension audio élémentaire.' },
  { id: 'M3', week: 13, label_fr: 'Bilan M3', content_fr: 'Dialogue 3 min, texte de 100 mots, questions simples.' },
  { id: 'M6', week: 26, label_fr: 'Bilan M6', content_fr: 'Dialogue 5 min, texte de 250 mots, rappel différé.' },
  { id: 'M9', week: 39, label_fr: 'Bilan M9', content_fr: 'Dialogue 8 min, chapitre de 400 mots, résumé.' },
  { id: 'M12', week: 52, label_fr: 'Bilan final M12', content_fr: 'Conversation 10–15 min, chapitre inédit, bilan du livre gradué.' },
];

/** Rythme hebdomadaire (§4). */
export const WEEKLY_RHYTHM_FR: readonly string[] = [
  'J1 découverte', 'J2 construction', 'J3 écoute et prononciation', 'J4 transfert', 'J5 lecture et conversation', 'J6 évaluation et consolidation', 'J7 repos ou immersion',
];

export const PLAN_TOTAL_HOURS = 182;
const DAY = 86_400_000;

export function addDaysUtc(d: Date, n: number): Date {
  return new Date(d.getTime() + n * DAY);
}

/** Lundi… : début de la semaine n (1 = semaine du départ). */
export function weekStart(start: Date, week: number): Date {
  return addDaysUtc(start, (week - 1) * 7);
}

export function monthForWeek(week: number): MonthTarget {
  return MONTHLY_TARGETS.find((m) => week >= m.weeks[0] && week <= m.weeks[1]) ?? MONTHLY_TARGETS[MONTHLY_TARGETS.length - 1]!;
}

/** Cible cumulée attendue à une semaine donnée (interpolation linéaire entre les fins de mois). */
export function expectedLemmas(week: number): { active: number; receptive: number } {
  let prev = { week: 0, active: 0, receptive: 0 };
  for (const m of MONTHLY_TARGETS) {
    const end = m.weeks[1];
    if (week <= end) {
      const t = (week - prev.week) / (end - prev.week);
      return { active: Math.round(prev.active + t * (m.active - prev.active)), receptive: Math.round(prev.receptive + t * (m.receptive - prev.receptive)) };
    }
    prev = { week: end, active: m.active, receptive: m.receptive };
  }
  return { active: 1500, receptive: 2500 };
}

export interface ActivityDay {
  day: string; // AAAA-MM-JJ, fuseau de l'apprenant
  active_minutes: number;
}

export interface GoalInput {
  start: Date;
  now: Date;
  timeZone: string;
  daily_minutes: number;
  days_per_week: number;
  activity: readonly ActivityDay[];
  active_lemmas: number;
  receptive_lemmas: number;
  alphabet_passed: boolean;
  /** Le contenu disponible ne couvre que jusqu'à ce mois (cibles lexicales inatteignables au-delà). */
  content_available_until_month: number;
}

export type PaceStatus = 'not_started' | 'ahead' | 'on_track' | 'slightly_behind' | 'behind';

export interface GoalReport {
  start_date: string;
  week: number;
  weeks_total: 52;
  month: MonthTarget;
  this_week: { start: string; end: string; target_days: number; done_days: number; target_minutes: number; done_minutes: number };
  totals: { hours_done: number; hours_planned_to_date: number; hours_plan: number; days_practiced: number };
  pace: { status: PaceStatus; ratio: number | null; label_fr: string };
  lemmas: { expected_active: number; expected_receptive: number; active: number; receptive: number; note_fr: string };
  projection: { weekly_minutes_recent: number; estimated_end_date: string | null; note_fr: string };
  checkpoints: { id: string; label_fr: string; content_fr: string; date: string; state: 'done' | 'due' | 'upcoming' | 'past' }[];
  next_steps_fr: string[];
}

const iso = (d: Date) => d.toISOString().slice(0, 10);

export function goalReport(g: GoalInput): GoalReport {
  const startKey = localDayKey(g.start, g.timeZone);
  const start = new Date(`${startKey}T00:00:00Z`);
  const todayKey = localDayKey(g.now, g.timeZone);
  const today = new Date(`${todayKey}T00:00:00Z`);
  const daysSince = Math.max(0, Math.floor((today.getTime() - start.getTime()) / DAY));
  const week = Math.floor(daysSince / 7) + 1;
  const month = monthForWeek(Math.min(week, 52));
  const wStart = weekStart(start, week);
  const wEnd = addDaysUtc(wStart, 6);
  const inWeek = g.activity.filter((a) => a.day >= iso(wStart) && a.day <= iso(wEnd));
  const doneMinutesWeek = Math.round(inWeek.reduce((s, a) => s + a.active_minutes, 0));
  const doneDaysWeek = inWeek.filter((a) => a.active_minutes > 0).length;
  const hoursDone = g.activity.reduce((s, a) => s + a.active_minutes, 0) / 60;
  const weeklyPlanMinutes = g.daily_minutes * g.days_per_week;
  // Prévu à date : semaines complètes écoulées + prorata de la semaine en cours.
  const plannedToDate = ((daysSince / 7) * weeklyPlanMinutes) / 60;

  let status: PaceStatus;
  let ratio: number | null = null;
  if (hoursDone === 0) status = 'not_started';
  else if (plannedToDate < 0.25) status = 'on_track';
  else {
    ratio = hoursDone / plannedToDate;
    status = ratio >= 1.1 ? 'ahead' : ratio >= 0.85 ? 'on_track' : ratio >= 0.6 ? 'slightly_behind' : 'behind';
  }
  const PACE_FR: Record<PaceStatus, string> = {
    not_started: 'Pas encore commencé : la première séance ne demande aucune connaissance du russe.',
    ahead: 'En avance sur le temps de pratique prévu.',
    on_track: 'Dans les temps.',
    slightly_behind: 'Un peu en retard : une ou deux séances courtes en plus cette semaine suffisent.',
    behind: 'En retard : on consolide l’essentiel, sans comprimer le programme (les dates se décalent).',
  };

  // Rythme récent (4 dernières semaines) → date d'arrivée estimée des 182 h.
  const fourWeeksAgo = iso(addDaysUtc(today, -27));
  const recentMinutes = g.activity.filter((a) => a.day >= fourWeeksAgo).reduce((s, a) => s + a.active_minutes, 0);
  const recentDays = Math.min(28, daysSince + 1);
  const weeklyRecent = recentDays > 0 ? (recentMinutes / recentDays) * 7 : 0;
  const remainingMin = Math.max(0, PLAN_TOTAL_HOURS * 60 - hoursDone * 60);
  // Estimation seulement après une semaine complète : avant, une seule séance fausserait la projection.
  const estEnd = daysSince >= 7 && weeklyRecent > 1 ? iso(addDaysUtc(today, Math.ceil((remainingMin / weeklyRecent) * 7))) : null;

  const exp = expectedLemmas(Math.min(week, 52));
  const lemmaNote =
    month.month > g.content_available_until_month
      ? `Le contenu disponible s’arrête au mois ${g.content_available_until_month} : la cible lexicale de ce mois ne peut pas encore être atteinte.`
      : 'Vocabulaire actif = rappel autonome sur 3 jours distincts dont un après 14 jours : il progresse avec un décalage de deux semaines, c’est normal.';

  const checkpoints = CHECKPOINTS.map((c) => {
    const date = iso(addDaysUtc(weekStart(start, c.week), 6));
    let state: 'done' | 'due' | 'upcoming' | 'past';
    if (c.id === 'alphabet' && g.alphabet_passed) state = 'done';
    else if (week === c.week || (week > c.week && week <= c.week + 1)) state = 'due';
    else if (week > c.week) state = 'past';
    else state = 'upcoming';
    return { ...c, date, state };
  });

  const next: string[] = [];
  const leftDays = Math.max(0, g.days_per_week - doneDaysWeek);
  const leftMin = Math.max(0, weeklyPlanMinutes - doneMinutesWeek);
  if (leftDays > 0) next.push(`Cette semaine : encore ${leftDays} jour(s) de pratique et environ ${leftMin} min pour tenir l’objectif.`);
  else next.push('Objectif de la semaine atteint : le 7e jour est pour le repos ou l’immersion (musique, vidéo).');
  if (status === 'behind' || status === 'slightly_behind') next.push('Privilégier les révisions dues : elles consolident ce qui est appris avant d’ajouter du nouveau.');
  const due = checkpoints.find((c) => c.state === 'due');
  if (due) next.push(`${due.label_fr} à faire maintenant : ${due.content_fr}`);
  else {
    const up = checkpoints.find((c) => c.state === 'upcoming');
    if (up) next.push(`Prochain bilan : ${up.label_fr}, vers le ${up.date}.`);
  }

  return {
    start_date: iso(start),
    week,
    weeks_total: 52,
    month,
    this_week: { start: iso(wStart), end: iso(wEnd), target_days: g.days_per_week, done_days: doneDaysWeek, target_minutes: weeklyPlanMinutes, done_minutes: doneMinutesWeek },
    totals: { hours_done: Math.round(hoursDone * 10) / 10, hours_planned_to_date: Math.round(plannedToDate * 10) / 10, hours_plan: PLAN_TOTAL_HOURS, days_practiced: g.activity.filter((a) => a.active_minutes > 0).length },
    pace: { status, ratio: ratio === null ? null : Math.round(ratio * 100) / 100, label_fr: PACE_FR[status] },
    lemmas: { expected_active: exp.active, expected_receptive: exp.receptive, active: g.active_lemmas, receptive: g.receptive_lemmas, note_fr: lemmaNote },
    projection: {
      weekly_minutes_recent: Math.round(weeklyRecent),
      estimated_end_date: estEnd,
      note_fr: estEnd ? `À ton rythme récent (${Math.round(weeklyRecent)} min/semaine), les ${PLAN_TOTAL_HOURS} h du programme seraient atteintes vers le ${estEnd}.` : 'Estimation de la date d’arrivée disponible après une semaine de pratique.',
    },
    checkpoints,
    next_steps_fr: next,
  };
}
