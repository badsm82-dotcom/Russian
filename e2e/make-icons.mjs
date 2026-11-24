// Génère les icônes PNG (écran d'accueil Android/iOS) à partir d'un SVG, avec le Chromium de Playwright.
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');
const out = process.argv[2] ?? 'apps/web/public';
const svg = (size, pad) => `<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 100 100">
<rect width="100" height="100" fill="#1f4e79"/><text x="50" y="${50 + 22 * (1 - pad)}" font-family="Arial, Helvetica, sans-serif" font-size="${62 * (1 - pad)}" font-weight="700" text-anchor="middle" fill="#ffffff">Я</text></svg></body></html>`;
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of [['icon-192.png', 192], ['icon-512.png', 512], ['apple-touch-icon.png', 180]]) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(svg(size, 0.15));
  await page.screenshot({ path: `${out}/${name}`, omitBackground: false });
}
await browser.close();
console.log('icônes générées dans', out);
