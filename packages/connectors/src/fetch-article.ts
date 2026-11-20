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
  if (p.length !== 4 || p.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  return p[0] === 10 || p[0] === 127 || p[0] === 0 ||
    (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) ||
    (p[0] === 192 && p[1] === 168) || (p[0] === 100 && p[1] >= 64 && p[1] <= 127) ||
    (p[0] === 192 && p[1] === 0) || (p[0] === 192 && p[1] === 2) ||
    (p[0] === 198 && (p[1] === 18 || p[1] === 19 || p[1] === 51)) ||
    (p[0] === 203 && p[1] === 0 && p[2] === 113) || p[0] >= 224;
}

function isPrivateIPv6(ip: string): boolean {
  const v = ip.toLowerCase().split('%')[0];
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
  return records.map(record => record.address);
}): Promise<URL> {
  let url: URL;
  try { url = new URL(input); } catch { throw new Error('Invalid article URL'); }
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

export async function fetchArticleHtml(input: string, options: ArticleFetcherOptions = {}): Promise<ArticleFetchResult> {
  const { timeoutMs, maxBytes, maxRedirects } = { ...DEFAULTS, ...options };
  const fetchImpl = options.fetchImpl ?? fetch;
  const resolveHost = options.resolveHost ?? (async (host: string) => {
    const records = await lookup(host, { all: true, verbatim: true });
    return records.map(record => record.address);
  });
  let current = input;

  for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount++) {
    const url = await validateArticleUrl(current, resolveHost);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(url, { redirect: 'manual', signal: controller.signal, headers: { 'user-agent': 'OpportunityEngine/0.1 (+article research)', accept: 'text/html,application/xhtml+xml' } });
    } finally {
      clearTimeout(timer);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirectCount === maxRedirects) throw new Error('Too many article redirects');
      const location = response.headers.get('location');
      if (!location) throw new Error('Redirect response missing Location');
      current = new URL(location, url).toString();
      continue;
    }
    if (!response.ok) throw new Error(`Article request failed: HTTP ${response.status}`);
    const contentType = response.headers.get('content-type') ?? '';
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) throw new Error('Article response is not HTML');
    const declaredLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new Error('Article response exceeds size limit');
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > maxBytes) throw new Error('Article response exceeds size limit');
    return { url: url.toString(), html: body, contentType };
  }
  throw new Error('Article fetch failed');
}
