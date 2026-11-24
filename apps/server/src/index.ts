import { buildApp } from './app.js';
import { systemClock } from './clock.js';
import { loadConfig } from './config.js';
import { loadContent, syncContent } from './content-registry.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';

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

await app.listen({ port: config.port, host: config.host });
if (!config.allowPendingContent) {
  app.log.warn('ALLOW_PENDING_CONTENT=false : seuls les contenus validés par un russophone sont servis.');
}
