import type { z } from 'zod';
import { badRequest } from './errors.js';

/** Validation stricte des charges utiles (§16). */
export function parse<T extends z.ZodType>(schema: T, input: unknown): z.infer<T> {
  const r = schema.safeParse(input ?? {});
  if (!r.success) {
    throw badRequest(
      'Requête invalide',
      r.error.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
  }
  return r.data;
}
