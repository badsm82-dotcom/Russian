// E2E : un débutant complet crée son compte, passe l'onboarding et termine sa première séance
// sans micro ni clavier russe (AC01, AC21). Usage : BASE_URL=http://localhost:3000 node e2e/first-session.mjs
import { createRequire } from 'node:module';
// Playwright préinstallé ou installé localement (npm i -D playwright).
const { chromium, devices } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const SHOTS = process.env.SHOTS_DIR ?? null;
const browser = await chromium.launch();
const context = await browser.newContext({ ...devices['Pixel 7'] });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
// BLOCK_PATCH=1 : simule un hébergeur qui refuse PATCH/DELETE (l'application doit passer par la méthode de secours).
if (process.env.BLOCK_PATCH) {
  await page.route('**/v1/**', (route) =>
    ['PATCH', 'DELETE'].includes(route.request().method())
      ? route.fulfill({ status: 405, contentType: 'text/html', body: '<h1>Method Not Allowed</h1>' })
      : route.continue(),
  );
}
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: true }); };

await page.goto(BASE);
await page.getByLabel('Adresse e-mail').fill(`e2e-${Date.now()}@test.local`);
await page.getByLabel('Mot de passe (8 caractères minimum)').fill('motdepasse-e2e');
await page.getByRole('button', { name: 'Commencer' }).click();

// Onboarding (4 étapes)
await page.getByRole('heading', { name: 'Bienvenue' }).waitFor();
await shot('01-onboarding');
for (let i = 0; i < 3; i++) {
  if (i === 2) await page.getByLabel('Horaire préféré (facultatif)').fill('08:30');
  await page.getByRole('button', { name: 'Suivant' }).click();
}
await page.getByRole('button', { name: 'Commencer la première leçon' }).click();

await page.getByRole('button', { name: 'Commencer ma séance' }).waitFor();
await page.getByText('15 min').click();
await shot('02-home');
await page.getByRole('button', { name: 'Commencer ma séance' }).click();

let teach = 0, exercises = 0, speak = 0;
try {
for (let guard = 0; guard < 200; guard++) {
  if (await page.getByRole('heading', { name: /Séance terminée/ }).isVisible().catch(() => false)) break;
  const cont = page.getByRole('button', { name: 'J’ai compris, continuer' });
  const done = page.getByRole('button', { name: 'C’est fait' });
  const next = page.getByRole('button', { name: 'Continuer', exact: true });
  if (await cont.isVisible().catch(() => false)) {
    if (teach === 0) await shot('03-teach');
    teach++;
    if (await cont.isDisabled().catch(() => true)) { await page.waitForTimeout(150); continue; }
    await cont.click();
    await page.waitForTimeout(100);
  } else if (await done.isVisible().catch(() => false)) {
    speak++;
    await done.click();
    await page.waitForTimeout(100);
  } else if (await next.isVisible().catch(() => false)) {
    await next.click();
    await page.waitForTimeout(100);
  } else if (await page.locator('.choices .choice').first().isVisible().catch(() => false)) {
    if (exercises === 0) await shot('04-exercise');
    exercises++;
    await page.locator('.choices .choice').first().click();
    await next.waitFor();
    if (exercises === 1) await shot('05-feedback');
  } else if (await page.locator('#answer').isVisible().catch(() => false)) {
    exercises++;
    const kbHelp = page.getByRole('button', { name: 'Compris' });
    if (await kbHelp.isVisible().catch(() => false)) {
      await kbHelp.click();
      // Saisie au clavier virtuel uniquement.
      await page.getByRole('button', { name: 'Lettre а', exact: true }).click();
      await shot('06-keyboard');
      await page.getByRole('button', { name: 'Valider' }).click();
    } else {
      await page.getByRole('button', { name: 'Je ne sais pas' }).click();
    }
    await next.waitFor();
  } else {
    await page.waitForTimeout(150);
  }
}
} catch (e) {
  await page.screenshot({ path: (SHOTS ?? '.') + '/error.png', fullPage: true });
  console.error('Échec E2E :', e.message.split('\n')[0]);
  console.error(await page.locator('main').innerText());
  await browser.close();
  process.exit(1);
}
const finished = await page.getByRole('heading', { name: /Séance terminée/ }).isVisible();
await shot('07-summary');
await page.getByRole('button', { name: 'Retour à l’accueil' }).click();
await page.getByRole('button', { name: 'Progrès' }).click();
await page.getByRole('heading', { name: /Compétences/ }).waitFor();
await shot('08-stats');
await page.getByRole('button', { name: 'Alphabet' }).click();
await page.getByRole('heading', { name: 'Les 33 lettres' }).waitFor();
await shot('09-alphabet');
await browser.close();

console.log(JSON.stringify({ finished, teach, exercises, speak, errors }, null, 2));
if (!finished || errors.length) process.exit(1);
