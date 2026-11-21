# Implementation Roadmap

## Current milestone: Document Pipeline

### Completed
- [x] Phase 0 Foundation: workspace, PWA, API, PostgreSQL, migrations, CI.
- [x] Source registry and RSS/Atom parser.
- [x] Operator-triggered RSS/Atom ingestion and ingestion-run tracking.
- [x] Persist feed entries with source URL and content-hash deduplication.
- [x] Article fetcher connector (bounded redirects, timeout, HTTP(S), content-type validation).
- [x] Readability article extraction connector (this branch; awaiting CI and merge).

### In progress / remaining
- [ ] Fix CI regression introduced by PR #4.
- [ ] Add streaming article response-size enforcement.
- [ ] Wire fetch + extraction into document ingestion.
- [ ] Persist extracted text, extractor version, language, and processing errors.
- [ ] Make document processing status and retry behavior reliable.
- [ ] Manual URL/document ingestion.
- [ ] Scheduled RSS/Atom collection.

### Later milestones
| Milestone | Deliverable | Exit evidence |
|---|---|---|
| AI Runtime | Provider-neutral structured generation | Validated output from adapter test |
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
