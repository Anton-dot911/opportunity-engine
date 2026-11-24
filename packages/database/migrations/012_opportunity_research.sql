CREATE TABLE IF NOT EXISTS opportunity_research (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
 status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
 questions JSONB NOT NULL DEFAULT '[]'::jsonb,
 findings JSONB NOT NULL DEFAULT '[]'::jsonb,
 evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
 unknowns JSONB NOT NULL DEFAULT '[]'::jsonb,
 conclusion TEXT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 UNIQUE(opportunity_id)
);
CREATE INDEX IF NOT EXISTS opportunity_research_status_idx ON opportunity_research(status, updated_at DESC);
