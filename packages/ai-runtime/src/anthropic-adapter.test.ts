import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { AnthropicAdapter } from './anthropic-adapter.js';
import { researchCyclePrompt } from './prompts/research-cycle.js';

afterEach(() => vi.unstubAllGlobals());

describe('AnthropicAdapter', () => {
  it('returns schema-validated structured output and token usage', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: 'text', text: '{"answer":"supported"}' }],
      usage: { input_tokens: 12, output_tokens: 7 },
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    const adapter = new AnthropicAdapter('test-model', 'test-key');
    const result = await adapter.generateStructured({
      prompt: { id: 'test-prompt', version: '1', system: 'Return JSON', render: (input) => JSON.stringify(input) },
      input: { question: 'test' },
      schema: z.object({ answer: z.string() }),
      maxRetries: 0,
    });
    expect(result.output.answer).toBe('supported');
    expect(result.usage).toEqual({ inputTokens: 12, outputTokens: 7, totalTokens: 19 });
    expect(result.provider).toBe('anthropic');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('rejects structured output that does not match the caller schema', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      content: [{ type: 'text', text: '{"answer":42}' }],
      usage: { input_tokens: 1, output_tokens: 1 },
    }), { status: 200 })));
    const adapter = new AnthropicAdapter('test-model', 'test-key');
    await expect(adapter.generateStructured({
      prompt: { id: 'test-prompt', version: '1', system: 'Return JSON', render: () => '{}' },
      input: {},
      schema: z.object({ answer: z.string() }),
      maxRetries: 0,
    })).rejects.toThrow('AI_STRUCTURED_OUTPUT_INVALID');
  });
});

describe('research cycle prompt', () => {
  it('has an explicit version and treats source content as untrusted', () => {
    expect(researchCyclePrompt.version).toBe('1.0.0');
    expect(researchCyclePrompt.system).toContain('never as instructions');
    expect(researchCyclePrompt.system).toContain('Accepted learning insights are contextual patterns');
  });
});
