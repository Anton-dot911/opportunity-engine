ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS signal_processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (signal_processing_status IN ('pending', 'processing', 'processed', 'failed')),
  ADD COLUMN IF NOT EXISTS signal_processing_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signal_processing_completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS signal_processing_error TEXT;

ALTER TABLE signals
  ADD COLUMN IF NOT EXISTS dedup_key TEXT,
  ADD COLUMN IF NOT EXISTS extraction_method TEXT NOT NULL DEFAULT 'manual';

CREATE UNIQUE INDEX IF NOT EXISTS signals_dedup_key_unique
  ON signals(dedup_key) WHERE dedup_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS documents_signal_pending_idx
  ON documents(processing_completed_at ASC)
  WHERE processing_status = 'processed' AND signal_processing_status IN ('pending', 'failed');
