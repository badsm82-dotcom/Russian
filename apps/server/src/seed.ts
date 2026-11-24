import { randomUUID } from 'node:crypto';
/**
 * Données de démonstration : migre, synchronise le contenu et crée un compte A0 vierge.
 * Le mot de passe de démo est fourni par DEMO_PASSWORD (aucun secret dans le dépôt).
 */
import { a0Baseline, defaultLanguageProfile, defaultSettings } from '@r365/domain';
import { loadConfig } from './config.js';
import { loadContent, syncContent } from './content-registry.js';
import { createPool } from './db.js';
import { migrate } from './migrate.js';
import { hashPassword } from './modules/auth.js';

const config = loadConfig();
const db = createPool(config.databaseUrl);
try {
  await migrate(db, console.log);
  const content = loadContent({ allowPending: config.allowPendingContent });
  const { inserted } = await syncContent(db, content);
  console.log(`Contenu synchronisé (${inserted} nouvelle(s) version(s) d'exercice).`);
  const email = process.env.DEMO_EMAIL ?? 'demo@russian365.local';
  const password = process.env.DEMO_PASSWORD;
  if (!password) {
    console.log('DEMO_PASSWORD non défini : aucun compte de démonstration créé.');
  } else {
    const exists = await db.query('SELECT 1 FROM users WHERE lower(email) = lower($1)', [email]);
    if (exists.rowCount) console.log(`Compte de démonstration déjà présent : ${email}`);
    else {
      const s = defaultSettings();
      const u = await db.query<{ id: string }>('INSERT INTO users (id, email, password_hash, timezone) VALUES ($4,$1,$2,$3) RETURNING id', [email, await hashPassword(password), s.timezone, randomUUID()]);
      await db.query('INSERT INTO learner_profiles (user_id, languages, interests, daily_minutes, baseline, settings) VALUES ($1,$2,$3,$4,$5,$6)', [
        u.rows[0]!.id, JSON.stringify(defaultLanguageProfile()), JSON.stringify(s.interests), s.daily_minutes, JSON.stringify(a0Baseline()), JSON.stringify(s),
      ]);
      console.log(`Compte de démonstration A0 créé : ${email}`);
    }
  }
} finally {
  await db.end();
}
