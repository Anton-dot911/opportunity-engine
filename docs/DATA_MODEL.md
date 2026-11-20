# Initial Domain Data Model

This document describes the conceptual entities and the first PostgreSQL migration.

## Implemented in migration 001

- **Source** — configured information source: type, name, locator, config, enabled state, polling policy, timestamps.
- **IngestionRun** — collection attempt, status, counts, errors, metadata, timestamps.
- **Document** — normalized information artifact, source reference, canonical URL, content hash, publication/collection timestamps, processing state.
- **Signal** — potentially meaningful observation linked to a document, taxonomy, confidence, and review state.
- **ContextItem** — generic typed knowledge item with structured payload, epistemic status, confidence, provenance, version, and valid/recorded times.
- **Evidence** — support, contradiction, or context for a claim, linked to a document where applicable.

## Planned domain entities

### Entity
Normalized company, person, product, service, location, market, or customer segment: id, type, canonical_name, aliases, attributes.

### ContextRelationship
Relationship between context items/entities: id, from_item_id, relation_type, to_item_id, confidence, evidence references, created_at.

### Hypothesis
Falsifiable proposition: id, title, statement, mechanism, target segment, supporting evidence, assumptions, falsification criteria, status, confidence, timestamps.

### Opportunity
Structured value-capture candidate: id, hypothesis_id, title, problem/imbalance, target participant, value proposition, capture mechanism, business model, economics with units/currency, risks, validation state, score and score version, lifecycle status.

### ResearchTask and ResearchRun
Task = question/action reducing uncertainty. Run = bounded execution. Preserve objective, inputs, opportunity reference, status, budget/time limit, outputs/evidence, timestamps, errors, and stop reason.

### Experiment and ExperimentResult
Operator-approved real-world test and its observed outcome, actual costs/revenue where known, and lessons. No external action without explicit approval.

### AIExecution
Provider/model, prompt/template version, input/output schema versions, usage metadata when available, latency, status, normalized error, correlation ID. Avoid indiscriminate logging of sensitive content.

## Integrity rules

- Stable IDs and explicit foreign keys.
- Store timestamps in UTC; render in operator locale.
- Store currency and measurement units with numeric values.
- Preserve original source locators.
- Version or supersede corrected evidence; never silently overwrite it.
- Keep raw source material separate from derived interpretations.
- Enforce uniqueness and valid state transitions in the database where practical.

## Migration policy

Migrations are ordered SQL files in `packages/database/migrations`. The runner records applied filenames in `schema_migrations` and executes each migration in a transaction. Never edit an already-applied migration; add a new migration for subsequent schema changes.
