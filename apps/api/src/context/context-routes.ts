import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ContextRepository } from '@oe/database';

const createSchema = z.object({
  contextKey: z.string().trim().min(1).max(200),
  itemType: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(240),
  content: z.unknown(),
  provenance: z.unknown().optional(),
  priority: z.number().int().min(0).max(100).optional(),
  confidence: z.number().min(0).max(1).optional(),
  status: z.enum(['draft', 'review', 'active', 'rejected', 'expired']).optional(),
  tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
  validFrom: z.string().datetime().nullable().optional(),
  validUntil: z.string().datetime().nullable().optional(),
});
const statusSchema = z.object({ status: z.enum(['draft', 'review', 'active', 'rejected', 'expired']) });

export function registerContextRoutes(app: FastifyInstance, repository = new ContextRepository()): void {
  app.post('/api/context/items', async (request, reply) => {
    const parsed = createSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try { return reply.code(201).send(await repository.create(parsed.data)); }
    catch (error) { app.log.error(error); return reply.code(503).send({ error: 'CONTEXT_STORAGE_UNAVAILABLE' }); }
  });
  app.get('/api/context/items', async (request, reply) => {
    const querySchema = z.object({ status: statusSchema.shape.status.optional(), type: z.string().max(80).optional(), tag: z.string().max(64).optional(), limit: z.coerce.number().int().min(1).max(200).optional() });
    const parsed = querySchema.safeParse(request.query);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try { return await repository.list({ status: parsed.data.status, itemType: parsed.data.type, tags: parsed.data.tag ? [parsed.data.tag] : undefined, limit: parsed.data.limit }); }
    catch (error) { app.log.error(error); return reply.code(503).send({ error: 'CONTEXT_RETRIEVAL_UNAVAILABLE' }); }
  });
  app.patch('/api/context/items/:id/status', async (request, reply) => {
    const parsed = statusSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try {
      const result = await repository.setStatus((request.params as { id: string }).id, parsed.data.status);
      if (!result) return reply.code(404).send({ error: 'CONTEXT_ITEM_NOT_FOUND' });
      return result;
    } catch (error) { app.log.error(error); return reply.code(503).send({ error: 'CONTEXT_UPDATE_UNAVAILABLE' }); }
  });
}
