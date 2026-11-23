CREATE TABLE IF NOT EXISTS opportunity_validations (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 hypothesis TEXT NOT NULL,
 method TEXT NOT NULL,
 success_criteria TEXT NOT NULL,
 budget_estimate NUMERIC NULL CHECK (budget_estimate IS NULL OR budget_estimate >= 0),
 currency TEXT NULL,
 timebox_days INTEGER NOT NULL CHECK (timebox_days BETWEEN 1 AND 365),
 status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
 outcome TEXT NULL CHECK (outcome IN ('confirmed','not_confirmed','inconclusive')),
 findings TEXT NULL,
 evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 CHECK ((status = 'completed' AND outcome IS NOT NULL) OR (status <> 'completed' AND outcome IS NULL))
);
CREATE INDEX IF NOT EXISTS opportunity_validations_opportunity_idx ON opportunity_validations(opportunity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS opportunity_validations_status_idx ON opportunity_validations(status, updated_at DESC);
