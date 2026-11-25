import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, correctAnswer, playSession, register, setupEnv, wrongAnswer, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupEnv();
});
afterAll(async () => {
  await env?.close();
});

const DAY = 86_400_000;

describe('Auth et profil A0', () => {
  it('refuse les routes protégées sans jeton (401) et valide strictement les entrées (400)', async () => {
    expect((await env.app.inject({ method: 'GET', url: '/v1/profile' })).statusCode).toBe(401);
    const bad = await env.app.inject({ method: 'POST', url: '/v1/auth/register', payload: { email: 'x', password: '1' } });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error.code).toBe('bad_request');
  });

  it('AC19 : nouveau profil A0 = zéro acquis, évaluations nulles, aucun test obligatoire', async () => {
    const c = api(env, await register(env));
    const p = (await c.get('/v1/profile')).body;
    expect(p.baseline).toMatchObject({ entry_level: 'A0', placement_required: false, letters_mastered: 0, active_lemmas: 0, receptive_lemmas: 0, assessment_scores: null, first_unit: 'A0-01' });
    expect(Object.values(p.baseline.skills).every((v) => v === 'A0')).toBe(true);
    expect(p.settings).toMatchObject({ timezone: 'Europe/Zurich', microphone_consent: false });
    const a = (await c.get('/v1/analytics')).body;
    expect(a.letters.mastered).toBe(0);
    expect(a.skills.every((s: any) => s.score === null)).toBe(true);
  });

  it('F14 recette 1 : sept langues aux niveaux exacts ; PATCH vérifié', async () => {
    const c = api(env, await register(env));
    const l = (await c.get('/v1/profile/languages')).body;
    expect(l.known_languages.map((x: any) => `${x.code}:${x.proficiency}`)).toEqual([
      'fr:fluent', 'en:fluent', 'de:fluent', 'pt:fluent', 'es:functional_communication', 'it:functional_communication', 'ro:A2',
    ]);
    expect((await c.patch('/v1/profile/languages', { known_languages: [{ code: 'fr', proficiency: 'C9', bridges_enabled: true }] })).status).toBe(400);
  });
});

describe('Première séance A0 (AC01, AC20, AC21)', () => {
  it('se termine sans savoir lire le russe, sans micro ni clavier physique, sans corrigé exposé', async () => {
    const c = api(env, await register(env));
    const created = await c.post('/v1/sessions', { minutes: 35 });
    expect(created.status).toBe(201);
    const s = created.body.session;
    expect(s.unit_id).toBe('A0-01');
    expect(s.steps[0].kind).toBe('teach');
    // Aucun corrigé n'est transmis au client.
    const raw = JSON.stringify(s.steps.filter((x: any) => x.kind === 'exercise'));
    expect(raw).not.toMatch(/"answer"|"accepted"|"correct"/);
    // Un exercice ne peut être tenté avant la présentation de son contenu (AC20).
    const firstEx = s.steps.find((x: any) => x.kind === 'exercise');
    const early = await c.post(`/v1/sessions/${s.id}/attempts`, {
      client_attempt_id: randomUUID(), exercise_id: firstEx.exercise.id, step_index: firstEx.index, answer: { choice_id: 'x' }, duration_ms: 1000,
    });
    expect(early.status).toBe(409);
    const { session, results } = await playSession(env, c, s.id);
    expect(session.cursor).toBe(session.steps.length);
    expect(results.length).toBeGreaterThan(5);
    expect(results.every((r) => r.accepted)).toBe(true);
    const done = await c.post(`/v1/sessions/${s.id}/complete`);
    expect(done.body.summary.correct_autonomous).toBe(results.length);
  });
});

