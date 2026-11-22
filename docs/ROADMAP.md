# Implementation Roadmap

## Current milestone: Context Packages v1

### Completed
- [x] Foundation: workspace, PWA, API, PostgreSQL, migrations, CI.
- [x] Source registry and RSS/Atom parsing/ingestion with run tracking.
- [x] Document processing: secure fetch, extraction, normalized content, retryable lifecycle.
- [x] SSRF hardening with DNS validation/pinning and redirect revalidation.
- [x] Deterministic Signal Engine v1; signals retain source document and evidence excerpt.
- [x] Entity & Relationship Layer v1; organization mentions and explicit relationships retain evidence and pending-review status.
- [x] Hypothesis Engine v1: recurring signal-category clusters, minimum two distinct documents, draft hypotheses with assumptions, mechanism, falsification criteria, confidence ceiling, and evidence links.
- [x] Context Layer v1: generic context items with provenance, priority, confidence, lifecycle, validity, tags, retrieval, and operator review API.
- [ ] Context Packages v1: dynamic, task-specific selection of active context items with immutable snapshots and retrieval API.

### Current implementation limitations
- Signal and entity extraction are deterministic heuristics; false positives are expected and require review.
- Hypothesis generation groups by signal category, not yet by resolved entities, geography, customer segments, or specific market problems.
- Hypotheses are generic candidate patterns, not validated business cases.
- Manual URL/document ingestion, scheduled collection, context retrieval, AI Runtime, validation, opportunity economics, and ranking remain future work.

### Next milestones
| Milestone | Deliverable | Exit evidence |
|---|---|---|
| Context Packages | Dynamic task-specific context selection and immutable snapshots | Package selection, filtering, persistence, and retrieval tests |
| Hypothesis Engine v2 | Entity/market-aware, evidence-specific hypotheses | Specific, falsifiable hypothesis with source trail |
| Opportunity Engine | Structured business case and value capture | Opportunity includes target, mechanism, economics, risks, unknowns |
| Validation | Research tasks and evidence updates | Unknowns marked supported/contradicted/unresolved |
| Ranking | Explainable deterministic scores | Reproducible score breakdown |
| Research Loop | Bounded orchestration | Stops at budget/iteration limit |
| Experiments | Operator-approved tracking | Outcome updates context and opportunity history |

## Delivery policy

Work one milestone at a time. Keep changes small and reviewable. Do not mark tasks complete without verification evidence. Update PLAN.md and this roadmap as milestones are completed. Defer optimization until profiling or a concrete requirement justifies it.
