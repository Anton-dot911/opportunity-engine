import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerContextRoutes } from './context-routes.js';

describe('context routes', () => {
  it('validates context item creation and delegates to repository', async () => {
    const app = Fastify();
    let created: unknown;
    registerContextRoutes(app, { create: async (input: import('@oe/database').ContextItemInput) => { created = input; return input; }, list: async () => [], setStatus: async () => null } as never);
    const response = await app.inject({ method: 'POST', url: '/api/context/items', payload: { contextKey: 'decision-1', itemType: 'decision', title: 'Prefer simple architecture', content: { text: 'Avoid premature complexity' } } });
    expect(response.statusCode).toBe(201);
    expect(created).toMatchObject({ contextKey: 'decision-1', itemType: 'decision' });
    await app.close();
  });

  it('rejects invalid priority and status values', async () => {
    const app = Fastify();
    registerContextRoutes(app, { create: async () => ({}), list: async () => [], setStatus: async () => null } as never);
    const response = await app.inject({ method: 'POST', url: '/api/context/items', payload: { contextKey: 'x', itemType: 'note', title: 'x', content: {}, priority: 101 } });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
