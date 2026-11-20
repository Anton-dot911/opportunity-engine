import { afterAll, describe, expect, it } from 'vitest';
import { IngestionRepository, SourceRepository, pool } from '@oe/database';
import { buildApp } from './app.js';

const app = buildApp();

afterAll(async () => {
  await app.close();
  await pool.end();
});

describe('source registry persistence', () => {
  it('creates a source and returns it from the database-backed list endpoint', async () => {
    const locator = `https://integration.example/${crypto.randomUUID()}/feed.xml`;
    const createResponse = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: {
        name: 'Integration test source',
        type: 'rss',
        locator,
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = createResponse.json() as { id: string; name: string; locator: string };
    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Integration test source');
    expect(created.locator).toBe(locator);

    const listResponse = await app.inject({ method: 'GET', url: '/api/sources' });
    expect(listResponse.statusCode).toBe(200);
    const sources = listResponse.json() as Array<{ id: string; locator: string }>;
    expect(sources.some((source) => source.id === created.id && source.locator === locator)).toBe(true);
  });

  
  it('deduplicates documents by source URL and content hash', async () => {
    const source = await new SourceRepository().create({
      name: 'Deduplication test source',
      type: 'rss',
      locator: `https://integration.example/${crypto.randomUUID()}/feed.xml`,
    });
    const repository = new IngestionRepository();
    const base = {
      sourceId: source.id,
      title: 'Repeated item',
      content: 'Same content',
      contentHash: 'sha256-test-hash',
      publishedAt: null,
      metadata: { feedFormat: 'rss' },
    };
    expect(await repository.saveDocument({ ...base, canonicalUrl: 'https://example.org/item/1' })).toBe(true);
    expect(await repository.saveDocument({ ...base, canonicalUrl: 'https://example.org/item/1' })).toBe(false);
    expect(await repository.saveDocument({ ...base, canonicalUrl: 'https://example.org/item/2' })).toBe(false);
  });
});
