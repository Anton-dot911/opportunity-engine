# Opportunity Engine — Implementation Plan

## 1. Vision

Build an evidence-driven system that discovers, explains, validates, and prioritizes economically meaningful opportunities. This is not a generic chatbot that generates business ideas. It is a research system that converts fragmented information into traceable hypotheses and actionable opportunities.

Core loop: Collect → Normalize → Detect → Context → Hypothesize → Validate → Rank → Experiment → Learn.

## 2. Principles

1. Evidence before conclusions; every material claim links to evidence or is marked as an assumption.
2. Separate facts, signals, hypotheses, assumptions, decisions, and risks.
3. Make economics explicit: revenue, costs, margin, capital, payback, and time-to-test when known.
4. AI is not numerical truth; calculations and scoring are deterministic and tested.
5. Shared context is versioned and reusable.
6. Consequential external actions require operator approval.
7. AI, search, and ingestion providers are replaceable adapters.
8. Start with a modular monolith; split services only when justified.
9. Bound autonomy with budgets, timeouts, iterations, and stop conditions.
10. Preserve traceability and audit history.

## 3. MVP scope

Included: configurable sources; RSS/Atom ingestion; document normalization and deduplication; signal/entity/hypothesis extraction; generic Context Layer and immutable Context Packages; structured opportunities; validation and research records; explainable operator-assessed scoring; deterministic ranking; realized-outcome feedback; reviewed Learning Insights; provider-neutral AI Runtime v1; and one bounded operator-triggered Research Loop cycle.

Out of scope initially: unrestricted autonomous browsing; autonomous spending, purchases, payments, outreach, or publishing; model training; large multi-agent framework; microservices/Kubernetes; complex forecasts presented as certainty; mandatory vector database before semantic retrieval is needed.

## 4. Functional requirements

- F01 Source management: add, edit, enable, disable sources.
- F02 Collection: fetch RSS/Atom and accept manual URLs/documents.
- F03 Document pipeline: normalize, deduplicate, store, preserve provenance.
- F04 Signal detection: extract candidate signals with type, confidence, and evidence.
- F05 Context layer: typed, versioned items with provenance and lifecycle.
- F06 Relationships: connect signals, entities, and context items.
- F07 Hypothesis engine: generate falsifiable hypotheses from signals and context.
- F08 Opportunity engine: structure a business case and value-capture mechanism.
- F09 Validation: track evidence, assumptions, unknowns, risks, and research tasks.
- F10 Ranking: calculate transparent scores from explicit criteria.
- F11 Research loop: execute bounded research tasks and update context.
- F12 Opportunity feed: filter and sort opportunities.
- F13 Opportunity detail: inspect evidence, economics, uncertainty, risks, history.
- F14 Dashboard: show pipeline health and items requiring review.
- F15 Experiments: record tests, outcomes, and lessons.

## 5. Opportunity definition

An opportunity must state: the imbalance/problem; target participant; proposed value capture; mechanism; supporting evidence; assumptions; unknowns; economics with units/currency; risks; and the smallest useful validation step. Mechanisms may include brokerage, arbitrage, automation, resale, aggregation, substitution, productization, distribution, cost reduction, or other explicit mechanisms.

## 6. Logical modules

Source Registry; Ingestion; Document Pipeline; Signal Engine; Entity and Relationship Layer; generic Context Layer (DCL); Hypothesis Engine; Opportunity Engine; Validation Engine; Ranking Engine; Research Orchestrator; Experiment Tracker; AI Runtime. These are logical modules, not separate deployable services.

## 7. Explainable scoring

Initial dimensions: evidence strength, demand intensity, value-capture potential, gross margin, time to first test, required capital, competitive intensity, execution complexity, legal/regulatory exposure, and key-assumption uncertainty. Store component scores, weights, rationale, and scoring version. Unknown values remain unknown; never invent them or silently treat them as zero.

## 8. Implementation phases and exit criteria

### Phase 0 — Foundation
Create application skeleton, strict TypeScript, lint/format/type-check/test scripts, validated environment config, local PostgreSQL via Docker Compose, API health endpoint, and CI. Exit: clean install, local startup, DB connectivity, health endpoint, passing baseline checks.

### Phase 1 — AI Runtime
Define provider-neutral interfaces, structured output validation, first provider adapter, versioned prompt definitions, timeout/retry controls, execution logs, token usage, and optional cost estimation. Exit: provider call returns schema-validated structured output through a replaceable adapter boundary.

### Phase 2 — Discovery
Add source registry, manual URL/document submission, RSS/Atom connector, collection scheduling/status. Exit: source items are fetched and traceable.

### Phase 3 — Document Pipeline
Normalize metadata/content, extract supported text, deduplicate by canonical URL/content hash, record processing state. Exit: documents are searchable and repeated ingestion creates no duplicates.

### Phase 4 — Signal Engine
Define signal taxonomy, extract candidate signals, validate evidence references, add review states. Exit: each signal links to inspectable source evidence.

### Phase 5 — Context Layer
Implement generic context items, relationships, provenance, versioning, retrieval, and package assembly. Exit: research can retrieve relevant context and persist reviewed findings.

