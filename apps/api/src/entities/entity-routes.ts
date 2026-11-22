import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { EntityEngineService } from './entity-engine-service.js';

const bodySchema = z.object({ limit: z.number().int().min(1).max(100).optional() });

export function registerEntityRoutes(app: FastifyInstance, engine: Pick<EntityEngineService, 'processPending'> = new EntityEngineService()): void {
  app.post('/api/entities/extract', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try {
      return await engine.processPending(parsed.data.limit ?? 10);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'ENTITY_EXTRACTION_UNAVAILABLE' });
    }
  });
}
