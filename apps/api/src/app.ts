import Fastify from 'fastify';
import cors from '@fastify/cors';
import { env } from './config/env.js';

export function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== 'test',
    trustProxy: true,
  });

  void app.register(cors, {
    origin: env.WEB_ORIGIN,
  });

  app.get('/api/health', async () => ({
    status: 'ok',
    service: 'opportunity-engine-api',
    timestamp: new Date().toISOString(),
  }));

  return app;
}
