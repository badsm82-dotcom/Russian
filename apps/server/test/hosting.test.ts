import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { normalizeBasePath } from '../src/config.js';
import { setupEnv, type TestEnv } from './helpers.js';

let env: TestEnv;
beforeAll(async () => {
  env = await setupEnv(undefined, { basePath: '/russian', registrationOpen: false });
});
afterAll(async () => {
  await env?.close();
});

describe('Hébergement dans un sous-dossier (bmcg.ch/russian)', () => {
  it('normalise le chemin', () => {
    expect(normalizeBasePath('russian/')).toBe('/russian');
    expect(normalizeBasePath('/')).toBe('');
    expect(normalizeBasePath(undefined)).toBe('');
  });
  it('répond avec ou sans préfixe (selon ce que transmet le serveur web)', async () => {
    expect((await env.app.inject({ url: '/russian/health' })).statusCode).toBe(200);
    expect((await env.app.inject({ url: '/health' })).statusCode).toBe(200);
    expect((await env.app.inject({ url: '/russian/v1/meta' })).json()).toEqual({ registration_open: false, base_path: '/russian' });
    expect((await env.app.inject({ url: '/russianx/health' })).statusCode).toBe(404);
  });
  it('inscriptions fermées : 403', async () => {
    const r = await env.app.inject({ method: 'POST', url: '/russian/v1/auth/register', payload: { email: 'x@test.local', password: 'motdepasse-solide' } });
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe('registration_closed');
  });
});

describe('Méthode de secours (PATCH/DELETE bloqués par l’hébergeur)', () => {
  it('POST + X-HTTP-Method-Override est traité comme PATCH sur un vrai serveur HTTP', async () => {
    const { applyMethodOverride } = await import('../src/app.js');
    const req = { method: 'POST', headers: { 'x-http-method-override': 'patch' } as Record<string, string> };
    applyMethodOverride(req);
    expect(req.method).toBe('PATCH');
    const get = { method: 'GET', headers: { 'x-http-method-override': 'DELETE' } as Record<string, string> };
    applyMethodOverride(get);
    expect(get.method).toBe('GET');

    const open = await setupEnv(undefined, { basePath: '/russian' });
    const address = await open.app.listen({ port: 0, host: '127.0.0.1' });
    try {
      const reg = await fetch(`${address}/russian/v1/auth/register`, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ovr@test.local', password: 'motdepasse-solide' }),
      }).then((r) => r.json() as Promise<any>);
      const r = await fetch(`${address}/russian/v1/profile`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${reg.token}`, 'x-http-method-override': 'PATCH' },
        body: JSON.stringify({ settings: { preferred_time: '08:30:00', days_per_week: 6 }, onboarded: true }),
      });
      expect(r.status).toBe(200);
      const body = (await r.json()) as any;
      expect(body.onboarded).toBe(true);
      expect(body.settings.preferred_time).toBe('08:30');
    } finally {
      await open.close();
    }
  });

  it('les routes PATCH/DELETE acceptent aussi POST (hébergeur qui coupe PATCH)', async () => {
    const open = await setupEnv(undefined, { basePath: '/russian' });
    try {
      const reg = await open.app.inject({ method: 'POST', url: '/russian/v1/auth/register', payload: { email: 'post@test.local', password: 'motdepasse-solide' } });
      const token = reg.json().token;
      const h = { authorization: `Bearer ${token}` };
      const r = await open.app.inject({ method: 'POST', url: '/russian/v1/profile', headers: h, payload: { settings: { theme: 'dark' }, onboarded: true } });
      expect(r.statusCode).toBe(200);
      expect(r.json().settings.theme).toBe('dark');
      const l = await open.app.inject({ method: 'POST', url: '/russian/v1/profile/languages', headers: h, payload: { known_languages: [{ code: 'fr', proficiency: 'fluent', bridges_enabled: true }] } });
      expect(l.statusCode).toBe(200);
      const d = await open.app.inject({ method: 'POST', url: '/russian/v1/account', headers: h, payload: { confirm: 'SUPPRIMER' } });
      expect(d.json().deleted).toBe(true);
    } finally {
      await open.close();
    }
  });
});
