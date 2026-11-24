import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { LETTERS } from '@r365/content';
import { api, register, setupEnv, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupEnv();
});
afterAll(async () => {
  await env?.close();
});

async function teachAllLetters(userId: string) {
  for (const l of LETTERS) {
    await env.db.query('INSERT INTO taught_items (user_id, item_id, taught_at) VALUES ($1,$2,now()) ON CONFLICT DO NOTHING', [userId, env.content.itemUuid(`letter:${l.lower}`)]);
  }
}

describe('Bilan alphabet sans aide (§5, §12, AC10)', () => {
  it('fermé tant que les 33 lettres ne sont pas présentées', async () => {
    const c = api(env, await register(env));
    const a = (await c.get('/v1/assessments')).body.available[0];
    expect(a).toMatchObject({ id: 'alphabet', ready: false });
    expect((await c.post('/v1/assessments/alphabet/start')).status).toBe(409);
  });

  it('sujet sans corrigé ni indice, réponses enregistrées sans retour, note à la remise, objectifs mis à jour', async () => {
    const c = api(env, await register(env));
    const userId = (await c.get('/v1/profile')).body.user_id;
    await teachAllLetters(userId);
    const start = await c.post('/v1/assessments/alphabet/start');
    expect(start.status).toBe(201);
    const run = start.body.run;
    expect(run.tasks).toHaveLength(30);
    expect(JSON.stringify(run.tasks)).not.toMatch(/"answer"|"correct"|"accepted"|"variants"/);
    expect(run.tasks.every((t: any) => t.exercise.hints.length === 0)).toBe(true);
    // Reprise : même sujet.
    expect((await c.post('/v1/assessments/alphabet/start')).body.run.id).toBe(run.id);

    const spec = (await env.db.query('SELECT spec FROM assessment_runs WHERE id = $1', [run.id])).rows[0].spec;
    for (const t of spec.tasks) {
      const a = t.exercise.answer;
      const r = await c.post(`/v1/assessments/runs/${run.id}/answers`, { task_index: t.index, answer: a.kind === 'choice' ? { choice_id: a.correct } : { text: a.variants[0] } });
      expect(r.body).toMatchObject({ saved: true });
      expect(JSON.stringify(r.body)).not.toMatch(/correct|accepted/);
    }
    const done = (await c.post(`/v1/assessments/runs/${run.id}/submit`)).body.run;
    expect(done.state).toBe('submitted');
    expect(done.result.passed).toBe(true);
    expect(done.result.parts.map((p: any) => p.rate)).toEqual([1, 1]);
    // Idempotent ; plus de réponse possible.
    expect((await c.post(`/v1/assessments/runs/${run.id}/submit`)).body.run.result.passed).toBe(true);
    expect((await c.post(`/v1/assessments/runs/${run.id}/answers`, { task_index: 0, answer: { dont_know: true } })).status).toBe(409);
    expect((await c.get('/v1/goals')).body.checkpoints[0].state).toBe('done');

    // Nouveau passage = sujet différent.
    const run2 = (await c.post('/v1/assessments/alphabet/start')).body.run;
    expect(run2.id).not.toBe(run.id);
    expect(JSON.stringify(run2.tasks.map((t: any) => t.exercise.stimulus))).not.toBe(JSON.stringify(run.tasks.map((t: any) => t.exercise.stimulus)));
    const fail = (await c.post(`/v1/assessments/runs/${run2.id}/submit`)).body.run;
    expect(fail.result.passed).toBe(false);
    expect(fail.result.recommendation_fr).toMatch(/Pas encore/);
  });

  it('un compte ne peut pas lire le bilan d’un autre', async () => {
    const a = api(env, await register(env));
    const b = api(env, await register(env));
    await teachAllLetters((await a.get('/v1/profile')).body.user_id);
    const run = (await a.post('/v1/assessments/alphabet/start')).body.run;
    expect((await b.get(`/v1/assessments/runs/${run.id}`)).status).toBe(404);
    expect((await b.post(`/v1/assessments/runs/${run.id}/submit`)).status).toBe(404);
  });
});
