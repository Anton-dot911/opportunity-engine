import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { IngestionService } from './service.js';

const paramsSchema = z.object({ id: z.string().uuid() });

export function registerIngestionRoutes(
  app: FastifyInstance,
  ingestion = new IngestionService(),
): void {
  app.post('/api/sources/:id/ingest', async (request, reply) => {
    const parsed = paramsSchema.safeParse(request.params);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    }

    const result = await ingestion.ingestSource(parsed.data.id);
    if (result.kind === 'not_found') return reply.code(404).send({ error: 'SOURCE_NOT_FOUND' });
    if (result.kind === 'disabled') return reply.code(409).send({ error: 'SOURCE_DISABLED' });
    if (result.kind === 'unsupported_source') {
      return reply.code(422).send({ error: 'SOURCE_TYPE_NOT_SUPPORTED' });
    }
    if (result.kind === 'failed') {
      return reply.code(502).send({
        error: 'INGESTION_FAILED',
        runId: result.runId,
        itemsSeen: result.itemsSeen,
        itemsCreated: result.itemsCreated,
        reason: result.error,
      });
    }
    return reply.code(200).send(result);
  });
}
