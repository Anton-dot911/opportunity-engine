CREATE TABLE IF NOT EXISTS opportunity_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  version TEXT NOT NULL DEFAULT 'v1',
  dimensions JSONB NOT NULL,
  weighted_score NUMERIC(5,2),
  coverage_percent NUMERIC(5,2) NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('insufficient_data','low','moderate','high','very_high')),
  rationale JSONB NOT NULL DEFAULT '{}'::jsonb,
  evidence_refs JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_scores_latest_idx
  ON opportunity_scores(opportunity_id, created_at DESC);
