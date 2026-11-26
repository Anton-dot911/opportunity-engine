# Implementation Roadmap

## Current milestone: AI Runtime v1 + Research Loop v1

### Completed
- [x] Foundation: workspace, PWA, API, PostgreSQL, migrations, CI.
- [x] Source registry and RSS/Atom parsing/ingestion with run tracking.
- [x] Document processing: secure fetch, extraction, normalized content, retryable lifecycle.
- [x] SSRF hardening with DNS validation/pinning and redirect revalidation.
- [x] Deterministic Signal Engine v1; signals retain source document and evidence excerpt.
- [x] Entity & Relationship Layer v1; organization mentions and explicit relationships retain evidence and pending-review status.
- [x] Hypothesis Engine v1: recurring signal-category clusters, minimum two distinct documents, draft hypotheses with assumptions, mechanism, falsification criteria, confidence ceiling, and evidence links.
- [x] Context Layer v1: generic context items with provenance, priority, confidence, lifecycle, validity, tags, retrieval, and operator review API.
- [x] Context Packages v1: dynamic, task-specific selection of active context items with immutable snapshots and retrieval API.
- [x] Hypothesis Engine v2: group signals by organization and category; require two distinct documents; persist hypothesis-to-entity links and linked signal evidence.
- [x] Opportunity Engine v1: structured opportunity records with explicit economic-mechanism gate and evidence snapshots.
- [x] Opportunity Validation v1: bounded validation plans, outcomes, findings, evidence, budget and timebox.
- [x] Opportunity Research v1: one research record per opportunity with questions, findings, evidence, unknowns and conclusion.
- [x] Opportunity Scoring v1: immutable operator-assessed score snapshots with six weighted dimensions and coverage handling.
- [x] Opportunity Ranking v1: deterministic read-time ranking using latest eligible scores; no lifecycle changes.
- [x] Opportunity Feedback v1: append-only realized outcomes, metrics and operator-entered factors.
- [x] Opportunity Learning v1: recurring factors across distinct opportunities, explicit human review and append-only review history.
- [x] AI Runtime v1: provider-neutral structured generation interface, Anthropic adapter, versioned prompts, timeout/retry, execution logs, token tracking and optional cost estimate.
- [x] Research Loop v1 first controlled cycle: operator-triggered one-iteration research over stored evidence and accepted Learning Insights; validates evidence references and records an advisory next action.

### Current implementation limitations
- Signal and entity extraction are deterministic heuristics; false positives are expected and require review.
- Entity extraction remains heuristic; entity mentions are not yet globally resolved or guaranteed to identify the same real-world organization.
- Entity-aware hypotheses associate recurring signals with an organization, but do not establish causation, customer demand, or a validated business opportunity.
- Hypotheses are generic candidate patterns, not validated business cases.
- Opportunity Engine v1 is deterministic; the initial mechanism gate is heuristic and intentionally conservative. Economics are unknown/null until supported by evidence.
- Manual URL/document ingestion and scheduled collection remain future work.
- Context Package creation/retrieval exists, but current Research Loop consumes the opportunity evidence snapshot and accepted Learning Insights directly; broader package-based context assembly remains a follow-up.
- Research Loop v1 does not yet fetch new external sources. It analyzes only evidence already stored against the opportunity; AI-generated findings are candidates and unsupported claims remain unverified.
- AI Runtime v1 currently ships one concrete provider adapter (Anthropic); the provider-neutral contract/factory is in place for additional adapters. Cost is estimated only when explicit token rates are configured.

### Next milestones
| Milestone | Deliverable | Exit evidence |
|---|---|---|
| Hypothesis Engine v2 completion | Contradiction handling, richer evidence roles, and context-package consumption | Hypotheses expose supporting/contradicting evidence and reproducible context snapshot |
| Opportunity Engine v1 | Structured opportunity records with conservative economic-mechanism gate | API creates records only for hypotheses with an explicit mechanism; otherwise leaves them research-only |
| Opportunity Engine | Structured business case and value capture | Opportunity includes target, mechanism, economics, risks, unknowns |
| Validation | Research tasks and evidence updates | Unknowns marked supported/contradicted/unresolved |
| Ranking | Explainable deterministic scores | Reproducible score breakdown |
| External Research Connector | Retrieve new sources under allowlists, provenance and rate limits | Each fetched item is stored with source URL, timestamp, content hash and evidence linkage |
| Research Loop v2 | Multi-step evidence acquisition using approved connectors | Tasks can request new sources; every claim is traceable; budget/iteration stop conditions are enforced |
| Experiments | Operator-approved tracking | Outcome updates context and opportunity history |

## Delivery policy

Work one milestone at a time. Keep changes small and reviewable. Do not mark tasks complete without verification evidence. Update PLAN.md and this roadmap as milestones are completed. Defer optimization until profiling or a concrete requirement justifies it.
