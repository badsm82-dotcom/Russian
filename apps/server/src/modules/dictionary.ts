/** Dictionnaire (§13 « dictionnaire personnel ») : recherche dans OpenRussian (CC BY-SA 4.0). */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DICTIONARY_SOURCE, lookup, wordConcept } from '@r365/content';
import { bridgeReviews, userCatalog } from './bridges.js';
import type { AppContext } from '../context.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';

const q = z.object({ q: z.string().trim().min(1).max(60) });

const POS_FR: Record<string, string> = { noun: 'nom', verb: 'verbe', adjective: 'adjectif', other: 'autre' };
const GENDER_FR: Record<string, string> = { m: 'masculin', f: 'féminin', n: 'neutre' };
const ASPECT_FR: Record<string, string> = { imperfective: 'imperfectif', perfective: 'perfectif', both: 'bi-aspectuel' };

export function registerDictionary(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/dictionary', async (req) => {
    const userId = requireUser(req);
    const { q: query } = parse(q, req.query);
    // Passerelles VALIDÉES (par le contenu ou par l'apprenant) rattachées au mot : ex. пляж ← plage.
    const catalog = userCatalog(ctx.content.bridges, await bridgeReviews(ctx, userId)).filter((b) => b.validation_status === 'validated');
    return {
      query,
      source: DICTIONARY_SOURCE,
      results: lookup(query).map((h) => ({
        lemma: h.entry.b,
        accented: h.entry.a,
        pos: h.entry.p,
        pos_fr: POS_FR[h.entry.p] ?? h.entry.p,
        gender_fr: h.entry.g ? GENDER_FR[h.entry.g] ?? null : null,
        aspect_fr: h.entry.asp ? ASPECT_FR[h.entry.asp] ?? h.entry.asp : null,
        aspect_partner: h.entry.pa || null,
        rank: h.entry.r,
        en: h.entry.en,
        de: h.entry.de,
        forms: h.entry.f ?? {},
        match: h.match,
        matched_form: h.matched_form ?? null,
        bridges: catalog
          .filter((b) => b.concept_id === wordConcept(h.entry.b))
          .map((b) => ({ source_language: b.source_language, source_expression: b.source_expression, explanation_fr: b.explanation_fr, limitations_fr: b.limitations_fr })),
      })),
    };
  });
}
