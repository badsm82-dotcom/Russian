/** Lecture de phrases réelles (Tatoeba, CC BY 2.0 FR) composées uniquement de formes déjà apprises (§11, ≥ 95 %). */
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { LEXEMES, SOURCES_LICENSES, sentencesForKnown } from '@r365/content';
import { lettersInText, normalizeAnswer, stripStressMarks } from '@r365/domain';
import type { AppContext } from '../context.js';
import { loadTaught } from '../learner-state.js';
import { parse } from '../validation.js';
import { requireUser } from './auth.js';

export function registerReading(app: FastifyInstance, ctx: AppContext): void {
  app.get('/v1/reading/sentences', async (req) => {
    const userId = requireUser(req);
    const { limit } = parse(z.object({ limit: z.coerce.number().int().min(1).max(60).default(25) }), req.query);
    const taught = await loadTaught(ctx.db, ctx.content, userId);
    const letters = new Set([...taught].filter((t) => t.startsWith('letter:')).map((t) => t.slice(7)));
    const known = new Set<string>();
    for (const x of LEXEMES) {
      if (!taught.has(x.item_id)) continue;
      for (const t of [x.ru, ...x.accepted, ...x.examples.map((e) => e.ru)]) for (const w of stripStressMarks(t).match(/[а-яё-]+/gi) ?? []) known.add(normalizeAnswer(w));
    }
    const readable = sentencesForKnown(known, { limit: 400 }).filter((s) => [...lettersInText(s.ru)].every((l) => letters.has(l)));
    return {
      known_words: known.size,
      license: SOURCES_LICENSES.tatoeba,
      sentences: readable.slice(0, limit),
      note_fr: readable.length
        ? 'Phrases authentiques écrites par des locuteurs (Tatoeba), composées uniquement de mots que tu as appris. Traductions non relues.'
        : 'Pas encore assez de mots appris pour lire des phrases réelles : continue les séances.',
    };
  });
}
