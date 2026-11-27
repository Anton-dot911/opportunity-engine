import type { AIExecutionRequest, AIExecutionResult, AIProviderAdapter } from './types.js';

type AnthropicResponse = {
  content?: Array<{ type?: string; text?: string }>;
  usage?: { input_tokens?: number; output_tokens?: number };
  error?: { type?: string; message?: string };
};

export class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = 'anthropic';
  constructor(
    readonly model: string,
    private readonly apiKey: string,
    private readonly endpoint = 'https://api.anthropic.com/v1/messages',
  ) {}

  async generateStructured<T>(request: AIExecutionRequest<T>): Promise<AIExecutionResult<T>> {
    const timeoutMs = Math.max(1000, Math.min(request.timeoutMs ?? 30000, 120000));
    const maxRetries = Math.max(0, Math.min(request.maxRetries ?? 1, 3));
    const started = Date.now();
    let lastError: unknown;
    for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
      try {
        const response = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: this.model,
            max_tokens: 4096,
            system: request.prompt.system,
            messages: [{ role: 'user', content: request.prompt.render(request.input) }],
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });
        const body = await response.json() as AnthropicResponse;
        if (!response.ok) {
          const error = new Error(body.error?.message ?? `Anthropic request failed: ${response.status}`);
          if (response.status === 429 || response.status >= 500) throw Object.assign(error, { retryable: true });
          throw error;
        }
        const text = body.content?.filter((item) => item.type === 'text').map((item) => item.text ?? '').join('\n') ?? '';
        const jsonText = text.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');
        const parsed = JSON.parse(jsonText) as unknown;
        const validated = request.schema.safeParse(parsed);
        if (!validated.success) throw Object.assign(new Error('AI_STRUCTURED_OUTPUT_INVALID'), { retryable: false });
        const inputTokens = body.usage?.input_tokens ?? null;
        const outputTokens = body.usage?.output_tokens ?? null;
        return {
          output: validated.data,
          provider: this.provider,
          model: this.model,
          promptId: request.prompt.id,
          promptVersion: request.prompt.version,
          usage: { inputTokens, outputTokens, totalTokens: inputTokens === null || outputTokens === null ? null : inputTokens + outputTokens },
          durationMs: Date.now() - started,
          attempts: attempt,
        };
      } catch (error) {
        lastError = error;
        const retryable = error instanceof Error && ('retryable' in error ? Boolean(error.retryable) : error.name === 'TimeoutError' || error.name === 'AbortError' || error.name === 'TypeError');
        if (!retryable || attempt > maxRetries) break;
        await new Promise((resolve) => setTimeout(resolve, Math.min(250 * 2 ** (attempt - 1), 1500)));
      }
    }
    if (lastError instanceof Error) {
      Object.assign(lastError, { attempts: Math.min(maxRetries + 1, lastError && 'attempts' in lastError ? Number(lastError.attempts) : maxRetries + 1) });
      throw lastError;
    }
    throw new Error('AI_RUNTIME_EXECUTION_FAILED');
  }
}
