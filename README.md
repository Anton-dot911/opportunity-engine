# Opportunity Engine

Foundation implementation for the Opportunity Engine platform.

## Requirements

- Node.js 22+
- pnpm 10+
- Docker Desktop or Docker Engine

## Local development

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres
pnpm db:migrate
pnpm dev
```

- Web: http://localhost:5173
- API health: http://localhost:4000/api/health
- Sources API: http://localhost:4000/api/sources

## API endpoints

- `GET /api/health` — API process health.
- `GET /api/sources` — list registered sources (maximum 100).
- `POST /api/sources/:id/ingest` — manually collect a registered RSS/Atom source and persist new feed entries.
- `POST /api/sources` — create a source. JSON body: `{ "name": "Example feed", "type": "rss", "locator": "https://example.com/feed.xml" }`.
- `POST /api/signals/extract` — extract deterministic candidate signals from processed documents.
- `POST /api/entities/extract` — extract organization mentions and evidence-backed relationships.
- `POST /api/hypotheses/generate` — generate draft hypotheses from recurring signal categories (requires signals from at least two distinct documents per category).
- `POST /api/opportunities/generate` — create opportunities only when a hypothesis has an explicit economic mechanism and linked evidence.
- `POST /api/opportunities/:id/validations` and `GET/PATCH` — manage bounded validation records.
- `POST/GET /api/opportunities/:id/research`, `PATCH /api/research/:id` — manage structured research records.
- `POST/GET /api/opportunities/:id/scores` — create and inspect immutable operator-assessed score snapshots.
- `GET /api/opportunities/ranking` — deterministic advisory ranking; does not change opportunity lifecycle.
- `POST/GET /api/opportunities/:id/feedback` — record realized outcomes and operator-entered lessons.
- `POST /api/learning/insights/generate`, `GET /api/learning/insights`, `PATCH /api/learning/insights/:id/review`, `GET /api/learning/insights/:id/reviews` — generate and review recurring learning candidates.
- `POST /api/opportunities/:id/research/run` — run one bounded AI research cycle (requires configured AI provider).

Source types: `url`, `rss`, `atom`, `upload`, `api`.

## Quality checks

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Current implementation

- React + Vite operator interface
- Fastify API with validated environment configuration
- API health endpoint and source registry endpoints
- PostgreSQL schema migration runner and initial domain tables
- Source repository backed by PostgreSQL
- Docker Compose database service
- pnpm workspace and GitHub Actions quality workflow
- Operator-triggered RSS/Atom collection, feed-entry normalization, PostgreSQL document persistence, ingestion run tracking, and URL/content-hash deduplication
- Article-fetching connector with HTTP(S) validation, bounded redirects, timeout, response-type checks, and streamed byte limit
- Readability-based article extraction with metadata, normalized text, and SHA-256 content hash

The operator workflow now includes opportunity validation, structured research records, immutable scoring snapshots, deterministic ranking, realized-outcome feedback, and human-reviewed recurring Learning Insights. AI Runtime v1 and the first operator-triggered Research Loop v1 are implemented as bounded, provider-adaptable components. Research uses only the opportunity's stored evidence snapshot and accepted Learning Insights; it does not browse the open web or autonomously execute external actions. Full-page extraction is available as a connector primitive but is not yet wired into the ingestion endpoint or persisted to the document pipeline. Scheduled polling and manual URL/document ingestion remain outstanding.

See [docs/INGESTION.md](./docs/INGESTION.md) for ingestion limits and security notes, [PLAN.md](./PLAN.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/ROADMAP.md](./docs/ROADMAP.md).
