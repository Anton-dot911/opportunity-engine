import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerResearchLoopRoutes } from './research-loop-routes.js';

describe('research loop route', () => {
  it('runs one explicitly requested opportunity cycle', async () => {
    const app = Fastify();
    registerResearchLoopRoutes(app, {
      execute: async (id: string) => ({ opportunityId: id, nextAction: 'operator_review' }),
    } as never);
    const response = await app.inject({
      method: 'POST',
      url: '/api/opportunities/00000000-0000-4000-8000-000000000001/research/run',
    });
    expect(response.statusCode).toBe(201);
    expect(response.json().nextAction).toBe('operator_review');
    await app.close();
  });

  it('rejects malformed opportunity identifiers', async () => {
    const app = Fastify();
    registerResearchLoopRoutes(app, { execute: async () => ({}) } as never);
    const response = await app.inject({ method: 'POST', url: '/api/opportunities/not-a-uuid/research/run' });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('maps missing provider configuration to a service-unavailable response', async () => {
    const app = Fastify();
    registerResearchLoopRoutes(app, {
      execute: async () => { throw Object.assign(new Error('AI_PROVIDER_NOT_CONFIGURED'), { code: 'AI_PROVIDER_NOT_CONFIGURED' }); },
    } as never);
    const response = await app.inject({
      method: 'POST',
      url: '/api/opportunities/00000000-0000-4000-8000-000000000001/research/run',
    });
    expect(response.statusCode).toBe(503);
    await app.close();
  });
});
