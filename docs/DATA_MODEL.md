# Initial Domain Data Model

This document describes conceptual entities. Physical schema and migrations will be added during implementation.

## Source
Configured information source: id, type (RSS/Atom/URL/upload/API), name, canonical locator, config, enabled state, polling policy, timestamps.

## IngestionRun
One collection attempt: id, source_id, status, start/end timestamps, item counts, error summary, metadata.

## Document
Normalized information artifact: id, source_id (nullable for uploads), canonical_url, title, content or extracted-text reference, content_hash, published_at, collected_at, language, processing_status, metadata. Deduplicate by canonical URL and content hash.

## Signal
Potentially meaningful observation: id, type (market_change, demand, supply, price, regulation, technology, inefficiency, complaint, trend, event, other), summary, observed_at, confidence, review_status, extraction_run_id. Every signal references evidence.

## Entity
Normalized company, person, product, service, location, market, or customer segment: id, type, canonical_name, aliases, attributes.

## ContextItem
Generic versioned knowledge item. Types may include FACT, SIGNAL, TREND, ENTITY, RELATIONSHIP, PROBLEM, NEED, MARKET, HYPOTHESIS, OPPORTUNITY, EXPERIMENT, RESULT, DECISION, CONSTRAINT, RISK. Fields: id, type, statement/structured payload, epistemic status (observed, inferred, assumed, verified, rejected, superseded), nullable confidence, provenance, valid-time and recorded-time, version, actor metadata.

## ContextRelationship
Relationship between context items/entities: id, from_item_id, relation_type, to_item_id, confidence, evidence references, created_at.

## Hypothesis
Falsifiable proposition: id, title, statement, mechanism, target segment, supporting evidence, assumptions, falsification criteria, status, confidence, timestamps.

## Opportunity
Structured value-capture candidate: id, hypothesis_id, title, problem/imbalance, target participant, value proposition, capture mechanism, business model, economics with units/currency, risks, validation state, score and score version, lifecycle status.

## Evidence
Support, contradiction, or context for a claim: id, document_id (nullable for other approved evidence), claim, polarity (supports, contradicts, contextual), source locator/excerpt reference, observed_at, reliability assessment, verification status. Evidence is never fabricated; unsupported claims remain assumptions or unresolved.

## ResearchTask and ResearchRun
Task = question/action reducing uncertainty. Run = bounded execution. Preserve objective, inputs, opportunity reference, status, budget/time limit, outputs/evidence, timestamps, errors, and stop reason.

## Experiment and ExperimentResult
Operator-approved real-world test and its observed outcome, actual costs/revenue where known, and lessons. No external action without explicit approval.

## AIExecution
Provider/model, prompt/template version, input/output schema versions, usage metadata when available, latency, status, normalized error, correlation ID. Avoid indiscriminate logging of sensitive content.

## Integrity rules

- Stable IDs and explicit foreign keys.
- Store timestamps in UTC; render in operator locale.
- Store currency and measurement units with numeric values.
- Preserve original source locators.
- Version or supersede corrected evidence; never silently overwrite it.
- Keep raw source material separate from derived interpretations.
- Enforce uniqueness and valid state transitions in the database where practical.