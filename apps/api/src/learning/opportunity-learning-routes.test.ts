import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerOpportunityLearningRoutes } from './opportunity-learning-routes.js';

describe('opportunity learning routes', () => {
  it('returns review history for a valid insight id', async () => {
    const app = Fastify();
    registerOpportunityLearningRoutes(app, {
      generate: async () => ({ created: [] }),
      list: async () => [],
      listReviews: async (id: string) => [{ insight_id: id, new_status: 'accepted' }],
      review: async () => null,
    } as never);
    const response = await app.inject({
      method: 'GET',
      url: '/api/learning/insights/00000000-0000-4000-8000-000000000001/reviews',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveLength(1);
    await app.close();
  });

  it('rejects an invalid insight id for review history', async () => {
    const app = Fastify();
    registerOpportunityLearningRoutes(app, {
      generate: async () => ({ created: [] }),
      list: async () => [],
      listReviews: async () => [],
      review: async () => null,
    } as never);
    const response = await app.inject({ method: 'GET', url: '/api/learning/insights/not-a-uuid/reviews' });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
