import { describe, expect, it } from 'vitest';
import Fastify from 'fastify';
import { registerHypothesisRoutes } from './hypothesis-routes.js';

describe('hypothesis routes', () => {
  it('uses default generation limit and returns engine result', async () => {
    const app = Fastify();
    let receivedLimit = 0;
    registerHypothesisRoutes(app, { generate: async (limit = 200) => { receivedLimit = limit; return { signalsConsidered: 3, candidatesGenerated: 1, evidenceLinked: 3 }; } });
    const response = await app.inject({ method: 'POST', url: '/api/hypotheses/generate', payload: {} });
    expect(response.statusCode).toBe(200);
    expect(receivedLimit).toBe(200);
    expect(response.json()).toEqual({ signalsConsidered: 3, candidatesGenerated: 1, evidenceLinked: 3 });
    await app.close();
  });

  it('rejects invalid limits', async () => {
    const app = Fastify();
    registerHypothesisRoutes(app, { generate: async () => ({ signalsConsidered: 0, candidatesGenerated: 0, evidenceLinked: 0 }) });
    const response = await app.inject({ method: 'POST', url: '/api/hypotheses/generate', payload: { limit: 0 } });
    expect(response.statusCode).toBe(400);
    await app.close();
  });
});
