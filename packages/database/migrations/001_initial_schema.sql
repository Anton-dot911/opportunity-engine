CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
  type TEXT NOT NULL CHECK (type IN ('url', 'rss', 'atom', 'upload', 'api')),
  locator TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  polling_interval_seconds INTEGER CHECK (polling_interval_seconds IS NULL OR polling_interval_seconds >= 60),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (type, locator)
);

CREATE TABLE IF NOT EXISTS ingestion_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  items_seen INTEGER NOT NULL DEFAULT 0 CHECK (items_seen >= 0),
  items_created INTEGER NOT NULL DEFAULT 0 CHECK (items_created >= 0),
  error_summary TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ingestion_runs_source_created_idx ON ingestion_runs(source_id, created_at DESC);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  canonical_url TEXT,
  title TEXT,
  content TEXT,
  content_hash TEXT,
  published_at TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  language TEXT,
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'processed', 'failed', 'ignored')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CHECK (canonical_url IS NOT NULL OR content_hash IS NOT NULL)
);
CREATE UNIQUE INDEX IF NOT EXISTS documents_source_url_unique
  ON documents(source_id, canonical_url) WHERE canonical_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS documents_content_hash_idx ON documents(content_hash);
CREATE INDEX IF NOT EXISTS documents_collected_at_idx ON documents(collected_at DESC);

CREATE TABLE IF NOT EXISTS signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signal_type TEXT NOT NULL CHECK (signal_type IN
    ('market_change', 'demand', 'supply', 'price', 'regulation', 'technology', 'inefficiency', 'complaint', 'trend', 'event', 'other')),
  summary TEXT NOT NULL,
  observed_at TIMESTAMPTZ,
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'accepted', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signals_review_created_idx ON signals(review_status, created_at DESC);

CREATE TABLE IF NOT EXISTS context_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type TEXT NOT NULL,
  statement TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  epistemic_status TEXT NOT NULL
    CHECK (epistemic_status IN ('observed', 'inferred', 'assumed', 'verified', 'rejected', 'superseded')),
  confidence NUMERIC(4,3) CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
  provenance JSONB NOT NULL DEFAULT '[]'::jsonb,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  valid_from TIMESTAMPTZ,
  valid_to TIMESTAMPTZ,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);
CREATE INDEX IF NOT EXISTS context_items_type_recorded_idx ON context_items(item_type, recorded_at DESC);
CREATE INDEX IF NOT EXISTS context_items_payload_idx ON context_items USING GIN(payload);

CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  claim TEXT NOT NULL,
  polarity TEXT NOT NULL CHECK (polarity IN ('supports', 'contradicts', 'contextual')),
  locator TEXT,
  excerpt TEXT,
  reliability NUMERIC(4,3) CHECK (reliability IS NULL OR reliability BETWEEN 0 AND 1),
  verification_status TEXT NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified', 'verified', 'disputed', 'rejected')),
  observed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS evidence_document_idx ON evidence(document_id);
