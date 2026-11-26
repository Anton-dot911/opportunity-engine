# Opportunity Learning v1

## Purpose

Extract recurring, operator-recorded success and failure factors from realized opportunity feedback. The output is a set of reviewable learning candidates, not automatic model training or business policy.

## Deterministic generation

- Reads existing `opportunity_feedback` records only.
- Normalizes factor text with trim, locale-independent lowercase, and whitespace collapsing.
- Counts a factor at most once per feedback record.
- A factor qualifies only when it appears in feedback from at least two distinct opportunities.
- Success and failure factors are aggregated separately.
- Each candidate preserves feedback IDs, distinct opportunity count, support count, and outcome counts.
- A stable SHA-256 fingerprint prevents duplicate candidate insertion on repeated generation.
- Repeated generation refreshes provenance and aggregate counts for existing fingerprints without changing their review status.

## Human review

Candidates have `pending`, `accepted`, or `rejected` status. Review is explicit. Each review transition is appended to `opportunity_learning_reviews`, preserving previous/new status, reviewer, and timestamp. Acceptance does not automatically promote the factor into shared context, alter opportunity scores, weights, status, or ranking, or trigger model training. Accepted insights may be supplied as additional context to a Research Loop run; they remain contextual patterns, not proof about the selected opportunity.

## API

- `POST /api/learning/insights/generate` — scan feedback and create or refresh qualifying candidates.
- `GET /api/learning/insights?status=pending` — list candidates; status is optional.
- `PATCH /api/learning/insights/:id/review` — set status to `accepted` or `rejected`; optional `reviewedBy`.
- `GET /api/learning/insights/:id/reviews` — retrieve the append-only review history for an insight.

## Limitations

- Exact normalized-text recurrence only; semantic similarity and causal inference are out of scope.
- Two distinct opportunities are a minimum recurrence threshold, not statistical proof.
- No automated research, recommendations, score recalibration, context promotion, or model fine-tuning.
- Factors remain operator-entered observations. The system does not establish that a factor caused an outcome.
