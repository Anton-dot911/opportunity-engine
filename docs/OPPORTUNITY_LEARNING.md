# Opportunity Learning v1

## Purpose

Extract recurring, operator-recorded success and failure factors from realized opportunity feedback. The output is a set of reviewable learning candidates, not automatic model training or business policy.

## Deterministic generation

- Reads existing `opportunity_feedback` records only.
- Normalizes factor text for matching (trim, lowercase, collapse whitespace).
- A factor qualifies only when it appears in feedback from at least two distinct opportunities.
- Success and failure factors are aggregated separately.
- Each candidate preserves feedback IDs, distinct opportunity count, support count, and outcome counts.
- A stable SHA-256 fingerprint prevents duplicate candidate insertion on repeated generation.
- Existing candidates are not silently overwritten when new feedback arrives; v1 generation is insert-only.

## Human review

Candidates have `pending`, `accepted`, or `rejected` status. Review is explicit. Acceptance does not automatically promote the factor into shared context, alter opportunity scores, weights, status, or ranking, or trigger model training.

## API

- `POST /api/learning/insights/generate` — scan feedback and create qualifying candidates.
- `GET /api/learning/insights?status=pending` — list candidates; status is optional.
- `PATCH /api/learning/insights/:id/review` — set status to `accepted` or `rejected`; optional `reviewedBy`.

## Limitations

- Exact normalized-text recurrence only; semantic similarity and causal inference are out of scope.
- Two occurrences across two opportunities are a minimum recurrence threshold, not statistical proof.
- No automated research, recommendations, score recalibration, context promotion, or model fine-tuning.
- Factors remain operator-entered observations. The system does not establish that a factor caused an outcome.
