/**
 * Importe un sous-ensemble du dictionnaire OpenRussian (CC BY-SA 4.0) en JSON compact.
 * Source : https://github.com/Badestrand/russian-dictionary (CSV classés par fréquence d'usage).
 * Usage : npx tsx scripts/import-openrussian.ts <dossier-du-dépôt-cloné>
 * Les accents « ' » de la source sont convertis en accent pédagogique U+0301.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const src = process.argv[2];
if (!src) {
  console.error('Usage : npx tsx scripts/import-openrussian.ts <dossier russian-dictionary>');
  process.exit(1);
}
const LIMITS = { noun: 4000, verb: 2000, adjective: 1500, other: 800 } as const;

const accent = (s: string) => (s ?? '').replace(/'/g, '́').normalize('NFC').trim();
const clean = (s: string) => (s ?? '').trim();

function readTsv(file: string): Record<string, string>[] {
  const [head, ...lines] = readFileSync(join(src, file), 'utf8').split(/\r?\n/);
  const cols = head!.split('\t');
  return lines.filter(Boolean).map((l) => {
    const cells = l.split('\t');
    return Object.fromEntries(cols.map((c, i) => [c, cells[i] ?? '']));
  });
}

type Entry = {
  b: string; // forme nue
  a: string; // avec accent
  p: 'noun' | 'verb' | 'adjective' | 'other';
  r: number; // rang de fréquence dans la catégorie (1 = le plus fréquent)
  en: string;
  de: string;
  g?: string; // genre
  asp?: string; // aspect
  pa?: string; // partenaire d'aspect
  f?: Record<string, string>; // formes
};

const out: Entry[] = [];
const seen = new Set<string>();
function add(e: Entry) {
  const k = `${e.p}|${e.b}`;
  if (!e.b || seen.has(k) || /[a-z]/i.test(e.b)) return;
  seen.add(k);
  out.push(e);
}

readTsv('nouns.csv').slice(0, LIMITS.noun).forEach((x, i) => {
  const f: Record<string, string> = {};
  for (const k of ['sg_nom', 'sg_gen', 'sg_dat', 'sg_acc', 'sg_inst', 'sg_prep', 'pl_nom', 'pl_gen', 'pl_dat', 'pl_acc', 'pl_inst', 'pl_prep']) if (x[k]) f[k] = accent(x[k]!);
  add({ b: clean(x.bare!), a: accent(x.accented!), p: 'noun', r: i + 1, en: clean(x.translations_en!), de: clean(x.translations_de!), g: clean(x.gender!) || undefined, f });
});
readTsv('verbs.csv').slice(0, LIMITS.verb).forEach((x, i) => {
  const f: Record<string, string> = {};
  for (const k of ['presfut_sg1', 'presfut_sg2', 'presfut_sg3', 'presfut_pl1', 'presfut_pl2', 'presfut_pl3', 'past_m', 'past_f', 'past_n', 'past_pl', 'imperative_sg', 'imperative_pl']) if (x[k]) f[k] = accent(x[k]!);
  add({ b: clean(x.bare!), a: accent(x.accented!), p: 'verb', r: i + 1, en: clean(x.translations_en!), de: clean(x.translations_de!), asp: clean(x.aspect!) || undefined, pa: clean(x.partner!) || undefined, f });
});
readTsv('adjectives.csv').slice(0, LIMITS.adjective).forEach((x, i) => {
  const f: Record<string, string> = {};
  for (const k of ['decl_m_nom', 'decl_f_nom', 'decl_n_nom', 'decl_pl_nom', 'short_m', 'short_f', 'short_n', 'short_pl', 'comparative']) if (x[k]) f[k] = accent(x[k]!);
  add({ b: clean(x.bare!), a: accent(x.accented!), p: 'adjective', r: i + 1, en: clean(x.translations_en!), de: clean(x.translations_de!), f });
});
readTsv('others.csv').slice(0, LIMITS.other).forEach((x, i) => {
  add({ b: clean(x.bare!), a: accent(x.accented!), p: 'other', r: i + 1, en: clean(x.translations_en!), de: clean(x.translations_de!) });
});

const payload = {
  source: 'OpenRussian — https://en.openrussian.org — données https://github.com/Badestrand/russian-dictionary',
  license: 'CC BY-SA 4.0 — https://creativecommons.org/licenses/by-sa/4.0/',
  note: 'Sous-ensemble (mots les plus fréquents par catégorie), accents convertis en U+0301. Ce fichier dérivé est diffusé sous la même licence.',
  imported_at: new Date().toISOString().slice(0, 10),
  entries: out,
};
writeFileSync('packages/content/data/openrussian.json', JSON.stringify(payload));
writeFileSync(
  'packages/content/data/NOTICE.md',
  `# Données tierces\n\n## openrussian.json\n\n- Source : OpenRussian (https://en.openrussian.org), export publié sur https://github.com/Badestrand/russian-dictionary\n- Licence : Creative Commons Attribution – Partage dans les mêmes conditions 4.0 (CC BY-SA 4.0), https://creativecommons.org/licenses/by-sa/4.0/\n- Modifications : sous-ensemble des mots les plus fréquents, accents « ' » convertis en accent pédagogique, colonnes réduites.\n- Le fichier dérivé est diffusé sous la même licence. Les traductions anglaises/allemandes sont celles d'OpenRussian.\n`,
);
console.log(`${out.length} entrées écrites (${(JSON.stringify(payload).length / 1e6).toFixed(1)} Mo).`);
