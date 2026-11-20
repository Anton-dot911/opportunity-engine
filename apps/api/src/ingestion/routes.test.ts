import Fastify from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registerIngestionRoutes } from './routes.js';

describe('manual ingestion endpoint', () => {
  const apps: ReturnType<typeof Fastify>[] = [];
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((app) => app.close()));
  });

  it('returns ingestion metrics on success', async () => {
    const app = Fastify();
    apps.push(app);
    const ingestSource = vi.fn().mockResolvedValue({
      kind: 'success', runId: 'run-1', itemsSeen: 8, itemsCreated: 6,
    });
    registerIngestionRoutes(app, { ingestSource });
    const response = await app.inject({
      method: 'POST',
      url: '/api/sources/7f2b4e9c-4a2f-4c4f-8e6a-2c0e3b9f1a11/ingest',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ itemsSeen: 8, itemsCreated: 6 });
    expect(ingestSource).toHaveBeenCalledWith('7f2b4e9c-4a2f-4c4f-8e6a-2c0e3b9f1a11');
  });

  it('rejects malformed source IDs before calling the service', async () => {
    const app = Fastify();
    apps.push(app);
    const ingestSource = vi.fn();
    registerIngestionRoutes(app, { ingestSource });
    const response = await app.inject({ method: 'POST', url: '/api/sources/not-a-uuid/ingest' });
    expect(response.statusCode).toBe(400);
    expect(ingestSource).not.toHaveBeenCalled();
  });

  it('maps missing sources to 404', async () => {
    const app = Fastify();
    apps.push(app);
    registerIngestionRoutes(app, {
      ingestSource: vi.fn().mockResolvedValue({ kind: 'not_found' }),
    });
    const response = await app.inject({
      method: 'POST',
      url: '/api/sources/7f2b4e9c-4a2f-4c4f-8e6a-2c0e3b9f1a11/ingest',
    });
    expect(response.statusCode).toBe(404);
    expect(response.json()).toEqual({ error: 'SOURCE_NOT_FOUND' });
  });
});
