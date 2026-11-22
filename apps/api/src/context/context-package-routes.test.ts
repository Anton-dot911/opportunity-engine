import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerContextPackageRoutes } from './context-package-routes.js';

describe('context package routes', () => {
  it('builds a package from validated agent/task criteria', async () => {
    const app = Fastify();
    let received: unknown;
    registerContextPackageRoutes(app, {
      build: async (input: import('@oe/database').ContextPackageInput) => { received = input; return { id: 'snapshot', item_count: 2, items: [] }; },
      getById: async () => null,
    } as never);
    const response = await app.inject({ method: 'POST', url: '/api/context/packages', payload: { agent: 'researcher', task: 'Assess demand', tags: ['market'], limit: 10 } });
    expect(response.statusCode).toBe(201);
    expect(received).toMatchObject({ agent: 'researcher', task: 'Assess demand', tags: ['market'], limit: 10 });
    await app.close();
  });

  it('rejects invalid limits and validates snapshot IDs', async () => {
    const app = Fastify();
    registerContextPackageRoutes(app, { build: async () => ({}), getById: async () => null } as never);
    const invalidBuild = await app.inject({ method: 'POST', url: '/api/context/packages', payload: { agent: 'a', task: 'b', limit: 0 } });
    const invalidId = await app.inject({ method: 'GET', url: '/api/context/packages/not-a-uuid' });
    expect(invalidBuild.statusCode).toBe(400);
    expect(invalidId.statusCode).toBe(400);
    await app.close();
  });

  it('returns 404 for an unknown snapshot', async () => {
    const app = Fastify();
    registerContextPackageRoutes(app, { build: async () => ({}), getById: async () => null } as never);
    const response = await app.inject({ method: 'GET', url: '/api/context/packages/00000000-0000-4000-8000-000000000001' });
    expect(response.statusCode).toBe(404);
    await app.close();
  });
});
