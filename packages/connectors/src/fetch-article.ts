import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

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
  resolveHost?: (hostname: string) => Promise<string[]>;
};

const DEFAULTS = { timeoutMs: 8000, maxBytes: 1_000_000, maxRedirects: 4 };

function isPrivateIPv4(ip: string): boolean {
  const p = ip.split('.').map(Number);
  const [a, b, c, d] = p;
  if (a === undefined || b === undefined || c === undefined || d === undefined ||
    p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return a === 10 || a === 127 || a === 0 ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) ||
    (a === 192 && b === 0) || (a === 192 && b === 2) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0 && c === 113) || a >= 224;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().split('%')[0] ?? '';
  return v === '::' || v === '::1' || v.startsWith('fc') || v.startsWith('fd') ||
    /^fe[89ab]/.test(v) || v.startsWith('ff') || v.startsWith('2001:db8') ||
    v.startsWith('::ffff:') || v.startsWith('2002:');
}

function assertPublicAddress(ip: string): void {
  const family = isIP(ip);
  if (!family || (family === 4 ? isPrivateIPv4(ip) : isPrivateIPv6(ip))) {
    throw new Error('URL resolves to a private, reserved, or invalid IP address');
  }
}

export async function validateArticleUrl(input: string, resolveHost = async (host: string) => {
  const records = await lookup(host, { all: true, verbatim: true });
  return records.map((record) => record.address);
}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Invalid article URL');
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new Error('Only HTTP and HTTPS URLs are supported');
  if (url.username || url.password) throw new Error('URL credentials are not allowed');
  if (!url.hostname) throw new Error('URL hostname is required');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (isIP(host)) assertPublicAddress(host);
  else {
    const addresses = await resolveHost(host);
    if (!addresses.length) throw new Error('Hostname did not resolve');
    addresses.forEach(assertPublicAddress);
  }
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
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveHost = options.resolveHost ?? (async (host: string) => {
    const records = await lookup(host, { all: true, verbatim: true });
    return records.map((record) => record.address);
  });
  let current = input;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const url = await validateArticleUrl(current, resolveHost);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, {
        redirect: 'manual',
        signal: controller.signal,
        headers: {
          'user-agent': 'OpportunityEngine/0.1 (+article research)',
          accept: 'text/html,application/xhtml+xml',
        },
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
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error('Article fetch failed');
}
