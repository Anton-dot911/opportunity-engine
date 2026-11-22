CREATE TABLE IF NOT EXISTS context_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent TEXT NOT NULL,
  task TEXT NOT NULL,
  selection JSONB NOT NULL DEFAULT '{}'::jsonb,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  item_count INTEGER NOT NULL DEFAULT 0 CHECK (item_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS context_packages_created_at_idx ON context_packages(created_at DESC);
