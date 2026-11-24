/** Configuration par variables d'environnement (aucun secret dans le dépôt, voir .env.example). */
import { existsSync, readFileSync } from 'node:fs';

export interface Config {
  databaseUrl: string;
  port: number;
  host: string;
  tokenTtlDays: number;
  /** Autorise l'usage du contenu « pending_review » (développement/pilote). En production : false. */
  allowPendingContent: boolean;
  webDist: string | null;
  logLevel: string;
  /** Chemin public de l'application, ex. « /russian » (hébergement dans un sous-dossier). Vide = racine. */
  basePath: string;
  /** false : plus aucune inscription possible (usage personnel une fois son compte créé). */
  registrationOpen: boolean;
}

export function normalizeBasePath(p: string | undefined): string {
  const t = (p ?? '').trim().replace(/\/+$/, '');
  if (!t || t === '/') return '';
  return t.startsWith('/') ? t : `/${t}`;
}

/**
 * Charge un fichier .env simple (CLE=valeur) sans écraser les variables déjà définies.
 * Utile sur un hébergement mutualisé où l'on ne passe pas d'option à node.
 */
export function loadDotEnv(path: string): void {
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
    if (!m || line.trim().startsWith('#')) continue;
    const key = m[1]!;
    let value = m[2]!;
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    if (process.env[key] === undefined) process.env[key] = value;
  }
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
    basePath: normalizeBasePath(env.BASE_PATH),
    registrationOpen: (env.REGISTRATION_OPEN ?? 'true') === 'true',
  };
}
