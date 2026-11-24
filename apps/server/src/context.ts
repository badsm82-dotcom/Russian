import type { Clock } from './clock.js';
import type { Config } from './config.js';
import type { ContentRegistry } from './content-registry.js';
import type { Db } from './db.js';

export interface AppContext {
  db: Db;
  content: ContentRegistry;
  clock: Clock;
  config: Config;
}

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
  }
}
