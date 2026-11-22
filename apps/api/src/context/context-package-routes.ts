import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ContextPackageRepository } from '@oe/database';

const buildSchema = z.object({
  agent: z.string().trim().min(1).max(100),
  task: z.string().trim().min(1).max(500),
  tags: z.array(z.string().trim().min(1).max(64)).max(30).optional(),
  itemTypes: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  limit: z.number().int().min(1).max(100).optional(),
});
const idSchema = z.string().uuid();

export function registerContextPackageRoutes(app: FastifyInstance, repository = new ContextPackageRepository()): void {
  app.post('/api/context/packages', async (request, reply) => {
    const parsed = buildSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try { return reply.code(201).send(await repository.build(parsed.data)); }
    catch (error) { app.log.error(error); return reply.code(503).send({ error: 'CONTEXT_PACKAGE_BUILD_UNAVAILABLE' }); }
  });

  app.get('/api/context/packages/:id', async (request, reply) => {
    const id = idSchema.safeParse((request.params as { id: string }).id);
    if (!id.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: id.error.issues });
    try {
      const result = await repository.getById(id.data);
      if (!result) return reply.code(404).send({ error: 'CONTEXT_PACKAGE_NOT_FOUND' });
      return result;
    } catch (error) { app.log.error(error); return reply.code(503).send({ error: 'CONTEXT_PACKAGE_RETRIEVAL_UNAVAILABLE' }); }
  });
}
