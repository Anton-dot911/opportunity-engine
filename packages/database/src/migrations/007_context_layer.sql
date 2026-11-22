CREATE TABLE IF NOT EXISTS context_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  context_key TEXT NOT NULL UNIQUE,
  item_type TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  provenance JSONB NOT NULL DEFAULT '{}'::jsonb,
  priority INTEGER NOT NULL DEFAULT 50 CHECK (priority BETWEEN 0 AND 100),
  confidence NUMERIC(4,3) NOT NULL DEFAULT 0.5 CHECK (confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'review' CHECK (status IN ('draft', 'review', 'active', 'rejected', 'expired')),
  tags TEXT[] NOT NULL DEFAULT '{}',
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS context_items_status_priority_idx ON context_items(status, priority DESC, updated_at DESC);
CREATE INDEX IF NOT EXISTS context_items_type_idx ON context_items(item_type);
CREATE INDEX IF NOT EXISTS context_items_tags_idx ON context_items USING GIN(tags);