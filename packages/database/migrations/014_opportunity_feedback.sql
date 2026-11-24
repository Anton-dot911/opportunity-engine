CREATE TABLE IF NOT EXISTS opportunity_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  validation_id UUID NULL REFERENCES opportunity_validations(id) ON DELETE SET NULL,
  outcome TEXT NOT NULL CHECK (outcome IN ('achieved','partially_achieved','not_achieved','unknown')),
  actual_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,
  success_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  failure_factors JSONB NOT NULL DEFAULT '[]'::jsonb,
  findings TEXT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  recorded_by TEXT NULL,
  occurred_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_feedback_opportunity_idx
  ON opportunity_feedback(opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_feedback_validation_idx
  ON opportunity_feedback(validation_id) WHERE validation_id IS NOT NULL;
