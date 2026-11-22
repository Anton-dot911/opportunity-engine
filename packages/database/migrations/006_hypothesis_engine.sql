CREATE TABLE IF NOT EXISTS hypotheses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hypothesis_key TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  statement TEXT NOT NULL,
  mechanism TEXT NOT NULL,
  assumptions JSONB NOT NULL DEFAULT '[]'::jsonb,
  falsification_criteria TEXT NOT NULL,
  confidence NUMERIC(4,3) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'active', 'rejected', 'superseded')),
  generation_method TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS hypotheses_status_updated_idx ON hypotheses(status, updated_at DESC);

CREATE TABLE IF NOT EXISTS hypothesis_evidence (
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  signal_id UUID NOT NULL REFERENCES signals(id) ON DELETE CASCADE,
  contribution TEXT NOT NULL DEFAULT 'supporting' CHECK (contribution IN ('supporting', 'contradicting', 'contextual')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hypothesis_id, signal_id)
);
CREATE INDEX IF NOT EXISTS hypothesis_evidence_signal_idx ON hypothesis_evidence(signal_id);