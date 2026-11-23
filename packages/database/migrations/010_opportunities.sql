CREATE TABLE IF NOT EXISTS opportunities (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 hypothesis_id UUID NOT NULL UNIQUE REFERENCES hypotheses(id) ON DELETE CASCADE,
 title TEXT NOT NULL,
 problem TEXT NOT NULL,
 target_segment TEXT NOT NULL,
 value_capture_mechanism TEXT NOT NULL,
 proposed_solution TEXT NOT NULL,
 evidence JSONB NOT NULL DEFAULT '{}'::jsonb,
 assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
 unknowns JSONB NOT NULL DEFAULT '[]'::jsonb,
 economics JSONB NOT NULL DEFAULT '{}'::jsonb,
 risks JSONB NOT NULL DEFAULT '[]'::jsonb,
 validation_step TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','review','rejected','approved_for_validation')),
 rejection_reason TEXT,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunities_status_updated_idx ON opportunities(status, updated_at DESC);
