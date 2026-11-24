import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityValidationRepository } from '@oe/database';

const idSchema = z.string().uuid();
const createSchema = z.object({
  title: z.string().trim().min(1).max(160),
  hypothesis: z.string().trim().min(10).max(2000),
  method: z.string().trim().min(10).max(4000),
  successCriteria: z.string().trim().min(10).max(2000),
  budgetEstimate: z.number().nonnegative().optional().nullable(),
  currency: z.string().trim().length(3).optional().nullable(),
  timeboxDays: z.number().int().min(1).max(365),
});
const updateSchema = z.object({
  status: z.enum(['planned', 'in_progress', 'completed', 'cancelled']),
  outcome: z.enum(['confirmed', 'not_confirmed', 'inconclusive']).optional().nullable(),
  findings: z.string().max(10000).optional().nullable(),
  evidence: z.array(z.unknown()).max(100).optional(),
}).superRefine((value, context) => {
  if (value.status === 'completed' && !value.outcome) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: 'Completed validation requires an outcome', path: ['outcome'] });
  }
});

export function registerOpportunityValidationRoutes(app: FastifyInstance, repository = new OpportunityValidationRepository()) {
  app.post('/api/opportunities/:id/validations', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    const body = createSchema.safeParse(request.body);
    if (!id.success || !body.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      const row = await repository.create({ opportunityId: id.data, ...body.data });
      if (!row) return reply.code(404).send({ error: 'OPPORTUNITY_NOT_FOUND' });
      return reply.code(201).send(row);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'VALIDATION_CREATE_UNAVAILABLE' });
    }
  });

  app.get('/api/opportunities/:id/validations', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      return await repository.list(id.data);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'VALIDATION_LIST_UNAVAILABLE' });
    }
  });

  app.patch('/api/validations/:id', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    const body = updateSchema.safeParse(request.body);
    if (!id.success || !body.success) return reply.code(400).send({ error: 'VALIDATION_ERROR' });
    try {
      const row = await repository.update(id.data, body.data);
      if (!row) return reply.code(404).send({ error: 'VALIDATION_NOT_FOUND' });
      return row;
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'VALIDATION_UPDATE_UNAVAILABLE' });
    }
  });
}
