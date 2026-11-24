-- Russian 365 — schéma initial (§15). UUID, clés étrangères, contraintes d'unicité, index de révision.
-- Compatible PostgreSQL ≥ 9.6 (hébergement mutualisé) : les UUID sont générés par l'application,
-- et les déclencheurs utilisent EXECUTE PROCEDURE (EXECUTE FUNCTION n'existe qu'à partir de PostgreSQL 11).

CREATE TABLE users (
  id               uuid PRIMARY KEY,
  email            text NOT NULL,
  password_hash    text NOT NULL,
  locale           text NOT NULL DEFAULT 'fr',
  timezone         text NOT NULL DEFAULT 'Europe/Zurich',
  consent_version  text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX users_email_lower_uq ON users (lower(email));

CREATE TABLE auth_tokens (
  token_hash  text PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL
);
CREATE INDEX auth_tokens_user_idx ON auth_tokens (user_id);

CREATE TABLE learner_profiles (
  user_id        uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  languages      jsonb NOT NULL,
  interests      jsonb NOT NULL,
  daily_minutes  integer NOT NULL,
  baseline       jsonb NOT NULL,
  settings       jsonb NOT NULL,
  onboarded      boolean NOT NULL DEFAULT false,
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- Contenu versionné (synchronisé depuis @r365/content). Les versions d'exercices sont immuables (audit).
CREATE TABLE units (
  id        text PRIMARY KEY,
  ord       integer NOT NULL UNIQUE,
  level     text NOT NULL,
  title_fr  text NOT NULL,
  payload   jsonb NOT NULL
);

CREATE TABLE knowledge_items (
  id        uuid PRIMARY KEY,
  slug      text NOT NULL UNIQUE,
  type      text NOT NULL CHECK (type IN ('letter','lexeme','structure')),
  unit_id   text NOT NULL REFERENCES units(id),
  version   integer NOT NULL,
  status    text NOT NULL,
  payload   jsonb NOT NULL
);

CREATE TABLE exercises (
  id          uuid NOT NULL,
  version     integer NOT NULL,
  slug        text NOT NULL,
  item_id     uuid NOT NULL REFERENCES knowledge_items(id),
  type        text NOT NULL,
  competency  text NOT NULL,
  unit_id     text NOT NULL REFERENCES units(id),
  status      text NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id, version)
);
CREATE INDEX exercises_slug_idx ON exercises (slug);

CREATE TABLE language_bridges (
  id                  text NOT NULL,
  version             integer NOT NULL,
  concept_id          text NOT NULL,
  source_language     text NOT NULL,
  source_expression   text NOT NULL,
  russian_expression  text NOT NULL,
  bridge_type         text NOT NULL,
  elementary          boolean NOT NULL,
  explanation_fr      text NOT NULL,
  limitations_fr      text NOT NULL,
  validation_status   text NOT NULL,
  source_reference    text NOT NULL,
  PRIMARY KEY (id, version)
);

-- Données apprenant
CREATE TABLE sessions (
  id                uuid PRIMARY KEY,
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planned_minutes   integer NOT NULL,
  mode              text NOT NULL DEFAULT 'standard',
  unit_id           text REFERENCES units(id),
  steps             jsonb NOT NULL,
  explanations      jsonb NOT NULL DEFAULT '[]',
  cursor            integer NOT NULL DEFAULT 0,
  assisted_steps    integer[] NOT NULL DEFAULT '{}',
  state             text NOT NULL DEFAULT 'active' CHECK (state IN ('active','completed','abandoned')),
  started_at        timestamptz NOT NULL,
  last_activity_at  timestamptz NOT NULL,
  ended_at          timestamptz
);
CREATE INDEX sessions_user_state_idx ON sessions (user_id, state);
-- Une seule séance active par apprenant.
CREATE UNIQUE INDEX sessions_one_active_uq ON sessions (user_id) WHERE state = 'active';

CREATE TABLE taught_items (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES knowledge_items(id),
  session_id  uuid REFERENCES sessions(id) ON DELETE SET NULL,
  taught_at   timestamptz NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE attempts (
  id                 uuid PRIMARY KEY,
  user_id            uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_attempt_id  uuid NOT NULL,
  session_id         uuid REFERENCES sessions(id) ON DELETE SET NULL,
  step_index         integer,
  exercise_id        uuid NOT NULL,
  exercise_version   integer NOT NULL,
  item_id            uuid NOT NULL REFERENCES knowledge_items(id),
  competency         text NOT NULL,
  purpose            text NOT NULL,
  mode               text NOT NULL DEFAULT 'standard',
  answer             jsonb NOT NULL,
  outcome            text NOT NULL CHECK (outcome IN ('correct','incorrect','unscorable','abandoned')),
  grade              smallint CHECK (grade BETWEEN 0 AND 3),
  assisted           boolean NOT NULL,
  in_context         boolean NOT NULL DEFAULT false,
  remediation        boolean NOT NULL DEFAULT false,
  early_review       boolean NOT NULL DEFAULT false,
  duration_ms        integer NOT NULL CHECK (duration_ms >= 0),
  error_codes        text[] NOT NULL DEFAULT '{}',
  feedback_fr        text NOT NULL DEFAULT '',
  occurred_at        timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (exercise_id, exercise_version) REFERENCES exercises(id, version),
  UNIQUE (user_id, client_attempt_id)
);
CREATE INDEX attempts_user_time_idx ON attempts (user_id, occurred_at);
CREATE INDEX attempts_user_item_idx ON attempts (user_id, item_id, competency, occurred_at);

CREATE TABLE review_states (
  user_id              uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id              uuid NOT NULL REFERENCES knowledge_items(id),
  competency           text NOT NULL,
  stage                integer NOT NULL DEFAULT 0,
  due_at               timestamptz,
  last_grade           smallint,
  streak               integer NOT NULL DEFAULT 0,
  remediation_pending  boolean NOT NULL DEFAULT false,
  mastery_status       text NOT NULL DEFAULT 'new',
  updated_at           timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id, competency)
);
CREATE INDEX review_states_due_idx ON review_states (user_id, due_at);

CREATE TABLE bridge_attempts (
  id                     uuid PRIMARY KEY,
  user_id                uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bridge_id              text NOT NULL,
  bridge_version         integer NOT NULL,
  concept_id             text NOT NULL,
  context                text NOT NULL CHECK (context IN ('lesson','exercise')),
  session_id             uuid REFERENCES sessions(id) ON DELETE SET NULL,
  shown_at               timestamptz NOT NULL,
  helpful_feedback       boolean,
  delayed_recall_result  jsonb,
  FOREIGN KEY (bridge_id, bridge_version) REFERENCES language_bridges(id, version)
);
CREATE INDEX bridge_attempts_user_idx ON bridge_attempts (user_id, concept_id);

-- Journal d'événements append-only (attempt.recorded, review.scheduled, session.completed…).
CREATE TABLE events (
  id          bigserial PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type        text NOT NULL,
  payload     jsonb NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX events_user_idx ON events (user_id, id);

CREATE OR REPLACE FUNCTION events_append_only() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'events is append-only';
  END IF;
  RETURN OLD;
END $$ LANGUAGE plpgsql;
-- Les suppressions restent possibles (suppression de compte, droit à l'effacement) ; les mises à jour non.
CREATE TRIGGER events_no_update BEFORE UPDATE ON events FOR EACH ROW EXECUTE PROCEDURE events_append_only();
