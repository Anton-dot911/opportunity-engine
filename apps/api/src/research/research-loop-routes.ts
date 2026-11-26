import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ResearchLoopService } from './research-loop-service.js';

const idSchema = z.string().uuid();

export function registerResearchLoopRoutes(app: FastifyInstance, service = new ResearchLoopService()) {
  app.post('/api/opportunities/:id/research/run', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      return reply.code(201).send(await service.execute(id.data));
    } catch (error) {
      const code = error instanceof Error && 'code' in error ? String(error.code) : 'RESEARCH_LOOP_UNAVAILABLE';
      if (code === 'OPPORTUNITY_NOT_FOUND') return reply.code(404).send({ error: code });
      if (code === 'AI_PROVIDER_NOT_CONFIGURED') return reply.code(503).send({ error: code });
      if (code === 'RESEARCH_ITERATION_LIMIT_REACHED') return reply.code(409).send({ error: code });
      app.log.error(error);
      return reply.code(502).send({ error: code });
    }
  });
}
