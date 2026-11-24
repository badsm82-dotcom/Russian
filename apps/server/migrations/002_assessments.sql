-- Bilans (§12, §15 Assessment / AssessmentResult). Compatible PostgreSQL ≥ 9.5.
-- Le passage conserve le sujet complet (avec corrigé) côté serveur : rien n'est envoyé au client avant la remise.
CREATE TABLE assessment_runs (
  id             uuid PRIMARY KEY,
  user_id        uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assessment_id  text NOT NULL,
  version        integer NOT NULL,
  spec           jsonb NOT NULL,
  answers        jsonb NOT NULL DEFAULT '{}',
  state          text NOT NULL DEFAULT 'in_progress' CHECK (state IN ('in_progress','submitted','abandoned')),
  scores         jsonb,
  passed         boolean,
  started_at     timestamptz NOT NULL,
  submitted_at   timestamptz
);
CREATE INDEX assessment_runs_user_idx ON assessment_runs (user_id, assessment_id, started_at);
