CREATE TABLE IF NOT EXISTS hypothesis_entities (
  hypothesis_id UUID NOT NULL REFERENCES hypotheses(id) ON DELETE CASCADE,
  entity_id UUID NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'subject' CHECK (role IN ('subject', 'affected_party', 'competitor', 'partner', 'context')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (hypothesis_id, entity_id, role)
);
CREATE INDEX IF NOT EXISTS hypothesis_entities_entity_idx
  ON hypothesis_entities(entity_id, created_at DESC);

CREATE INDEX IF NOT EXISTS entity_mentions_document_review_idx
  ON entity_mentions(document_id, review_status, entity_id);