describe('Tentatives, révisions et idempotence', () => {
  it('AC06 : deux requêtes (même concurrentes) avec le même client_attempt_id ne créent qu’une tentative', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    await playSession(env, c, s.id, undefined, { stopAt: s.steps.findIndex((x: any) => x.kind === 'exercise') });
    const step = (await c.get(`/v1/sessions/${s.id}`)).body.session.steps.find((x: any) => x.kind === 'exercise');
    const ex = env.content.exerciseById.get(step.exercise.id)!;
    const payload = { client_attempt_id: randomUUID(), exercise_id: ex.id, step_index: step.index, answer: correctAnswer(ex), duration_ms: 5000 };
    const [a, b] = await Promise.all([c.post(`/v1/sessions/${s.id}/attempts`, payload), c.post(`/v1/sessions/${s.id}/attempts`, payload)]);
    expect([a.status, b.status].sort()).toEqual([200, 201]);
    expect(a.body.attempt_id).toBe(b.body.attempt_id);
    const again = await c.post(`/v1/sessions/${s.id}/attempts`, payload);
    expect(again.body).toMatchObject({ replayed: true, attempt_id: a.body.attempt_id, accepted: true });
    const n = await env.db.query('SELECT count(*)::int AS n FROM attempts WHERE client_attempt_id = $1', [payload.client_attempt_id]);
    expect(n.rows[0].n).toBe(1);
  });

  it('AC05 : échec → 10 min + remédiation ajoutée ; aide → 1 jour ; horloge simulée', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    const idx = s.steps.findIndex((x: any) => x.kind === 'exercise');
    await playSession(env, c, s.id, undefined, { stopAt: idx });
    const step = s.steps[idx];
    const ex = env.content.exerciseById.get(step.exercise.id)!;
    const t0 = env.clock.now();
    const fail = await c.post(`/v1/sessions/${s.id}/attempts`, {
      client_attempt_id: randomUUID(), exercise_id: ex.id, step_index: idx, answer: wrongAnswer(ex), duration_ms: 5000,
    });
    expect(fail.body).toMatchObject({ outcome: 'incorrect', grade: 0, remediation_step_added: true });
    expect(new Date(fail.body.review_due_at).getTime() - t0.getTime()).toBe(10 * 60_000);
    expect(fail.body.expected).not.toBe('');

    // Indice sur l'exercice suivant : réponse correcte comptée comme assistée (grade 1, +1 jour).
    const sess = (await c.get(`/v1/sessions/${s.id}`)).body.session;
    let next = sess.steps[sess.cursor];
    while (next.kind !== 'exercise') {
      await c.post(`/v1/sessions/${s.id}/steps/${next.index}/ack`);
      next = (await c.get(`/v1/sessions/${s.id}`)).body.session.steps[next.index + 1];
    }
    const hint = await c.post(`/v1/sessions/${s.id}/steps/${next.index}/hint`);
    expect(hint.body.assisted).toBe(true);
    const ex2 = env.content.exerciseById.get(next.exercise.id)!;
    const helped = await c.post(`/v1/sessions/${s.id}/attempts`, {
      client_attempt_id: randomUUID(), exercise_id: ex2.id, step_index: next.index, answer: correctAnswer(ex2), assisted: false, duration_ms: 5000,
    });
    expect(helped.body.grade).toBe(1);
    expect(new Date(helped.body.review_due_at).getTime() - env.clock.now().getTime()).toBe(DAY);

    // Le lendemain, la séance commence par les révisions dues.
    await playSession(env, c, s.id);
    await c.post(`/v1/sessions/${s.id}/complete`);
    env.clock.advance(DAY + 60_000);
    const s2 = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    expect(s2.steps.slice(0, 3).some((x: any) => x.purpose === 'review' || x.purpose === 'remediation')).toBe(true);
  });

  it('AC04 : un QCM réussi ne crée aucun état de rappel actif', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    const { results } = await playSession(env, c, s.id);
    const userId = (await c.get('/v1/profile')).body.user_id;
    const choiceItems = results.filter((r) => r.ex.answer.kind === 'choice').map((r) => env.content.itemUuid(r.ex.item_id));
    const states = await env.db.query('SELECT item_id, competency FROM review_states WHERE user_id = $1', [userId]);
    for (const st of states.rows) {
      if (st.competency === 'recall') {
        // Un état de rappel n'existe que s'il y a eu un exercice de rappel sans choix pour cet item.
        expect(results.some((r) => env.content.itemUuid(r.ex.item_id) === st.item_id && r.ex.answer.kind !== 'choice' && r.ex.competency === 'recall')).toBe(true);
      }
    }
    expect(choiceItems.length).toBeGreaterThan(0);
  });

  it('saisie latine : clarification sans pénalité, l’étape reste à refaire', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 35 })).body.session;
    const idx = s.steps.findIndex((x: any) => x.kind === 'exercise' && x.exercise.input === 'cyrillic');
    await playSession(env, c, s.id, undefined, { stopAt: idx });
    const r = await c.post(`/v1/sessions/${s.id}/attempts`, {
      client_attempt_id: randomUUID(), exercise_id: s.steps[idx].exercise.id, step_index: idx, answer: { text: 'k' }, duration_ms: 3000,
    });
    expect(r.body).toMatchObject({ outcome: 'unscorable', grade: null, cursor: idx });
    expect(r.body.error_codes).toContain('latin_script');
  });

  it('révision anticipée : une réussite répétée le même jour ne fait pas avancer le niveau', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 35 })).body.session;
    const { results } = await playSession(env, c, s.id);
    const practice = results.filter((r) => r.early_review);
    expect(practice.length).toBeGreaterThan(0);
    const userId = (await c.get('/v1/profile')).body.user_id;
    const st = await env.db.query('SELECT max(stage)::int AS m FROM review_states WHERE user_id = $1', [userId]);
    expect(st.rows[0].m).toBe(1);
  });

  it('AC15 : tentatives hors ligne arrivées dans le désordre → même état que dans l’ordre (recalcul chronologique)', async () => {
    const make = async () => {
      const c = api(env, await register(env));
      const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
      const idx = s.steps.findIndex((x: any) => x.kind === 'exercise');
      await playSession(env, c, s.id, undefined, { stopAt: idx });
      return { c, s, idx };
    };
    const base = env.clock.now().getTime();
    const run = async (order: number[]) => {
      const { c, s, idx } = await make();
      const step = s.steps[idx];
      const ex = env.content.exerciseById.get(step.exercise.id)!;
      const atts = [
        { at: new Date(base + 60_000), answer: wrongAnswer(ex) },
        { at: new Date(base + 120_000), answer: correctAnswer(ex) },
      ];
      env.clock.set(new Date(base + 10 * 60_000));
      for (const i of order) {
        await c.post(`/v1/sessions/${s.id}/attempts`, {
          client_attempt_id: randomUUID(), exercise_id: ex.id, step_index: idx, answer: atts[i]!.answer, duration_ms: 4000,
          occurred_at: atts[i]!.at.toISOString(), mode: 'offline',
        });
      }
      const userId = (await c.get('/v1/profile')).body.user_id;
      const r = await env.db.query('SELECT stage, due_at, remediation_pending FROM review_states WHERE user_id = $1 AND item_id = $2 AND competency = $3', [
        userId, env.content.itemUuid(ex.item_id), ex.competency,
      ]);
      return r.rows[0];
    };
    const inOrder = await run([0, 1]);
    const reversed = await run([1, 0]);
    expect(reversed).toEqual(inOrder);
    expect(inOrder.remediation_pending).toBe(false);
  });
});

