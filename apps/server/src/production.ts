/**
 * Point d'entrée de production (hébergement mutualisé, ex. o2switch « Setup Node.js App » / Passenger).
 * Compilé en un seul fichier CommonJS (dist/server.cjs) : aucune installation de dépendances sur le serveur.
 * La configuration est lue dans les variables d'environnement, puis dans le fichier .env à côté de l'application.
 */
import { createServer } from 'node:http';
import { join } from 'node:path';
import { buildApp } from './app.js';
import { systemClock } from './clock.js';
import { loadConfig, loadDotEnv } from './config.js';
import { loadContent, syncContent } from './content-registry.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';

async function main(): Promise<void> {
  const appDir = process.env.APP_DIR ?? __dirname;
  loadDotEnv(join(appDir, '.env'));
  process.env.MIGRATIONS_DIR ??= join(appDir, 'migrations');
  process.env.WEB_DIST ??= join(appDir, 'web');
  const config = loadConfig();
  const db = createPool(config.databaseUrl);
  const content = loadContent({ allowPending: config.allowPendingContent });
  await migrate(db, (m) => console.log(m));
  await syncContent(db, content);
  const app = await buildApp({ db, content, clock: systemClock, config }, { logger: true });
  const shutdown = async () => {
    await app.close();
    await db.end();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  // Sous Passenger, le port est attribué par l'hébergeur (PORT) ; listen() est intercepté.
  await app.listen({ port: config.port, host: config.host });
  if (!config.registrationOpen) app.log.info('Inscriptions fermées (REGISTRATION_OPEN=false).');
}

/** Retire tout mot de passe d'un message (adresses postgres://user:motdepasse@…). */
export function redact(text: string): string {
  let out = text.replace(/(postgres(?:ql)?:\/\/[^:/@\s]+:)[^@\s]+@/gi, '$1***@');
  const pw = (() => {
    try {
      return decodeURIComponent(new URL(process.env.DATABASE_URL ?? '').password);
    } catch {
      return '';
    }
  })();
  if (pw.length >= 4) out = out.split(pw).join('***');
  return out;
}

/** Conseil en français selon l'erreur la plus probable. */
function hint(e: unknown): string {
  const err = e as { code?: string; message?: string };
  const msg = String(err?.message ?? e);
  if (!process.env.DATABASE_URL) return 'La variable DATABASE_URL est absente : ajoute-la dans Setup Node.js App, puis Restart.';
  if (err?.code === '28P01' || /password authentication failed/i.test(msg)) return 'Mot de passe ou nom d’utilisateur PostgreSQL refusé : vérifie DATABASE_URL (préfixe mobr…_, majuscules, mot de passe).';
  if (err?.code === '3D000' || /database .* does not exist/i.test(msg)) return 'La base indiquée dans DATABASE_URL n’existe pas : vérifie son nom exact (avec le préfixe du compte).';
  if (err?.code === '42501' || /permission denied/i.test(msg)) return 'L’utilisateur n’a pas le droit de créer des tables : associe-le à la base avec TOUS les privilèges (ou voir la commande GRANT dans le guide).';
  if (/ECONNREFUSED|ENOTFOUND|ETIMEDOUT/.test(msg)) return 'Serveur PostgreSQL injoignable : l’hôte doit être localhost et le port 5432.';
  if (/Invalid URL|invalid connection/i.test(msg)) return 'DATABASE_URL est mal formée (caractère spécial dans le mot de passe ?).';
  return 'Erreur inattendue : envoie ce message tel quel.';
}

/**
 * En cas d'échec, l'application ne s'arrête pas : elle affiche la cause (sans secret) à son adresse,
 * pour diagnostiquer sans accès aux journaux de l'hébergeur.
 */
function diagnosticServer(e: unknown): void {
  const err = e as { code?: string; message?: string; stack?: string };
  const body = [
    'Russian 365 — démarrage impossible',
    '',
    `Cause probable : ${hint(e)}`,
    '',
    `Message : ${redact(String(err?.message ?? e))}`,
    err?.code ? `Code : ${err.code}` : '',
    '',
    `Node ${process.version} · BASE_PATH=${process.env.BASE_PATH ?? '(absent)'} · DATABASE_URL ${process.env.DATABASE_URL ? 'présente' : 'ABSENTE'}`,
    '',
    'Après correction : Setup Node.js App → Restart.',
  ].join('\n');
  console.error(redact(String(err?.stack ?? e)));
  createServer((_req, res) => {
    res.writeHead(503, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
    res.end(body);
  }).listen(Number(process.env.PORT ?? 3000));
}

main().catch((e) => {
  console.error('Démarrage impossible :', redact(String((e as Error)?.message ?? e)));
  diagnosticServer(e);
});
