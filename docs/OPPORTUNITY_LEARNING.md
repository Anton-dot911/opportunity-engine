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

Candidates have `pending`, `accepted`, or `rejected` status. Review is explicit. Each review transition is appended to `opportunity_learning_reviews`, preserving previous/new status, reviewer, and timestamp. Acceptance does not automatically promote the factor into shared context, alter opportunity scores, weights, status, or ranking, or trigger model training.

## API

- `POST /api/learning/insights/generate` — scan feedback and create or refresh qualifying candidates.
- `GET /api/learning/insights?status=pending` — list candidates; status is optional.
- `PATCH /api/learning/insights/:id/review` — set status to `accepted` or `rejected`; optional `reviewedBy`.
- `GET /api/learning/insights/:id/reviews` — retrieve the append-only review history for an insight.

## Evidence analysis v1

`GET /api/learning/analysis` derives a read-only analysis from existing learning insights:

- Factor classification uses deterministic keyword groups: distribution, pricing, product, customer, operations, marketing, finance, regulation, technology, or other.
- Outcome analysis reports recorded achieved, partially achieved, not achieved, and unknown counts, plus a descriptive positive-outcome rate.
- Contradiction detection flags the same normalized factor when it appears as both a success and failure factor; it does not resolve the conflict.
- Evidence strength is a recurrence heuristic based on support count and distinct opportunity count: limited, moderate, or strong.
- Learning recommendations are advisory: collect more independent feedback, inspect outcome variation, review conflicting feedback, or retain the observed pattern.

The analysis is computed at read time. It does not write to learning insights, Context Layer, opportunity scores, ranking, or opportunity lifecycle status.

## Limitations

- Exact normalized-text recurrence only; semantic similarity and causal inference are out of scope.
- Two distinct opportunities are a minimum recurrence threshold, not statistical proof.
- No automated research, score recalibration, context promotion, or model fine-tuning; recommendations in the evidence-analysis endpoint are advisory only.
- Factors remain operator-entered observations. The system does not establish that a factor caused an outcome.
- Keyword classification uses an initial English-language keyword taxonomy and may be incomplete or ambiguous; unmatched statements are classified as `other`.
- Outcome rates are descriptive summaries of recorded feedback, not forecasts or causal estimates.
