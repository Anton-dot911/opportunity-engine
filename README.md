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

Full-page extraction is available as a connector primitive but is not yet wired into the ingestion endpoint or persisted to the document pipeline. Scheduled polling, manual URL/document ingestion, AI Runtime, and automated research remain unimplemented.

See [docs/INGESTION.md](./docs/INGESTION.md) for ingestion limits and security notes, [PLAN.md](./PLAN.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/ROADMAP.md](./docs/ROADMAP.md).
