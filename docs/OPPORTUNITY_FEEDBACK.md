# Opportunity Feedback v1

## Purpose

Record operator-supplied realized outcomes and lessons for an opportunity. Feedback is an auditable historical record, not an automatic reassessment.

## Scope and guardrails

- Feedback is append-only: v1 exposes create and list operations only.
- Outcomes are `achieved`, `partially_achieved`, `not_achieved`, or `unknown`.
- Actual metrics are optional. When supplied, each metric requires a name, value, unit, and reporting period; evidence references are optional.
- Success factors, failure factors, findings, and evidence are explicitly supplied by the operator.
- A feedback record may reference a validation belonging to the same opportunity.
- Feedback does not change opportunity status, scores, score weights, or ranking.
- No forecast-versus-actual variance is calculated in v1 because the current score model is not a quantified forecast model.
- Feedback is not automatically promoted into shared context. Human review is required before any later context-ingestion workflow.

## API

- `POST /api/opportunities/:id/feedback` — append a realized-outcome record.
- `GET /api/opportunities/:id/feedback` — list feedback, newest first.

## Example

```json
{
  "outcome": "partially_achieved",
  "actualMetrics": [
    { "name": "monthly_revenue", "value": 12500, "unit": "USD", "period": "2026-10" }
  ],
  "successFactors": ["Existing distribution relationships"],
  "failureFactors": ["Customer acquisition took longer than planned"],
  "findings": "Operator-entered post-launch review.",
  "evidence": [{ "type": "report", "ref": "internal-report-2026-10" }]
}
```

All values above are illustrative. The API does not infer or fabricate actual results.
