import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createPool, type Db } from './db.js';
import { loadConfig } from './config.js';

/** Dossier des migrations : MIGRATIONS_DIR (paquet de production) ou ../migrations à côté des sources. */
function migrationsDir(): string {
  return process.env.MIGRATIONS_DIR ?? join(dirname(fileURLToPath(import.meta.url)), '..', 'migrations');
}

/** Migrations SQL versionnées, appliquées une fois chacune, dans l'ordre, sous verrou consultatif. */
export async function migrate(db: Db, log: (m: string) => void = () => undefined): Promise<string[]> {
  const client = await db.connect();
  const applied: string[] = [];
  try {
    await client.query('SELECT pg_advisory_lock(365365)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await client.query<{ version: string }>('SELECT version FROM schema_migrations')).rows.map((r) => r.version));
    const files = (await readdir(migrationsDir())).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = await readFile(join(migrationsDir(), f), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [f]);
        await client.query('COMMIT');
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      }
      applied.push(f);
      log(`migration appliquée : ${f}`);
    }
  } finally {
    await client.query('SELECT pg_advisory_unlock(365365)').catch(() => undefined);
    client.release();
  }
  return applied;
}

if (process.argv[1]?.endsWith('migrate.ts')) {
  const db = createPool(loadConfig().databaseUrl);
  migrate(db, console.log)
    .then((a) => console.log(a.length ? `${a.length} migration(s) appliquée(s).` : 'Base à jour.'))
    .finally(() => db.end());
}
