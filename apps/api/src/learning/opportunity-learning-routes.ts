import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityLearningRepository } from '@oe/database';

const idSchema = z.string().uuid();
const reviewSchema = z.object({
  status: z.enum(['accepted', 'rejected']),
  reviewedBy: z.string().trim().min(1).max(120).optional(),
});

export function registerOpportunityLearningRoutes(
  app: FastifyInstance,
  repository = new OpportunityLearningRepository(),
) {
  app.post('/api/learning/insights/generate', async (_request, reply) => {
    try { return reply.code(201).send(await repository.generate()); }
    catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_LEARNING_GENERATE_UNAVAILABLE' });
    }
  });

  app.get('/api/learning/insights', async (request, reply) => {
    const query = z.object({ status: z.enum(['pending', 'accepted', 'rejected']).optional() })
      .safeParse(request.query);
    if (!query.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: query.error.issues });
    try { return await repository.list(query.data.status); }
    catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_LEARNING_LIST_UNAVAILABLE' });
    }
  });

  app.get('/api/learning/analysis', async (_request, reply) => {
    try { return await repository.analyze(); }
    catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_LEARNING_ANALYSIS_UNAVAILABLE' });
    }
  });

  app.get('/api/learning/insights/:id/reviews', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      return await repository.listReviews(id.data);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_LEARNING_REVIEWS_UNAVAILABLE' });
    }
  });

  app.patch('/api/learning/insights/:id/review', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    const body = reviewSchema.safeParse(request.body);
    if (!id.success || !body.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: body.success ? undefined : body.error.issues });
    }
    try {
      const row = await repository.review(id.data, body.data.status, body.data.reviewedBy);
      if (!row) return reply.code(404).send({ error: 'LEARNING_INSIGHT_NOT_FOUND' });
      return row;
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_LEARNING_REVIEW_UNAVAILABLE' });
    }
  });
}
