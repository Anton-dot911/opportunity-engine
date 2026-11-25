import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityFeedbackRepository } from '@oe/database';

const idSchema = z.string().uuid();
const metricSchema = z.object({
  name: z.string().trim().min(1).max(120),
  value: z.union([z.number().finite(), z.string().trim().min(1).max(200)]),
  unit: z.string().trim().min(1).max(40),
  period: z.string().trim().min(1).max(120),
  evidenceRefs: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
});
const createSchema = z.object({
  validationId: idSchema.optional().nullable(),
  outcome: z.enum(['achieved', 'partially_achieved', 'not_achieved', 'unknown']),
  actualMetrics: z.array(metricSchema).max(50).optional(),
  successFactors: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
  failureFactors: z.array(z.string().trim().min(1).max(1000)).max(30).optional(),
  findings: z.string().trim().max(10000).optional().nullable(),
  evidence: z.array(z.unknown()).max(100).optional(),
  recordedBy: z.string().trim().min(1).max(120).optional().nullable(),
  occurredAt: z.string().datetime({ offset: true }).optional().nullable(),
});

export function registerOpportunityFeedbackRoutes(
  app: FastifyInstance,
  repository = new OpportunityFeedbackRepository(),
) {
  app.post('/api/opportunities/:id/feedback', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    const body = createSchema.safeParse(request.body);
    if (!id.success || !body.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: body.success ? undefined : body.error.issues });
    }
    try {
      const row = await repository.create({ opportunityId: id.data, ...body.data });
      if (!row) return reply.code(404).send({ error: 'OPPORTUNITY_OR_VALIDATION_NOT_FOUND' });
      return reply.code(201).send(row);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_FEEDBACK_CREATE_UNAVAILABLE' });
    }
  });

  app.get('/api/opportunities/:id/feedback', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      return await repository.listByOpportunityId(id.data);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'OPPORTUNITY_FEEDBACK_LIST_UNAVAILABLE' });
    }
  });
}
