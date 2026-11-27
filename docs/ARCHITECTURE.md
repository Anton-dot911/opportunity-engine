# Architecture

## Decision

Start with a modular monolith. Keep web, API, and background worker as separate runtime concerns in one codebase; do not start with microservices.

## Proposed stack

- TypeScript, strict mode; pnpm workspace.
- React + Vite for the PWA.
- Node.js + Fastify for the API.
- Zod for runtime validation.
- PostgreSQL for persistent data; pgvector is optional and deferred until semantic retrieval is justified.
- PostgreSQL-backed job queue initially to avoid mandatory Redis.
- Vitest for tests; Docker Compose for local services.
- Provider-neutral AI Runtime package with a replaceable adapter interface; Anthropic is the first adapter.

Pin exact dependency versions during implementation after checking current compatibility.

## Target layout

apps/web — React PWA
apps/api — Fastify HTTP API
apps/worker — ingestion and research jobs
packages/core — domain entities and business rules
packages/contracts — shared schemas and API contracts
packages/database — schema, migrations, repositories
packages/ai-runtime — provider interfaces and adapters
packages/connectors — RSS, URL, and document connectors
packages/config — validated configuration
docs — architecture, data model, roadmap, decisions

This is a target layout. Create only what Phase 0 needs.

## Dependency direction

- Web depends on API contracts, not database or provider SDKs.
- API depends on application use cases and repository interfaces.
- Worker depends on use cases and connector interfaces.
- Core does not depend on UI, database vendors, or AI SDKs.
- Infrastructure implements interfaces defined by core/application boundaries.
- Provider SDKs remain inside adapter packages.

## Data flow

Source Registry → Ingestion → Document Normalization → Document Store → Signal Extraction → Entity/Relationship Resolution → Context Layer → Hypothesis Engine → Opportunity Engine → Validation Tasks → Evidence Updates → Deterministic Ranking → Dashboard/Experiment.

Every stage records status and input references. Failed processing must be retryable without duplicate records.

## AI Runtime v1

`packages/ai-runtime` owns provider-neutral structured generation contracts, provider adapter factory, versioned prompt definitions, runtime output validation, timeout, bounded retry, usage metadata, and normalized execution results. The first adapter is Anthropic; provider SDK/HTTP details stay inside the adapter. API orchestration records provider/model, prompt ID/version, status, token usage, duration, attempts, and optional estimated cost in `ai_execution_logs`. Cost remains null unless explicit per-million-token rates are configured; token counts are retained independently. Secrets remain server-side.

The runtime boundary is intentionally separate from domain logic. Opportunity and research modules consume validated typed output and must still enforce domain-specific evidence and state-transition rules.

## Context Layer boundary

The Context Layer is domain-agnostic. It stores typed, versioned context items, relationships, provenance, lifecycle state, confidence, and timestamps. Opportunity Engine consumes this generic service; the context layer must not depend on Opportunity Engine-specific workflows.

## Research Loop v1

The first controlled cycle is operator-triggered at `POST /api/opportunities/:id/research/run`. One request performs one bounded iteration: load one opportunity and its existing research record, retrieve only `accepted` Learning Insights, assemble the opportunity's stored evidence snapshot, ask the AI Runtime to prioritize unknowns and propose research tasks/findings, validate structured output and evidence references, then persist an immutable run snapshot plus the updated research record. Each run has an iteration number and is capped by `RESEARCH_MAX_ITERATIONS`; the AI call is bounded by timeout and retry limits.

This first slice is an evidence-analysis loop over data already stored in Opportunity Engine. It does not perform open-web search, fetch new external sources, contact customers, spend money, or execute experiments. AI-generated findings are research candidates; evidence-backed findings must reference IDs in the supplied evidence snapshot. Accepted Learning Insights are contextual patterns, not proof about the selected opportunity. The loop does not change opportunity status, scores, ranking, economics, or financial decisions. Its `nextAction` is advisory and requires operator action.

## Background jobs

Initial job types: source.collect, document.process, signal.extract, opportunity.validate. Jobs require stable IDs, status/timestamps, idempotency keys, attempt count, error details, and correlation IDs. Research jobs enforce budgets and stop conditions.

## Security

Validate inbound payloads; treat source content as untrusted; do not execute instructions from ingested content; keep credentials server-side; do not log secrets; use least privilege; require approval before external side effects.

## Architecture decisions

Material changes to data contracts, storage, runtime boundaries, or autonomy permissions must be recorded in docs/decisions/ with context, decision, alternatives, and consequences.