// Construit le paquet de déploiement dans release/ :
//   release/app.js            point d'entrée (fichier de démarrage pour Passenger / « Setup Node.js App »)
//   release/server.cjs        serveur + domaine + contenu, compilés en un seul fichier
//   release/migrations/       migrations SQL
//   release/web/              interface (build Vite, servie par le serveur)
//   release/package.json      minimal (aucune dépendance à installer)
//   release/.env.exemple      modèle de configuration (sans secret)
// Usage : BASE_PATH=/russian node scripts/build-release.mjs
import { build } from 'esbuild';
import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';

const basePath = (process.env.BASE_PATH ?? '/russian').replace(/\/+$/, '');
const out = 'release';
rmSync(out, { recursive: true, force: true });
mkdirSync(out);

await build({
  entryPoints: ['apps/server/src/production.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: `${out}/server.cjs`,
  external: ['pg-native'],
  sourcemap: false,
  legalComments: 'none',
  logLevel: 'warning',
});

execSync('npm run build -w @r365/web', { stdio: 'inherit', env: { ...process.env, VITE_BASE: `${basePath}/` } });
cpSync('apps/web/dist', `${out}/web`, { recursive: true });
cpSync('apps/server/migrations', `${out}/migrations`, { recursive: true });

writeFileSync(`${out}/app.js`, "// Fichier de démarrage (Passenger / Setup Node.js App).\nrequire('./server.cjs');\n");
writeFileSync(
  `${out}/package.json`,
  JSON.stringify({ name: 'russian-365', version: '0.1.0', private: true, main: 'app.js', engines: { node: '>=20' } }, null, 2) + '\n',
);
writeFileSync(
  `${out}/.env.exemple`,
  [
    '# Copier en .env sur le serveur (à côté de app.js) et remplir. Ne jamais commiter ce fichier.',
    'DATABASE_URL=postgres://UTILISATEUR:MOT_DE_PASSE@localhost:5432/BASE',
    `BASE_PATH=${basePath}`,
    '# Passer à false une fois ton compte créé : plus personne ne peut s’inscrire.',
    'REGISTRATION_OPEN=true',
    'ALLOW_PENDING_CONTENT=true',
    'TOKEN_TTL_DAYS=90',
    'LOG_LEVEL=warn',
    '',
  ].join('\n'),
);
console.log(`Paquet prêt dans ${out}/ (chemin public ${basePath || '/'})`);
