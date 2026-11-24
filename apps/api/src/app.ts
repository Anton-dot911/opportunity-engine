import Fastify from 'fastify';
import cors from '@fastify/cors';
import { z } from 'zod';
import { SourceRepository } from '@oe/database';
import { env } from './config/env.js';
import { registerIngestionRoutes } from './ingestion/routes.js';
import { registerDocumentProcessingRoutes } from './ingestion/document-processing-routes.js';
import { registerSignalRoutes } from './signals/signal-routes.js';
import { registerEntityRoutes } from './entities/entity-routes.js';
import { registerHypothesisRoutes } from './hypotheses/hypothesis-routes.js';
import { registerContextRoutes } from './context/context-routes.js';
import { registerContextPackageRoutes } from './context/context-package-routes.js';
import { registerOpportunityRoutes } from './opportunities/opportunity-routes.js';
import { registerOpportunityValidationRoutes } from './opportunities/opportunity-validation-routes.js';
import { registerOpportunityResearchRoutes } from './opportunities/opportunity-research-routes.js';

const createSourceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  type: z.enum(['url', 'rss', 'atom', 'upload', 'api']),
  locator: z.string().trim().min(1).max(2048),
});
export function buildApp() {
  const app = Fastify({ logger: env.NODE_ENV !== 'test', trustProxy: true });
  const sources = new SourceRepository();
  void app.register(cors, { origin: env.WEB_ORIGIN });
  app.get('/api/health', async () => ({ status: 'ok', service: 'opportunity-engine-api', timestamp: new Date().toISOString() }));
  app.get('/api/sources', async (_request, reply) => {
    try { return await sources.list(); }
    catch (error) { app.log.error(error); return reply.code(503).send({ error: 'DATABASE_UNAVAILABLE' }); }
  });
  app.post('/api/sources', async (request, reply) => {
    const parsed = createSourceSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'VALIDATION_ERROR', details: parsed.error.issues });
    try { return reply.code(201).send(await sources.create(parsed.data)); }
    catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') return reply.code(409).send({ error: 'SOURCE_ALREADY_EXISTS' });
      app.log.error(error); return reply.code(503).send({ error: 'DATABASE_UNAVAILABLE' });
    }
  });
  registerIngestionRoutes(app);
  registerDocumentProcessingRoutes(app);
  registerSignalRoutes(app);
  registerEntityRoutes(app);
  registerHypothesisRoutes(app);
  registerContextRoutes(app);
  registerContextPackageRoutes(app);
  registerOpportunityRoutes(app);
  registerOpportunityValidationRoutes(app);
  registerOpportunityResearchRoutes(app);
  return app;
}
