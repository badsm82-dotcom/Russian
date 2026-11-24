/**
 * Point d'entrée de production (hébergement mutualisé, ex. o2switch « Setup Node.js App » / Passenger).
 * Compilé en un seul fichier CommonJS (dist/server.cjs) : aucune installation de dépendances sur le serveur.
 * La configuration est lue dans les variables d'environnement, puis dans le fichier .env à côté de l'application.
 */
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

main().catch((e) => {
  console.error('Démarrage impossible :', e);
  process.exit(1);
});
