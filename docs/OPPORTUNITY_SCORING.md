# Opportunity Scoring v1

## Purpose

Provide a reproducible, explainable prioritization aid. A score is not an approval decision, proof of demand, or a substitute for validation.

## Dimensions and weights

Each dimension is assessed on a 0–5 scale. A score must include a written rationale. Evidence references should point to existing evidence or research records.

| Dimension | Weight |
|---|---:|
| Evidence strength | 25% |
| Customer demand | 20% |
| Market potential | 15% |
| Economic viability | 20% |
| Execution feasibility | 10% |
| Defensibility | 10% |

## Calculation

- Known dimension scores are weighted and normalized to a 0–100 scale.
- Missing or null dimensions are excluded from the numerator and denominator; they are never treated as zero.
- Coverage is the sum of weights for dimensions with numeric scores.
- If coverage is below 60%, the rating is `insufficient_data`, even when the provisional numeric score is high.
- Ratings at sufficient coverage: <40 low; 40–59.99 moderate; 60–79.99 high; 80–100 very_high.

## Interpretation constraints

- Scores are operator assessments in v1, not AI-generated facts.
- Rationale is mandatory for every numeric dimension.
- Evidence references are stored separately from rationale.
- Every score is an immutable snapshot; reassessment creates a new record.
- Ranking is advisory. No score automatically changes opportunity status.
- Economic viability must remain unknown until supported by pricing, cost, margin, and capital evidence. Do not award a neutral or zero score merely because data is absent.

## API

- `POST /api/opportunities/:id/scores` — create a score snapshot.
- `GET /api/opportunities/:id/scores` — retrieve score history, newest first.
