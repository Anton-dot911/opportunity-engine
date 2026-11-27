# AI Runtime v1

## Boundary

Domain services depend on the provider-neutral `AIProviderAdapter` contract in `packages/ai-runtime`. Provider-specific HTTP/API behavior is isolated in adapters and selected through `createAIProviderAdapter`. Anthropic is the first adapter; adding a provider must not require changes to Opportunity or Research domain rules.

## Runtime contract

- Structured output is validated against a caller-supplied Zod schema before it is returned.
- Prompt definitions have stable IDs and explicit versions.
- Timeout and retry limits are bounded by configuration.
- Provider, model, prompt ID/version, attempt count, duration, token usage and status are persisted in `ai_execution_logs`.
- Estimated cost is calculated only when both input and output per-million-token rates are configured. Otherwise cost remains `null`; token usage is still recorded.
- Provider credentials are server-side only and must never be written to execution logs.

## Configuration

See `.env.example`: `AI_PROVIDER`, `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `AI_MAX_RETRIES`, `AI_TIMEOUT_MS`, `AI_INPUT_COST_PER_MILLION`, and `AI_OUTPUT_COST_PER_MILLION`.

## Non-goals

The runtime does not decide whether an AI result is factually correct. Each domain workflow must validate evidence references, enforce allowed state transitions, and require operator approval for consequential actions.