describe('Reprise, isolation, export, suppression', () => {
  it('AC07 : séance interrompue reprise au même exercice', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    await playSession(env, c, s.id, undefined, { stopAt: 4 });
    const again = await c.post('/v1/sessions', { minutes: 15 });
    expect(again.status).toBe(200);
    expect(again.body).toMatchObject({ resumed: true, session: { id: s.id, cursor: 4 } });
    expect((await c.get('/v1/sessions/current')).body.session.cursor).toBe(4);
  });

  it('AC14 : un compte ne peut ni lire ni modifier la séance d’un autre', async () => {
    const a = api(env, await register(env));
    const b = api(env, await register(env));
    const s = (await a.post('/v1/sessions', { minutes: 15 })).body.session;
    expect((await b.get(`/v1/sessions/${s.id}`)).status).toBe(404);
    expect((await b.post(`/v1/sessions/${s.id}/steps/0/ack`)).status).toBe(404);
    expect((await b.post(`/v1/sessions/${s.id}/attempts`, {
      client_attempt_id: randomUUID(), exercise_id: randomUUID(), step_index: 0, answer: {}, duration_ms: 1,
    })).status).toBe(404);
  });

  it('AC13 : export JSON/CSV puis suppression définitive', async () => {
    const token = await register(env);
    const c = api(env, token);
    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    await playSession(env, c, s.id);
    const json = await c.get('/v1/export');
    expect(json.body.attempts.length).toBeGreaterThan(0);
    expect(json.body.user.email).toMatch(/@test.local$/);
    const csv = await c.get('/v1/export?format=csv');
    expect(String(csv.body).split('\n').length).toBe(json.body.attempts.length + 1);
    expect((await c.del('/v1/account', { confirm: 'non' })).status).toBe(400);
    expect((await c.del('/v1/account', { confirm: 'SUPPRIMER' })).body.deleted).toBe(true);
    expect((await c.get('/v1/profile')).status).toBe(401);
    const left = await env.db.query('SELECT count(*)::int AS n FROM attempts WHERE session_id = $1', [s.id]);
    expect(left.rows[0].n).toBe(0);
  });
});

