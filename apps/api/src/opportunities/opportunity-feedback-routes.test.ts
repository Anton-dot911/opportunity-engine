import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import type { FeedbackInput } from '@oe/database';
import { registerOpportunityFeedbackRoutes } from './opportunity-feedback-routes.js';

describe('opportunity feedback routes', () => {
  it('creates an append-only realized outcome record', async () => {
    const app = Fastify();
    let input: FeedbackInput | undefined;
    registerOpportunityFeedbackRoutes(app, {
      create: async (value: FeedbackInput) => { input = value; return { id: 'feedback-id', ...value }; },
      listByOpportunityId: async () => [],
    } as never);
    const response = await app.inject({
      method: 'POST',
      url: '/api/opportunities/00000000-0000-4000-8000-000000000001/feedback',
      payload: {
        outcome: 'partially_achieved',
        actualMetrics: [{ name: 'monthly_revenue', value: 12500, unit: 'USD', period: '2026-10' }],
        successFactors: ['Existing distribution relationships'],
      },
    });
    expect(response.statusCode).toBe(201);
    expect(input).toMatchObject({
      opportunityId: '00000000-0000-4000-8000-000000000001',
      outcome: 'partially_achieved',
      actualMetrics: [{ name: 'monthly_revenue', value: 12500, unit: 'USD', period: '2026-10' }],
    });
    await app.close();
  });

  it('requires units and a reporting period for actual metrics', async () => {
    const app = Fastify();
    registerOpportunityFeedbackRoutes(app, {
      create: async () => null,
      listByOpportunityId: async () => [],
    } as never);
    const response = await app.inject({
      method: 'POST',
      url: '/api/opportunities/00000000-0000-4000-8000-000000000001/feedback',
      payload: {
        outcome: 'achieved',
        actualMetrics: [{ name: 'revenue', value: 1000 }],
      },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
