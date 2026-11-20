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

The application supports operator-triggered RSS/Atom collection, feed-entry normalization, PostgreSQL document persistence, ingestion run tracking, and deduplication by source URL and content hash. Full article extraction, scheduled polling, AI Runtime, and automated research are not implemented yet. See [docs/INGESTION.md](./docs/INGESTION.md) for limits and security notes.

See [PLAN.md](./PLAN.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/ROADMAP.md](./docs/ROADMAP.md).
