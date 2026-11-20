import { afterAll, describe, expect, it } from 'vitest';
import { buildApp } from './app.js';

const app = buildApp();

afterAll(async () => {
  await app.close();
});

describe('GET /api/health', () => {
  it('returns a healthy API status', async () => {
    const response = await app.inject({ method: 'GET', url: '/api/health' });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      service: 'opportunity-engine-api',
    });
  });
});
