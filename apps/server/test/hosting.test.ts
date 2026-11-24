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
