-- Validation des passerelles candidates par l'apprenant (§2.3 : seules les passerelles validées sont affichées).
CREATE TABLE bridge_reviews (
  user_id     uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bridge_id   text NOT NULL,
  version     integer NOT NULL,
  decision    text NOT NULL CHECK (decision IN ('approved','rejected')),
  decided_at  timestamptz NOT NULL,
  PRIMARY KEY (user_id, bridge_id, version)
);
