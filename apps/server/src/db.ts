import pg from 'pg';

export type Db = pg.Pool;
export type Tx = pg.PoolClient;

export function createPool(url: string): Db {
  return new pg.Pool({ connectionString: url, max: 10 });
}

/** Transaction avec réessai sur conflit de sérialisation / interblocage. */
export async function withTx<T>(db: Db, fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    const client = await db.connect();
    try {
      await client.query('BEGIN');
      const out = await fn(client);
      await client.query('COMMIT');
      return out;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => undefined);
      const code = (e as { code?: string }).code;
      if ((code === '40001' || code === '40P01') && attempt < 3) continue;
      throw e;
    } finally {
      client.release();
    }
  }
}

export async function appendEvent(tx: Tx | Db, userId: string, type: string, payload: unknown): Promise<void> {
  await tx.query('INSERT INTO events (user_id, type, payload) VALUES ($1, $2, $3)', [userId, type, JSON.stringify(payload)]);
}