### Phase 6 — Hypothesis Engine
Generate hypotheses with mechanism, target, assumptions, evidence, and falsification criteria; detect duplicates/conflicts. Exit: operator can review and edit testable hypotheses.

### Phase 7 — Opportunity Engine
Promote hypotheses into structured opportunities with business model, value capture, economics, risks, and unknowns. Exit: coherent traceable opportunity detail.

### Phase 8 — Validation
Generate research tasks for critical unknowns; attach evidence; mark claims supported, contradicted, or unresolved. Exit: visible validation state and prioritized unknowns.

### Phase 9 — Ranking
Implement deterministic component scoring and versioned breakdown. Exit: reproducible, comparable rankings.

### Phase 10 — Bounded Research Loop
Plan and execute permitted research tasks with budgets, iteration limits, timeouts, evidence validation, and audit trail. Exit: a controlled cycle produces reviewable tasks/findings/unknowns and an advisory next action, while respecting autonomy boundaries.

### Phase 11 — Experiments and Feedback
Track operator-approved experiments and actual outcomes; feed lessons into context. Exit: experiment results update opportunity history and knowledge.

## 9. End-to-end MVP acceptance

Register an RSS source and submit a URL → ingest documents with provenance → normalize text → extract evidence-linked signal → store signal/context → generate falsifiable hypothesis → operator promotes it → validation tasks identify unknowns → evidence is added → deterministic score is calculated → dashboard shows evidence, uncertainty, risks, and next action.

## 10. Engineering rules

Strict TypeScript; runtime validation at boundaries; domain logic independent of UI and provider SDKs; migrations for schema changes; idempotent ingestion; structured logs with run IDs; schema-validated AI output; no fabricated evidence; unit and integration tests; small reviewable changes; docs updated with behavior. No infrastructure without a concrete requirement.

## 11. Definition of Done

Implementation exists; types and runtime validation are present; relevant tests pass; failure paths are handled; provenance/auditability are preserved; documentation is updated; feature is verified in the running app or automated test.

## 12. Current status

- Phase 0 — Foundation: complete.
- Discovery: RSS/Atom ingestion and document persistence are implemented; manual URL/document intake and scheduled collection remain outstanding.
- Document Pipeline: secure article fetch, Readability extraction, normalization, metadata and retryable processing are implemented.
- Signal Engine v1: deterministic candidate signals with source-document linkage and review state are implemented.
- Entity & Relationship Layer v1: deterministic organization mentions and explicit relationships with evidence provenance are implemented.
- Hypothesis Engine v1/v2: v1 generated category-level drafts; v2 groups signals by mentioned organization and signal category, requires at least two distinct source documents per entity/category, links hypotheses to entities and evidence, and explicitly frames entity association as a research lead rather than proof. This does not validate a market opportunity.
- Context Layer v1 foundation is implemented: generic context items, provenance, priority/confidence, lifecycle, validity, tags, and review API.
- Context Packages v1 is implemented: dynamic task-specific selection of active, valid context items and immutable snapshots with retrieval API.
- Opportunity Engine v1 foundation is implemented: structured opportunity storage, evidence snapshots from hypothesis-linked signals, conservative generation gate, status lifecycle, and API endpoints. The gate intentionally skips generic hypotheses without an explicit economic mechanism.
- Opportunity Validation v1 is implemented: bounded validation records with plans, outcomes, findings, evidence, budget, and timebox.
- Opportunity Research v1 is implemented: one research record per opportunity with structured questions, findings, evidence, unknowns, and conclusion.
- Opportunity Scoring v1 is implemented: immutable operator-assessed six-dimension snapshots with explicit coverage and unknown-value handling.
- Opportunity Ranking v1 is implemented: deterministic read-time ordering using the latest eligible score snapshot; ranking is advisory and does not change lifecycle state.
- Opportunity Feedback v1 is implemented: append-only operator-recorded outcomes, actual metrics, and lessons.
- Opportunity Learning v1 is implemented: repeated success/failure factors across distinct opportunities, explicit human review, and append-only review history. Accepted insights are available as optional research context, not as automatic policy.
- AI Runtime v1 is implemented with a provider-neutral adapter contract and initial Anthropic adapter, structured output validation, prompt versioning, bounded timeout/retry, execution logs, token usage, and optional cost estimation.
- Research Loop v1 is implemented as one operator-triggered bounded cycle over stored opportunity evidence and accepted Learning Insights. External web research and automatic opportunity/score/ranking changes remain out of scope.

## 13. Next implementation step

Verify AI Runtime v1 and Research Loop v1 through CI and a configured-provider end-to-end run. Then add a separately permissioned external research connector that can retrieve new sources, preserve source provenance, and enforce source allowlists/rate limits. Do not add autonomous spending, outreach, publishing, automatic opportunity status transitions, or score/ranking/weight recalibration. Keep Context Layer promotion and Learning Insight acceptance under operator control. Keep context infrastructure domain-agnostic and avoid adding a vector database until retrieval requirements justify it.
