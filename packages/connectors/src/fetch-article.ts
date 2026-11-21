import { resolveAndValidate, secureHttpGet, type ResolveHost } from './secure-http.js';

export type ArticleFetchResult = {
  url: string;
  html: string;
  contentType: string;
};

export type ArticleFetcherOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRedirects?: number;
  fetchImpl?: typeof fetch;
  resolveHost?: ResolveHost;
};

const DEFAULTS = { timeoutMs: 8000, maxBytes: 1_000_000, maxRedirects: 4 };

export async function validateArticleUrl(input: string, resolveHost?: ResolveHost): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid article URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP and HTTPS URLs are supported');
  if (url.username || url.password) throw new Error('URL credentials are not allowed');
  if (!url.hostname) throw new Error('URL hostname is required');
  await resolveAndValidate(url.hostname, resolveHost);
  return url;
}

async function readBodyBounded(response: Response, maxBytes: number): Promise<string> {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new Error('Article response exceeds size limit');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder('utf-8').decode(bytes);
}

export async function fetchArticleHtml(input: string, options: ArticleFetcherOptions = {}): Promise<ArticleFetchResult> {
  const { timeoutMs, maxBytes, maxRedirects } = { ...DEFAULTS, ...options };
  let current = input;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
    const url = options.fetchImpl\n      ? await validateArticleUrl(current, options.resolveHost)\n      : new URL(current);
    const response = options.fetchImpl
      ? await options.fetchImpl(url, {
          redirect: 'manual',
          signal: AbortSignal.timeout(timeoutMs),
          headers: {
            'user-agent': 'OpportunityEngine/0.1 (+article research)',
            accept: 'text/html,application/xhtml+xml',
          },
        })
      : await secureHttpGet(url, {
          timeoutMs,
          maxBytes,
          resolveHost: options.resolveHost,
        });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      await response.body?.cancel();
      if (redirectCount === maxRedirects) throw new Error('Too many article redirects');
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect response missing Location');
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Article request failed: HTTP ${response.status}`);
    }
    const contentType = response.headers.get('content-type') ?? '';
    if (!/^(?:text\/html|application\/xhtml\+xml)(?:\s*;|$)/i.test(contentType)) {
      await response.body?.cancel();
      throw new Error('Article response is not HTML');
    }
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
      await response.body?.cancel();
      throw new Error('Article response exceeds size limit');
    }
    const body = await readBodyBounded(response, maxBytes);
    return { url: url.toString(), html: body, contentType };
  }
  throw new Error('Article fetch failed');
}
