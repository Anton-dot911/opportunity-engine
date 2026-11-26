CREATE TABLE IF NOT EXISTS opportunity_learning_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  insight_id UUID NOT NULL REFERENCES opportunity_learning_insights(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL CHECK (previous_status IN ('pending','accepted','rejected')),
  new_status TEXT NOT NULL CHECK (new_status IN ('accepted','rejected')),
  reviewed_by TEXT NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS opportunity_learning_reviews_insight_idx
  ON opportunity_learning_reviews(insight_id, reviewed_at DESC);
