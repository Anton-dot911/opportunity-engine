import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityRankingRepository } from '@oe/database';

const querySchema = z.object({
  status: z.enum(['draft', 'review', 'rejected', 'approved_for_validation']).optional(),
  limit: z.coerce.number().int().min(1).max(200).default(100),
  minimumCoverage: z.coerce.number().min(0).max(100).default(60),
});

export function registerOpportunityRankingRoutes(
  app: FastifyInstance,
  repository = new OpportunityRankingRepository(),
) {
  app.get('/api/opportunities/ranking', async (request, reply) => {
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    }
    try {
      return await repository.list(parsed.data);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_RANKING_UNAVAILABLE' });
    }
  });
}
