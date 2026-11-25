CREATE TABLE IF NOT EXISTS opportunity_learning_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('success_factor','failure_factor')),
  statement TEXT NOT NULL,
  support_count INTEGER NOT NULL CHECK (support_count >= 2),
  opportunity_count INTEGER NOT NULL CHECK (opportunity_count >= 2),
  feedback_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  outcome_counts JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected')),
  reviewed_at TIMESTAMPTZ NULL,
  reviewed_by TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_learning_insights_status_idx
  ON opportunity_learning_insights(status, created_at DESC);