describe('Passerelles (F14)', () => {
  it('validée affichée ; non validée jamais ; langue désactivée exclue ; aide en exercice = assistée', async () => {
    const c = api(env, await register(env));
    const kh = await c.get(`/v1/concepts/${encodeURIComponent('letter:х')}/bridges`);
    expect(kh.body.bridge).toMatchObject({ id: 'brg_kh_de', source_language: 'de', bridge_type: 'phonetic' });
    expect(kh.body.bridge.limitations_fr).toBeTruthy();
    expect((await c.post('/v1/bridges/brg_kh_de/feedback', { helpful: true })).body.ok).toBe(true);
    // Brouillon (р / espagnol) : jamais affiché.
    expect((await c.get(`/v1/concepts/${encodeURIComponent('letter:р')}/bridges`)).body.bridge).toBeNull();
    // Notion sans passerelle : réponse normale.
    expect((await c.get(`/v1/concepts/${encodeURIComponent('letter:а')}/bridges`)).body.bridge).toBeNull();
    // Désactiver l'allemand.
    const langs = (await c.get('/v1/profile/languages')).body.known_languages.map((l: any) => (l.code === 'de' ? { ...l, bridges_enabled: false } : l));
    await c.patch('/v1/profile/languages', { known_languages: langs });
    expect((await c.get(`/v1/concepts/${encodeURIComponent('letter:х')}/bridges`)).body.bridge).toBeNull();
    // « Autre comparaison » : vino IT puis ES (es/it élémentaires).
    const v0 = (await c.get(`/v1/concepts/${encodeURIComponent('lex:vino')}/bridges`)).body;
    expect(v0.has_more).toBe(true);
    const v1 = (await c.get(`/v1/concepts/${encodeURIComponent('lex:vino')}/bridges?offset=1`)).body;
    expect(v1.bridge.id).not.toBe(v0.bridge.id);

    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    const idx = s.steps.findIndex((x: any) => x.kind === 'exercise');
    await playSession(env, c, s.id, undefined, { stopAt: idx });
    const step = s.steps[idx];
    await c.get(`/v1/concepts/${encodeURIComponent('lex:vino')}/bridges?context=exercise&session_id=${s.id}&step_index=${idx}`);
    const ex = env.content.exerciseById.get(step.exercise.id)!;
    const r = await c.post(`/v1/sessions/${s.id}/attempts`, { client_attempt_id: randomUUID(), exercise_id: ex.id, step_index: idx, answer: correctAnswer(ex), duration_ms: 5000 });
    expect(r.body.grade).toBe(1);
  });
});

describe('Objectifs (§4, §12)', () => {
  it('semaine, objectifs hebdomadaires, bilans datés, date de départ réglable', async () => {
    const c = api(env, await register(env));
    const g0 = (await c.get('/v1/goals')).body;
    expect(g0).toMatchObject({ week: 1, weeks_total: 52, pace: { status: 'not_started' } });
    expect(g0.this_week.target_minutes).toBe(35 * 6);
    expect(g0.checkpoints.map((x: any) => x.id)).toEqual(['alphabet', 'M1', 'M3', 'M6', 'M9', 'M12']);
    const s = (await c.post('/v1/sessions', { minutes: 15 })).body.session;
    await playSession(env, c, s.id);
    const g1 = (await c.get('/v1/goals')).body;
    expect(g1.this_week.done_days).toBe(1);
    expect(g1.this_week.done_minutes).toBeGreaterThan(0);
    await c.patch('/v1/profile', { settings: { goal_start_date: '2026-10-01' } });
    const g2 = (await c.get('/v1/goals')).body;
    expect(g2.start_date).toBe('2026-10-01');
    expect(g2.week).toBeGreaterThan(5);
  });
});

