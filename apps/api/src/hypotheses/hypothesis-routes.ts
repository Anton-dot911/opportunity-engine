import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { HypothesisEngineService } from './hypothesis-engine-service.js';

const bodySchema = z.object({ limit: z.number().int().min(1).max(1000).optional() });

export function registerHypothesisRoutes(app: FastifyInstance, engine: Pick<HypothesisEngineService, 'generate'> = new HypothesisEngineService()): void {
  app.post('/api/hypotheses/generate', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try {
      return await engine.generate(parsed.data.limit ?? 200);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'HYPOTHESIS_GENERATION_UNAVAILABLE' });
    }
  });
}
