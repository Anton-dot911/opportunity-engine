CREATE TABLE IF NOT EXISTS ai_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL,
  task_type TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded','failed')),
  input_tokens INTEGER NULL CHECK (input_tokens IS NULL OR input_tokens >= 0),
  output_tokens INTEGER NULL CHECK (output_tokens IS NULL OR output_tokens >= 0),
  estimated_cost_usd NUMERIC(14,8) NULL CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
  duration_ms INTEGER NOT NULL CHECK (duration_ms >= 0),
  attempts INTEGER NOT NULL CHECK (attempts >= 1),
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_execution_logs_run_idx ON ai_execution_logs(run_id, created_at);
CREATE INDEX IF NOT EXISTS ai_execution_logs_created_idx ON ai_execution_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS opportunity_research_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
  research_id UUID NOT NULL REFERENCES opportunity_research(id) ON DELETE CASCADE,
  ai_run_id UUID NULL,
  status TEXT NOT NULL CHECK (status IN ('succeeded','failed')),
  iteration INTEGER NOT NULL CHECK (iteration >= 1),
  input_snapshot JSONB NOT NULL,
  output_snapshot JSONB NULL,
  next_action TEXT NULL,
  error_code TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_research_runs_opportunity_idx
  ON opportunity_research_runs(opportunity_id, created_at DESC);
