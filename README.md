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

The database currently persists source registry records and provides initial tables for ingestion runs, documents, signals, generic context items, and evidence. AI Runtime, external connectors, and automated research are intentionally not enabled yet.

See [PLAN.md](./PLAN.md), [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md), and [docs/ROADMAP.md](./docs/ROADMAP.md).
