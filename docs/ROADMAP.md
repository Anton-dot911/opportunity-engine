# Implementation Roadmap

## Current milestone: Foundation

- [ ] Confirm repository conventions and default branch.
- [ ] Add application workspace skeleton.
- [ ] Add strict TypeScript configuration.
- [ ] Add formatting, linting, and tests.
- [ ] Add validated environment configuration.
- [ ] Add PostgreSQL Docker Compose service and health check.
- [ ] Add API health endpoint.
- [ ] Add CI workflow for install, lint, type-check, and tests.
- [ ] Verify clean setup from documented instructions.

### Foundation exit criteria

- Fresh checkout installs using documented commands.
- Web and API processes start locally.
- API health endpoint returns structured status.
- Database starts locally and connectivity is verified.
- Lint, type-check, and tests pass.
- No secrets are committed.

## Subsequent milestones

| Milestone | Deliverable | Exit evidence |
|---|---|---|
| AI Runtime | Provider-neutral structured generation | Validated output from adapter test |
| Discovery | Source registry and RSS/manual ingestion | Collected items with provenance |
| Document Pipeline | Normalization, extraction, deduplication | Repeated ingestion creates no duplicates |
| Signal Engine | Evidence-linked candidate signals | Signal links to source document |
| Context Layer | Versioned context and relationships | Retrieval/update integration test |
| Hypothesis Engine | Falsifiable hypotheses | Evidence, assumptions, falsification criteria present |
| Opportunity Engine | Structured business cases | Value-capture mechanism and economics captured |
| Validation | Research tasks and evidence updates | Unknowns marked supported/contradicted/unresolved |
| Ranking | Explainable deterministic scores | Reproducible score breakdown |
| Research Loop | Bounded orchestration | Stops at budget/iteration limit |
| Experiments | Operator-approved tracking | Outcome updates context and opportunity history |

## Delivery policy

Work one milestone at a time. Keep changes small and reviewable. Do not mark tasks complete without verification evidence. Update PLAN.md and this roadmap as milestones are completed. Defer optimization until profiling or a concrete requirement justifies it.