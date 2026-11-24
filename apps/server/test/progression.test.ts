import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, playSession, register, setupEnv, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupEnv();
});
afterAll(async () => {
  await env?.close();
});

describe('Progression sur tout le mois 1 (unités A0-01 → A0-12)', () => {
  it('un apprenant régulier atteint le dialogue guidé sans jamais rencontrer un prérequis non enseigné', async () => {
    const c = api(env, await register(env));
    const seen = new Set<string>();
    for (let day = 0; day < 40; day++) {
      const s = (await c.post('/v1/sessions', { minutes: 60 })).body.session;
      if (s.unit_id) seen.add(s.unit_id);
      await playSession(env, c, s.id, undefined, { stepMs: 15_000 }); // lève une erreur sur tout 409
      await c.post(`/v1/sessions/${s.id}/complete`);
      const cur = (await c.get('/v1/curriculum')).body.units;
      if (cur.find((u: any) => u.id === 'A0-12')?.items_taught === 1) break;
      env.clock.advance(24 * 3600_000);
    }
    const units = (await c.get('/v1/curriculum')).body.units;
    expect(units.find((u: any) => u.id === 'A0-12').items_taught).toBe(1);
    expect(seen.has('A0-08')).toBe(true);
  }, 240_000);
});
