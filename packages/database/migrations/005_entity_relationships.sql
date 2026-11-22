ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS entity_processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (entity_processing_status IN ('pending', 'processing', 'processed', 'failed')),
  ADD COLUMN IF NOT EXISTS entity_processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_processing_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS entity_processing_error TEXT;

CREATE TABLE IF NOT EXISTS entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('organization')),
  canonical_name TEXT NOT NULL CHECK (length(trim(canonical_name)) BETWEEN 2 AND 240),
  normalized_name TEXT NOT NULL CHECK (length(trim(normalized_name)) BETWEEN 2 AND 240),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_type, normalized_name)
);

CREATE TABLE IF NOT EXISTS entity_aliases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  alias TEXT NOT NULL CHECK (length(trim(alias)) BETWEEN 2 AND 240),
  normalized_alias TEXT NOT NULL CHECK (length(trim(normalized_alias)) BETWEEN 2 AND 240),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (entity_id, normalized_alias)
);
CREATE INDEX IF NOT EXISTS entity_aliases_normalized_idx ON entity_aliases(normalized_alias);

CREATE TABLE IF NOT EXISTS entity_mentions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  signal_id UUID REFERENCES signals(id) ON DELETE SET NULL,
  mention_text TEXT NOT NULL,
  evidence_excerpt TEXT NOT NULL CHECK (length(trim(evidence_excerpt)) > 0),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  extraction_method TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'accepted', 'rejected')),
  dedup_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS entity_mentions_entity_idx ON entity_mentions(entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entity_mentions_document_idx ON entity_mentions(document_id);

CREATE TABLE IF NOT EXISTS entity_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  predicate TEXT NOT NULL CHECK (predicate IN ('acquired', 'partnered_with', 'launched')),
  object_entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  evidence_excerpt TEXT NOT NULL CHECK (length(trim(evidence_excerpt)) > 0),
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  extraction_method TEXT NOT NULL,
  review_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (review_status IN ('pending', 'accepted', 'rejected')),
  dedup_key TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (subject_entity_id <> object_entity_id)
);
CREATE INDEX IF NOT EXISTS entity_relationships_subject_idx ON entity_relationships(subject_entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS entity_relationships_object_idx ON entity_relationships(object_entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS documents_entity_pending_idx
  ON documents(processing_completed_at ASC)
  WHERE processing_status = 'processed' AND entity_processing_status IN ('pending', 'failed');
