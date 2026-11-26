import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().url().default('postgresql://oe:oe_local_dev@localhost:5432/opportunity_engine'),
  AI_PROVIDER: z.enum(['anthropic']).default('anthropic'),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-20250514'),
  AI_MAX_RETRIES: z.coerce.number().int().min(0).max(3).default(1),
  AI_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(30000),
  AI_INPUT_COST_PER_MILLION: z.coerce.number().nonnegative().optional(),
  AI_OUTPUT_COST_PER_MILLION: z.coerce.number().nonnegative().optional(),
  RESEARCH_MAX_ITERATIONS: z.coerce.number().int().min(1).max(10).default(5),
});

export const env = envSchema.parse(process.env);
