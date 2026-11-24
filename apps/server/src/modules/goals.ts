/** Objectifs et calendrier personnels : où j'en suis par rapport au programme de 52 semaines. */
import type { FastifyInstance } from 'fastify';
import { CONTENT_MONTHS_AVAILABLE } from '@r365/content';
import {
  activeMastery,
  alphabetExitStatus,
  goalReport,
  isReceptivelyKnown,
  localDayKey,
  MONTHLY_TARGETS,
  WEEKLY_RHYTHM_FR,
  type ActivityDay,
  type HistoryAttempt,
} from '@r365/domain';
import type { AppContext } from '../context.js';
import { isScored, loadAttempts, loadProfile } from '../learner-state.js';
import { requireUser } from './auth.js';
import { letterAttempts } from './sessions.js';
import { assessmentPassed } from './assessments.js';

const MAX_ACTIVE_ATTEMPT_MS = 120_000;
const TEACH_ACTIVE_MIN = 0.5;

export function registerGoals(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/goals', async (req) => {
    const userId = requireUser(req);
    const profile = await loadProfile(ctx.db, userId);
    const tz = profile.settings.timezone;
    const attempts = await loadAttempts(ctx.db, ctx.content, userId);
    const user = await ctx.db.query<{ created_at: Date }>('SELECT created_at FROM users WHERE id = $1', [userId]);
    const taught = await ctx.db.query<{ taught_at: Date }>('SELECT taught_at FROM taught_items WHERE user_id = $1', [userId]);

    const perDay = new Map<string, number>();
    const addMin = (d: Date, m: number) => {
      const k = localDayKey(d, tz);
      perDay.set(k, (perDay.get(k) ?? 0) + m);
    };
    for (const a of attempts) if (a.outcome !== 'abandoned') addMin(a.occurred_at, Math.min(a.duration_ms, MAX_ACTIVE_ATTEMPT_MS) / 60000);
    for (const t of taught.rows) addMin(t.taught_at, TEACH_ACTIVE_MIN);
    const activity: ActivityDay[] = [...perDay].map(([day, active_minutes]) => ({ day, active_minutes }));

    const byItem = new Map<string, HistoryAttempt[]>();
    for (const a of attempts.filter(isScored)) {
      if (a.item_slug.startsWith('letter:')) continue;
      byItem.set(a.item_slug, [...(byItem.get(a.item_slug) ?? []), { competency: a.competency, grade: a.grade ?? 0, assisted: a.assisted, created_at: a.occurred_at, in_context: a.in_context }]);
    }
    let active = 0;
    let receptive = 0;
    for (const h of byItem.values()) {
      if (activeMastery(h, tz).mastered) active++;
      if (isReceptivelyKnown(h, tz)) receptive++;
    }
    const startSetting = profile.settings.goal_start_date;
    const start = startSetting ? new Date(`${startSetting}T12:00:00Z`) : user.rows[0]!.created_at;
    const report = goalReport({
      start,
      now: ctx.clock.now(),
      timeZone: tz,
      daily_minutes: profile.settings.daily_minutes,
      days_per_week: profile.settings.days_per_week,
      activity,
      active_lemmas: active,
      receptive_lemmas: receptive,
      alphabet_passed: (await assessmentPassed(ctx, userId, 'alphabet')) || alphabetExitStatus(letterAttempts(ctx.content, attempts), ctx.content.letters, tz).passed,
      content_available_until_month: CONTENT_MONTHS_AVAILABLE,
    });
    return { ...report, months: MONTHLY_TARGETS, weekly_rhythm_fr: WEEKLY_RHYTHM_FR, content_available_until_month: CONTENT_MONTHS_AVAILABLE };
  });
}