describe('Sources russe-français (Tatoeba, Wiktionary)', () => {
  it('passerelle « emprunt au français » : invisible avant validation, visible après, rejet respecté', async () => {
    const c = api(env, await register(env));
    const rev = (await c.get('/v1/bridges/review?limit=50')).body;
    expect(rev.total_pending).toBeGreaterThan(1000);
    const tualet = rev.items.find((b: any) => b.concept_id === 'word:туалет');
    expect(tualet).toBeTruthy();
    expect(tualet.in_lessons).toBe(true);
    // Avant validation : rien n'est affiché pour l'item de leçon lex:tualet.
    expect((await c.get(`/v1/concepts/${encodeURIComponent('lex:tualet')}/bridges`)).body.bridge).toBeNull();
    await c.post(`/v1/bridges/${tualet.id}/review`, { decision: 'approved', version: tualet.version });
    const after = (await c.get(`/v1/concepts/${encodeURIComponent('lex:tualet')}/bridges`)).body.bridge;
    expect(after).toMatchObject({ source_language: 'fr', bridge_type: 'lexical_loanword' });
    expect((await c.get(`/v1/dictionary?q=${encodeURIComponent('туалет')}`)).body.results[0].bridges.length).toBe(1);
    await c.post(`/v1/bridges/${tualet.id}/review`, { decision: 'rejected', version: tualet.version });
    expect((await c.get(`/v1/concepts/${encodeURIComponent('lex:tualet')}/bridges`)).body.bridge).toBeNull();
    // Un autre compte n'est pas concerné par mes validations.
    const other = api(env, await register(env));
    expect((await other.get('/v1/bridges/review?limit=1')).body.approved).toBe(0);
  });

  it('phrases réelles : uniquement des formes apprises et des lettres connues', async () => {
    const c = api(env, await register(env));
    expect((await c.get('/v1/reading/sentences')).body.sentences).toEqual([]);
    const userId = (await c.get('/v1/profile')).body.user_id;
    for (const id of [...env.content.itemUnit.keys()]) {
      await env.db.query('INSERT INTO taught_items (user_id, item_id, taught_at) VALUES ($1,$2,now()) ON CONFLICT DO NOTHING', [userId, env.content.itemUuid(id)]);
    }
    const r = (await c.get('/v1/reading/sentences?limit=60')).body;
    expect(r.sentences.length).toBeGreaterThan(10);
    expect(r.sentences.map((s: any) => s.ru)).toContain('Где ты?');
    expect(r.sentences.every((s: any) => !/звал/.test(s.ru))).toBe(true);
    expect(r.license).toMatch(/CC BY 2.0 FR/);
  });
});

describe('Divers', () => {
  it('dictionnaire : forme fléchie → lemme, accent, formes, licence', async () => {
    const c = api(env, await register(env));
    const r = (await c.get(`/v1/dictionary?q=${encodeURIComponent('хочу')}`)).body;
    expect(r.results[0]).toMatchObject({ lemma: 'хотеть', pos: 'verb', match: 'form' });
    expect(r.results[0].forms.presfut_sg2).toBe('хо́чешь');
    expect(r.source.license).toMatch(/CC BY-SA 4.0/);
    expect((await c.get('/v1/dictionary?q=')).status).toBe(400);
  });
  it('fonctions non livrées : 501 explicite, pas de simulacre', async () => {
    const c = api(env, await register(env));
    expect((await c.post('/v1/tutor/dialogues')).status).toBe(501);
  });
  it('curriculum : unité courante A0-01, suivantes verrouillées, parcours annuel indicatif', async () => {
    const c = api(env, await register(env));
    const cur = (await c.get('/v1/curriculum')).body;
    expect(cur.units[0]).toMatchObject({ id: 'A0-01', current: true, locked: false });
    expect(cur.units[1].locked).toBe(true);
    expect(cur.roadmap).toHaveLength(12);
    expect((await c.get('/v1/alphabet')).body.letters).toHaveLength(33);
  });
  it('AC12 : aucune dépendance IA — séance et révisions servies par le moteur déterministe', async () => {
    const c = api(env, await register(env));
    expect((await c.get('/v1/reviews/due')).body.count).toBe(0);
    expect((await c.post('/v1/sessions', { minutes: 5 })).body.session.steps.length).toBeGreaterThan(0);
  });
});

describe('Remédiation (§6, AC20)', () => {
  it('l’étape de remédiation ajoutée après un échec n’exige jamais un élément non présenté', async () => {
    const c = api(env, await register(env));
    const s = (await c.post('/v1/sessions', { minutes: 35 })).body.session;
    // Échouer tous les exercices : chaque remédiation ajoutée doit rester jouable.
    const { session } = await playSession(env, c, s.id, (ex) => wrongAnswer(ex));
    expect(session.cursor).toBe(session.steps.length);
    expect(session.steps.some((x: any) => x.purpose === 'remediation')).toBe(true);
  });
});
