/**
 * Registre de contenu : charge le contenu versionné de @r365/content, fournit les correspondances
 * slug ↔ UUID et le synchronise en base (versions d'exercices immuables pour l'audit, §15).
 */
import { isDeepStrictEqual } from 'node:util';
import {
  ALL_LETTERS,
  BRIDGES,
  EXERCISES,
  FRENCH_LOAN_BRIDGES,
  SPEAKABLE_ITEMS,
  TEACH_CARDS,
  UNITS,
  uuidFromSlug,
  validateContent,
  type TeachCard,
} from '@r365/content';
import type { ExerciseDef, LanguageBridge, UnitDef } from '@r365/domain';
import type { Db } from './db.js';

export interface ContentRegistry {
  units: UnitDef[];
  exercises: ExerciseDef[];
  exerciseById: Map<string, ExerciseDef>;
  exerciseBySlug: Map<string, ExerciseDef>;
  cards: Map<string, TeachCard>;
  bridges: LanguageBridge[];
  letters: readonly string[];
  speakable: ReadonlySet<string>;
  itemUuid(slug: string): string;
  itemSlug(uuid: string): string | undefined;
  itemUnit: Map<string, string>;
}

export function loadContent(opts: { allowPending: boolean }): ContentRegistry {
  const errors = validateContent({ units: UNITS, exercises: EXERCISES, cards: TEACH_CARDS, bridges: BRIDGES, letters: ALL_LETTERS }).filter(
    (i) => i.level === 'error',
  );
  if (errors.length) throw new Error(`Contenu invalide : ${errors.map((e) => `${e.ref} ${e.message}`).join('; ')}`);
  const usable = (s: string) => s === 'validated' || (opts.allowPending && s === 'pending_review');
  const exercises = EXERCISES.filter((e) => usable(e.status));
  const cards = new Map(TEACH_CARDS.filter((c) => usable(c.status)).map((c) => [c.item_id, c]));
  const slugToUuid = new Map<string, string>();
  const uuidToSlug = new Map<string, string>();
  const itemUnit = new Map<string, string>();
  for (const u of UNITS)
    for (const it of u.items) {
      const id = uuidFromSlug(`item:${it}`);
      slugToUuid.set(it, id);
      uuidToSlug.set(id, it);
      itemUnit.set(it, u.id);
    }
  return {
    units: UNITS,
    exercises,
    exerciseById: new Map(exercises.map((e) => [e.id, e])),
    exerciseBySlug: new Map(exercises.map((e) => [e.slug, e])),
    cards,
    bridges: [...BRIDGES, ...FRENCH_LOAN_BRIDGES],
    letters: ALL_LETTERS,
    speakable: SPEAKABLE_ITEMS,
    itemUuid(slug) {
      const id = slugToUuid.get(slug);
      if (!id) throw new Error(`Item inconnu : ${slug}`);
      return id;
    },
    itemSlug: (uuid) => uuidToSlug.get(uuid),
    itemUnit,
  };
}

/** Synchronise le contenu en base. Une version d'exercice existante ne peut pas changer : il faut incrémenter la version. */
export async function syncContent(db: Db, content: ContentRegistry): Promise<{ inserted: number }> {
  const client = await db.connect();
  let inserted = 0;
  try {
    await client.query('BEGIN');
    for (const u of content.units) {
      await client.query(
        `INSERT INTO units (id, ord, level, title_fr, payload) VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (id) DO UPDATE SET ord = EXCLUDED.ord, level = EXCLUDED.level, title_fr = EXCLUDED.title_fr, payload = EXCLUDED.payload`,
        [u.id, u.order, u.level, u.title_fr, JSON.stringify(u)],
      );
    }
    for (const card of TEACH_CARDS) {
      const unit = content.itemUnit.get(card.item_id);
      if (!unit) continue;
      await client.query(
        `INSERT INTO knowledge_items (id, slug, type, unit_id, version, status, payload) VALUES ($1,$2,$3,$4,1,$5,$6)
         ON CONFLICT (id) DO UPDATE SET unit_id = EXCLUDED.unit_id, status = EXCLUDED.status, payload = EXCLUDED.payload`,
        [content.itemUuid(card.item_id), card.item_id, card.item_type, unit, card.status, JSON.stringify(card)],
      );
    }
    for (const ex of EXERCISES) {
      const existing = await client.query<{ payload: ExerciseDef }>('SELECT payload FROM exercises WHERE id = $1 AND version = $2', [ex.id, ex.version]);
      if (existing.rowCount) {
        if (!isDeepStrictEqual(JSON.parse(JSON.stringify(existing.rows[0]!.payload)), JSON.parse(JSON.stringify(ex)))) {
          throw new Error(`Exercice ${ex.slug} v${ex.version} modifié sans changement de version (versions immuables).`);
        }
        continue;
      }
      await client.query(
        `INSERT INTO exercises (id, version, slug, item_id, type, competency, unit_id, status, payload) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        [ex.id, ex.version, ex.slug, content.itemUuid(ex.item_id), ex.type, ex.competency, ex.unit_id, ex.status, JSON.stringify(ex)],
      );
      inserted++;
    }
    for (const b of content.bridges) {
      await client.query(
        `INSERT INTO language_bridges (id, version, concept_id, source_language, source_expression, russian_expression, bridge_type,
           elementary, explanation_fr, limitations_fr, validation_status, source_reference)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
         ON CONFLICT (id, version) DO UPDATE SET validation_status = EXCLUDED.validation_status`,
        [b.id, b.version, b.concept_id, b.source_language, b.source_expression, b.russian_expression, b.bridge_type, b.elementary,
          b.explanation_fr, b.limitations_fr, b.validation_status, b.source_reference],
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
  return { inserted };
}
