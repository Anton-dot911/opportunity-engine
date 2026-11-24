import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityScoringRepository, SCORE_DIMENSIONS } from '@oe/database';

const idSchema = z.string().uuid();
const dimensionNames = Object.keys(SCORE_DIMENSIONS) as [keyof typeof SCORE_DIMENSIONS, ...(keyof typeof SCORE_DIMENSIONS)[]];
const scoreSchema = z.object({
  dimensions: z.object(Object.fromEntries(dimensionNames.map((key) => [key, z.number().min(0).max(5).nullable().optional()]))),
  rationale: z.object(Object.fromEntries(dimensionNames.map((key) => [key, z.string().trim().min(1).max(2000).optional()]))),
  evidenceRefs: z.object(Object.fromEntries(dimensionNames.map((key) => [key, z.array(z.string().min(1).max(500)).max(50).optional()]))).optional(),
}).superRefine((value, context) => {
  for (const key of dimensionNames) {
    const score = value.dimensions[key];
    if (score !== undefined && score !== null && !value.rationale[key]) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ['rationale', key], message: 'Rationale is required for every scored dimension.' });
    }
  }
});

export function registerOpportunityScoringRoutes(
  app: FastifyInstance,
  repository = new OpportunityScoringRepository(),
) {
  app.post('/api/opportunities/:id/scores', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    const body = scoreSchema.safeParse(request.body);
    if (!id.success || !body.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: body.success ? undefined : body.error.issues });
    }
    try {
      const row = await repository.create(id.data, body.data);
      if (!row) return reply.code(404).send({ error: 'OPPORTUNITY_NOT_FOUND' });
      return reply.code(201).send(row);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_SCORE_CREATE_UNAVAILABLE' });
    }
  });

  app.get('/api/opportunities/:id/scores', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      return await repository.listByOpportunityId(id.data);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_SCORE_LIST_UNAVAILABLE' });
    }
  });
}
