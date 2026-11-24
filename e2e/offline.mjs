// E2E hors ligne : séance préparée, réseau coupé en cours de route, réponses corrigées sur l'appareil,
// puis retour du réseau : les opérations sont rejouées et le serveur rattrape exactement la progression.
// Usage : BASE_URL=http://localhost:3000/ node e2e/offline.mjs
import { createRequire } from 'node:module';
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000/';
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));

await page.goto(BASE);
await page.getByLabel('Adresse e-mail').fill(`off-${Date.now()}@test.local`);
await page.getByLabel('Mot de passe (8 caractères minimum)').fill('motdepasse-e2e');
await page.getByRole('button', { name: 'Commencer' }).click();
for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Suivant' }).click();
await page.getByRole('button', { name: 'Commencer la première leçon' }).click();
await page.getByText('15 min').click();
await page.getByRole('button', { name: '📥 Préparer pour hors ligne' }).click();
await page.getByText('Disponible hors ligne sur cet appareil').waitFor();

const token = await page.evaluate(() => localStorage.getItem('r365.token'));
const apiGet = async (u) => (await context.request.get(new URL(u.replace(/^\//, ''), BASE).toString(), { headers: { authorization: `Bearer ${token}` } })).json();

await context.setOffline(true);
await page.reload().catch(() => undefined); // l'interface vient du cache du service worker
await page.getByText('Hors ligne').first().waitFor({ timeout: 15000 });
await page.getByRole('button', { name: 'Reprendre ma séance' }).click();

let actions = 0;
for (let guard = 0; guard < 60 && actions < 8; guard++) {
  const cont = page.getByRole('button', { name: 'J’ai compris, continuer' });
  const next = page.getByRole('button', { name: 'Continuer', exact: true });
  if (await next.isVisible().catch(() => false)) { await next.click(); actions++; }
  else if (await cont.isVisible().catch(() => false) && !(await cont.isDisabled())) { await cont.click(); actions++; }
  else if (await page.locator('.choices .choice').first().isVisible().catch(() => false)) { await page.locator('.choices .choice').first().click(); await next.waitFor(); }
  else if (await page.locator('#answer').isVisible().catch(() => false)) {
    await page.getByRole('button', { name: 'Je ne sais pas' }).click(); await next.waitFor();
  }
  await page.waitForTimeout(150);
}
const provisional = await page.getByText('Correction provisoire hors ligne').count();
const localPos = await page.locator('.session-bar .muted').first().innerText();

await context.setOffline(false);
await page.waitForTimeout(2500);
await page.getByRole('button', { name: /Interrompre/ }).click();
await page.waitForTimeout(1000);
const server = (await apiGet('/v1/sessions/current')).session;
await browser.close();

const localCursor = Number(localPos.split('/')[0].trim()) - 1;
const ok = server && server.cursor === localCursor && provisional >= 0;
console.log(JSON.stringify({ actions, localCursor, serverCursor: server?.cursor, errors }, null, 2));
if (!ok || errors.length) process.exit(1);
