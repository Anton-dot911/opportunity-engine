import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { DocumentProcessingService } from './document-processing-service.js';

const bodySchema = z.object({ limit: z.number().int().min(1).max(100).optional() });

export function registerDocumentProcessingRoutes(
  app: FastifyInstance,
  processor: Pick<DocumentProcessingService, 'processPending'> = new DocumentProcessingService(),
): void {
  app.post('/api/documents/process', async (request, reply) => {
    const parsed = bodySchema.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    }
    try {
      return await processor.processPending(parsed.data.limit ?? 10);
    } catch (error) {
      app.log.error(error);
      return reply.code(503).send({ error: 'DOCUMENT_PROCESSING_UNAVAILABLE' });
    }
  });
}
