import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import type { ValidationInput } from '@oe/database';
import { registerOpportunityValidationRoutes } from './opportunity-validation-routes.js';

describe('opportunity validation routes', () => {
  it('rejects completed validation without outcome', async () => {
    const app = Fastify();
    registerOpportunityValidationRoutes(app, { create: async () => null, list: async () => [], update: async () => null } as never);
    const response = await app.inject({
      method: 'PATCH',
      url: '/api/validations/00000000-0000-4000-8000-000000000001',
      payload: { status: 'completed', findings: 'Test done' },
    });
    expect(response.statusCode).toBe(400);
    await app.close();
  });

  it('creates validation task for opportunity', async () => {
    const app = Fastify();
    let input: unknown;
    registerOpportunityValidationRoutes(app, {
      create: async (value: ValidationInput) => { input = value; return { id: 'validation-id', ...value }; },
      list: async () => [],
      update: async () => null,
    } as never);
    const response = await app.inject({
      method: 'POST',
      url: '/api/opportunities/00000000-0000-4000-8000-000000000001/validations',
      payload: {
        title: 'Buyer interviews',
        hypothesis: 'Retail buyers have this recurring problem',
        method: 'Interview five buyers with a structured script',
        successCriteria: 'At least three confirm recurring pain and willingness to pay',
        timeboxDays: 7,
      },
    });
    expect(response.statusCode).toBe(201);
    expect(input).toMatchObject({ opportunityId: '00000000-0000-4000-8000-000000000001', timeboxDays: 7 });
    await app.close();
  });
});
