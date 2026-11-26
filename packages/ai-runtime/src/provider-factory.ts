import { AnthropicAdapter } from './anthropic-adapter.js';
import type { AIProviderAdapter } from './types.js';

export function createAIProviderAdapter(input: {
  provider: 'anthropic';
  model: string;
  apiKey: string;
}): AIProviderAdapter {
  switch (input.provider) {
    case 'anthropic':
      return new AnthropicAdapter(input.model, input.apiKey);
    default: {
      const exhaustive: never = input.provider;
      throw new Error(`Unsupported AI provider: ${exhaustive}`);
    }
  }
}
