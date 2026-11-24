import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { OpportunityScoringRepository } from '@oe/database';

const idSchema = z.string().uuid();
const dimensionsSchema = z.object({
  evidence_strength: z.number().min(0).max(5).nullable().optional(),
  customer_demand: z.number().min(0).max(5).nullable().optional(),
  market_potential: z.number().min(0).max(5).nullable().optional(),
  economic_viability: z.number().min(0).max(5).nullable().optional(),
  execution_feasibility: z.number().min(0).max(5).nullable().optional(),
  defensibility: z.number().min(0).max(5).nullable().optional(),
});
const rationaleSchema = z.object({
  evidence_strength: z.string().trim().min(1).max(2000).optional(),
  customer_demand: z.string().trim().min(1).max(2000).optional(),
  market_potential: z.string().trim().min(1).max(2000).optional(),
  economic_viability: z.string().trim().min(1).max(2000).optional(),
  execution_feasibility: z.string().trim().min(1).max(2000).optional(),
  defensibility: z.string().trim().min(1).max(2000).optional(),
});
const evidenceRefsSchema = z.object({
  evidence_strength: z.array(z.string().min(1).max(500)).max(50).optional(),
  customer_demand: z.array(z.string().min(1).max(500)).max(50).optional(),
  market_potential: z.array(z.string().min(1).max(500)).max(50).optional(),
  economic_viability: z.array(z.string().min(1).max(500)).optional(),
  execution_feasibility: z.array(z.string().min(1).max(500)).max(50).optional(),
  defensibility: z.array(z.string().min(1).max(500)).max(50).optional(),
});
const scoreSchema = z.object({
  dimensions: dimensionsSchema,
  rationale: rationaleSchema,
  evidenceRefs: evidenceRefsSchema.optional(),
}).superRefine((value, context) => {
  for (const key of Object.keys(value.dimensions) as (keyof typeof value.dimensions)[]) {
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
      const dimensions = Object.fromEntries(
        Object.entries(body.data.dimensions).filter(([, value]) => value !== undefined),
      ) as Record<string, number | null>;
      const rationale = Object.fromEntries(
        Object.entries(body.data.rationale).filter(([, value]) => value !== undefined),
      ) as Record<string, string>;
      const evidenceRefs = body.data.evidenceRefs
        ? Object.fromEntries(Object.entries(body.data.evidenceRefs).filter(([, value]) => value !== undefined)) as Record<string, string[]>
        : undefined;
      const input = {
        dimensions,
        rationale,
        ...(evidenceRefs ? { evidenceRefs } : {}),
      };
      const row = await repository.create(id.data, input);
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
