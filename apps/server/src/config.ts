/** Configuration par variables d'environnement (aucun secret dans le dépôt, voir .env.example). */
export interface Config {
  databaseUrl: string;
  port: number;
  host: string;
  tokenTtlDays: number;
  /** Autorise l'usage du contenu « pending_review » (développement/pilote). En production : false. */
  allowPendingContent: boolean;
  webDist: string | null;
  logLevel: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    databaseUrl: env.DATABASE_URL ?? 'postgres://r365:r365@localhost:5432/r365',
    port: Number(env.PORT ?? 3000),
    host: env.HOST ?? '127.0.0.1',
    tokenTtlDays: Number(env.TOKEN_TTL_DAYS ?? 30),
    allowPendingContent: (env.ALLOW_PENDING_CONTENT ?? 'true') === 'true',
    webDist: env.WEB_DIST ?? null,
    logLevel: env.LOG_LEVEL ?? 'info',
  };
}
