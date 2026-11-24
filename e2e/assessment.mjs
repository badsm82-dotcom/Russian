// E2E bilan alphabet : (préparation : les 33 lettres marquées comme présentées via DATABASE_URL), passage complet sans aide, remise, résultat.
// Usage : BASE_URL=http://localhost:3000/ DATABASE_URL=postgres://… node e2e/assessment.mjs
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { chromium, devices } = require('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:3000/';
const SHOTS = process.env.SHOTS_DIR ?? null;
const b = await chromium.launch(); const ctx = await b.newContext({ ...devices['Pixel 7'] }); const page = await ctx.newPage();
const errors = []; page.on('pageerror', (e) => errors.push(String(e)));
const email = `exam-${Date.now()}@test.local`;
await page.goto(BASE);
await page.getByLabel('Adresse e-mail').fill(email);
await page.getByLabel('Mot de passe (8 caractères minimum)').fill('motdepasse-e2e');
await page.getByRole('button', { name: 'Commencer' }).click();
for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Suivant' }).click();
await page.getByRole('button', { name: 'Commencer la première leçon' }).click();
await page.getByText('Disponible quand les 33 lettres').waitFor();
execFileSync('psql', [process.env.DATABASE_URL, '-qc', `INSERT INTO taught_items (user_id, item_id, taught_at) SELECT u.id, k.id, now() FROM users u, knowledge_items k WHERE u.email = '${email}' AND k.type = 'letter' ON CONFLICT DO NOTHING`]);
await page.reload();
await page.getByRole('button', { name: 'Passer le bilan' }).click();
await page.getByRole('button', { name: 'Commencer' }).click();
let n = 0;
for (; n < 40; n++) {
  if (await page.getByRole('heading', { name: 'Prêt à remettre ?' }).isVisible().catch(() => false)) break;
  if (n === 0 && SHOTS) await page.screenshot({ path: `${SHOTS}/exam-1.png`, fullPage: true });
  if (await page.locator('.choices .choice').first().isVisible().catch(() => false)) await page.locator('.choices .choice').nth(n % 2).click();
  else if (await page.locator('#exam-answer').isVisible().catch(() => false)) { await page.locator('#exam-answer').fill('stol'); await page.getByRole('button', { name: 'Valider' }).click(); }
  await page.waitForTimeout(150);
}
await page.getByRole('button', { name: 'Remettre et voir mon résultat' }).click();
await page.getByRole('heading', { name: /Bilan/ }).waitFor();
if (SHOTS) await page.screenshot({ path: `${SHOTS}/exam-2.png`, fullPage: true });
const title = await page.getByRole('heading', { level: 2 }).first().innerText();
await b.close();
console.log(JSON.stringify({ answered: n, title, errors }));
if (errors.length || n < 30) process.exit(1);
