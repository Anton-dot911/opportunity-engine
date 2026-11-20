import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const app = buildApp();
afterAll(async () => {
  await app.close();
});

describe('API foundation', () => {
  it('returns a healthy API status', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'opportunity-engine-api',
    });
  });

  it('rejects an invalid source payload without accessing the database', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/sources',
      payload: { name: '', type: 'unsupported', locator: '' },
    });
    expect(response.statusCode).toBe(400);
    expect(response.json()).toMatchObject({ error: 'VALIDATION_ERROR' });
  });
});
