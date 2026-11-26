import type { z } from 'zod';

export type PromptDefinition = {
  id: string;
  version: string;
  system: string;
  render: (input: unknown) => string;
};

export type AIUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
};

export type AIExecutionRequest<T> = {
  prompt: PromptDefinition;
  input: unknown;
  schema: z.ZodType<T>;
  timeoutMs?: number;
  maxRetries?: number;
};

export type AIExecutionResult<T> = {
  output: T;
  provider: string;
  model: string;
  promptId: string;
  promptVersion: string;
  usage: AIUsage;
  durationMs: number;
  attempts: number;
};

export interface AIProviderAdapter {
  readonly provider: string;
  readonly model: string;
  generateStructured<T>(request: AIExecutionRequest<T>): Promise<AIExecutionResult<T>>;
}

export interface AIExecutionLogger {
  record(input: {
    provider: string; model: string; promptId: string; promptVersion: string;
    status: 'succeeded' | 'failed'; inputTokens: number | null; outputTokens: number | null;
    durationMs: number; attempts: number; errorCode?: string;
  }): Promise<void>;
}
