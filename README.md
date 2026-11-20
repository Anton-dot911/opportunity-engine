# Opportunity Engine

AI-assisted system for discovering, explaining, validating, and prioritizing economically meaningful opportunities.

## Core loop

Collect → Normalize → Detect → Enrich Context → Hypothesize → Validate → Rank → Experiment → Learn

The system converts fragmented information into traceable signals, testable hypotheses, and structured opportunities. It must distinguish observed facts from interpretations and assumptions. AI proposes; deterministic code validates data, performs calculations, and scores opportunities.

## MVP

1. Ingest information from configurable sources.
2. Store normalized documents with source provenance.
3. Extract candidate signals and entities.
4. Connect signals to shared context.
5. Generate falsifiable opportunity hypotheses.
6. Create opportunity records with evidence, assumptions, risks, and unknowns.
7. Present results in an operator dashboard.

The first release is operator-assisted, not unrestricted autonomy. External actions require explicit approval.

## Architecture principles

- Evidence before conclusions; preserve provenance.
- Shared, versioned, provider-neutral context.
- Deterministic economics and explainable scoring.
- Modular monolith before microservices.
- Bounded background jobs with budgets and audit trails.
- Provider adapters for AI, search, and ingestion.

## Initial stack direction

TypeScript, React + Vite PWA, Node.js + Fastify API, PostgreSQL, Zod, Vitest, Docker Compose, and an adapter-based AI runtime (Anthropic as the first provider). Exact dependency versions will be pinned during implementation.

## Repository documentation

- PLAN.md — scope, requirements, phases, acceptance criteria.
- CLAUDE.md — coding-agent operating rules.
- docs/ARCHITECTURE.md — system boundaries and data flow.
- docs/DATA_MODEL.md — conceptual domain model.
- docs/ROADMAP.md — milestone checklist.

## Status

Current phase: Foundation. Documentation initialized; application code is not implemented yet. Planned features must not be described as working until verified.

## Security

Never commit API keys, credentials, production data, or local environment files. Use .env.example for documented variable names.