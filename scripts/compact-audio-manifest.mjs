// Produit apps/web/public/audio/index.json : version compacte du manifest (chargée à l'ouverture de l'application).
// { t: { clé: [fichiers…] }, n: { fichier: [auteur, url, licence] } } — seules les voix natives portent une attribution.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const src = 'apps/web/public/audio/manifest.json';
if (!existsSync(src)) process.exit(0);
const m = JSON.parse(readFileSync(src, 'utf8'));
const t = {};
const n = {};
for (const [k, entries] of Object.entries(m)) {
  const natives = entries.filter((e) => e.source === 'lingualibre');
  const others = entries.filter((e) => e.source !== 'lingualibre');
  t[k] = [...natives, ...others].map((e) => e.file);
  for (const e of natives) n[e.file] = [e.author, e.url, e.license];
}
writeFileSync('apps/web/public/audio/index.json', JSON.stringify({ v: 1, t, n }));
console.log(`audio/index.json : ${Object.keys(t).length} textes, ${Object.keys(n).length} voix natives.`);
