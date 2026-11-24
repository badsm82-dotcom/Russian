/** Profil apprenant, réglages et profil linguistique (§2.1, §3, §13 ; API §2.3 et §16). */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LANGUAGE_NAMES_FR, PROFICIENCY_VALUES, type LearnerSettings, type Proficiency } from '@r365/domain';
import type { AppContext } from '../context.js';
import { appendEvent, withTx } from '../db.js';
import { badRequest } from '../errors.js';
import { loadProfile } from '../learner-state.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';

const settingsPatch = z
  .object({
    daily_minutes: z.union([z.literal(5), z.literal(15), z.literal(25), z.literal(35), z.literal(60)]),
    days_per_week: z.number().int().min(1).max(7),
    preferred_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).transform((t) => t.slice(0, 5)).nullable(),
    timezone: z.string().min(1).max(64),
    interests: z.array(z.string().trim().min(1).max(60)).max(30),
    personal_context_enabled: z.boolean(),
    microphone_consent: z.boolean(),
    transliteration: z.enum(['auto', 'always', 'never']),
    show_stress_marks: z.boolean(),
    correction_timing: z.enum(['after_turn', 'end_of_dialogue']),
    font_scale: z.number().min(0.8).max(1.8),
    theme: z.enum(['system', 'light', 'dark']),
    notifications_enabled: z.boolean(),
    bridges_enabled: z.boolean(),
    audio_rate: z.union([z.literal(0.75), z.literal(0.9), z.literal(1), z.literal(1.15)]),
    manual_difficulty: z.enum(['auto', 'easier', 'harder']),
    goal_start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  })
  .partial()
  .strict();

const profilePatch = z.object({ settings: settingsPatch.optional(), onboarded: z.boolean().optional(), consent_version: z.string().max(20).optional() }).strict();

const LANG_CODES = ['fr', 'en', 'de', 'pt', 'es', 'it', 'ro'] as const;
const languagesPatch = z
  .object({
    known_languages: z
      .array(
        z.object({
          code: z.enum(LANG_CODES),
          proficiency: z.enum(PROFICIENCY_VALUES as [Proficiency, ...Proficiency[]]),
          bridges_enabled: z.boolean(),
        }),
      )
      .max(10),
  })
  .strict();

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat('fr', { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function registerProfile(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/profile', async (req) => {
    const userId = requireUser(req);
    const p = await loadProfile(ctx.db, userId);
    const u = await ctx.db.query<{ email: string; consent_version: string | null; created_at: Date }>(
      'SELECT email, consent_version, created_at FROM users WHERE id = $1',
      [userId],
    );
    return { user_id: userId, email: u.rows[0]?.email, consent_version: u.rows[0]?.consent_version ?? null, ...p, language_names_fr: LANGUAGE_NAMES_FR };
  });

  app.patch('/v1/profile', async (req) => {
    const userId = requireUser(req);
    const body = parse(profilePatch, req.body);
    if (body.settings?.timezone && !isValidTimeZone(body.settings.timezone)) throw badRequest('Fuseau horaire inconnu');
    return withTx(ctx.db, async (tx) => {
      const p = await loadProfile(tx, userId);
      const settings: LearnerSettings = { ...p.settings, ...(body.settings ?? {}) } as LearnerSettings;
      await tx.query(
        'UPDATE learner_profiles SET settings = $2, interests = $3, daily_minutes = $4, onboarded = $5, updated_at = now() WHERE user_id = $1',
        [userId, JSON.stringify(settings), JSON.stringify(settings.interests), settings.daily_minutes, body.onboarded ?? p.onboarded],
      );
      if (body.settings?.timezone) await tx.query('UPDATE users SET timezone = $2 WHERE id = $1', [userId, settings.timezone]);
      if (body.consent_version) await tx.query('UPDATE users SET consent_version = $2 WHERE id = $1', [userId, body.consent_version]);
      await appendEvent(tx, userId, 'profile.updated', { fields: Object.keys(body.settings ?? {}) });
      return { ...p, settings, interests: settings.interests, daily_minutes: settings.daily_minutes, onboarded: body.onboarded ?? p.onboarded };
    });
  });

  app.get('/v1/profile/languages', async (req) => {
    const userId = requireUser(req);
    const p = await loadProfile(ctx.db, userId);
    return { ...p.languages, bridges_enabled: p.settings.bridges_enabled, language_names_fr: LANGUAGE_NAMES_FR };
  });

  app.patch('/v1/profile/languages', async (req) => {
    const userId = requireUser(req);
    const body = parse(languagesPatch, req.body);
    const codes = body.known_languages.map((l) => l.code);
    if (new Set(codes).size !== codes.length) throw badRequest('Langue en double');
    return withTx(ctx.db, async (tx) => {
      const p = await loadProfile(tx, userId);
      const languages = { ...p.languages, known_languages: body.known_languages };
      await tx.query('UPDATE learner_profiles SET languages = $2, updated_at = now() WHERE user_id = $1', [userId, JSON.stringify(languages)]);
      await appendEvent(tx, userId, 'profile.languages_updated', { known_languages: body.known_languages });
      return { ...languages, bridges_enabled: p.settings.bridges_enabled, language_names_fr: LANGUAGE_NAMES_FR };
    });
  });
}
