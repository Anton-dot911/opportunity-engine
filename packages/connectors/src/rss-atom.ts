import { resolveAndValidate, secureHttpGet } from './secure-http.js';
import { XMLParser, XMLValidator } from 'fast-xml-parser';

export type FeedItem = {
  title: string | null;
  url: string;
  content: string | null;
  publishedAt: Date | null;
  metadata: Record<string, unknown>;
};

const MAX_FEED_BYTES = 1_000_000;
const MAX_ITEMS = 50;
const MAX_REDIRECTS = 3;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  textNodeName: '#text',
  trimValues: true,
  processEntities: false,
});

function isPrivateAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const parts = address.split('.').map(Number);
    const a = parts[0] ?? 0;
    const b = parts[1] ?? 0;
    return (
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 2 || b === 168)) ||
      (a === 192 && b === 88 && parts[2] === 99) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0 && parts[2] === 113)
    );
  }
  if (isIP(address) === 6) {
    const normalized = address.toLowerCase();
    const firstGroup = Number.parseInt(normalized.split(':')[0] || '0', 16);
    return firstGroup < 0x2000 || firstGroup > 0x3fff || normalized.startsWith('2001:db8:');
  }
  return true;
}

async function assertPublicHttpUrl(value: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('FEED_URL_INVALID');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('FEED_URL_UNSUPPORTED');
  }
  const hostname = url.hostname.toLowerCase().replace(/^\\[|\\]$/g, '');
  if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local')) {
    throw new Error('FEED_HOST_BLOCKED');
  }
  const addresses = isIP(hostname)
    ? [{ address: hostname }]
    : await lookup(hostname, { all: true, verbatim: true });
  if (addresses.length === 0 || addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new Error('FEED_HOST_BLOCKED');
  }
  return url;
}

function asText(value: unknown): string | null {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim() || null;
  if (value && typeof value === 'object' && '#text' in value) return asText((value as { '#text': unknown })['#text']);
  return null;
}

function stripMarkup(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ').trim().slice(0, 50_000) || null;
}

function parseDate(value: unknown): Date | null {
  const text = asText(value);
  if (!text) return null;
  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeItems(parsed: Record<string, any>, baseUrl?: string): FeedItem[] {
  const rssChannel = parsed.rss?.channel;
  const atomFeed = parsed.feed;
  let rawItems: any[] = [];
  let format: 'rss' | 'atom';

  if (rssChannel) {
    format = 'rss';
    const items = rssChannel.item;
    rawItems = items == null ? [] : Array.isArray(items) ? items : [items];
  } else if (atomFeed) {
    format = 'atom';
    const entries = atomFeed.entry;
    rawItems = entries == null ? [] : Array.isArray(entries) ? entries : [entries];
  } else {
    throw new Error('FEED_FORMAT_UNSUPPORTED');
  }

  return rawItems.slice(0, MAX_ITEMS).flatMap((item): FeedItem[] => {
    const rawLink = item.link;
    const link = format === 'atom'
      ? (Array.isArray(rawLink) ? rawLink.find((entry) => entry?.['@_rel'] === 'alternate') ?? rawLink[0] : rawLink)
      : rawLink;
    const url = format === 'atom' && link && typeof link === 'object'
      ? asText(link['@_href'])
      : asText(link);
    if (!url) return [];

    let canonicalUrl: string;
    try {
      canonicalUrl = new URL(url, baseUrl).toString();
      if (!['http:', 'https:'].includes(new URL(canonicalUrl).protocol)) return [];
    } catch {
      return [];
    }

    const title = asText(item.title);
    const content = stripMarkup(asText(item['content:encoded'] ?? item.description ?? item.summary ?? item.content));
    const publishedAt = parseDate(item.pubDate ?? item.published ?? item.updated ?? item['dc:date']);
    return [{
      title,
      url: canonicalUrl,
      content,
      publishedAt,
      metadata: {
        feedFormat: format,
        guid: asText(item.guid ?? item.id),
        author: asText(item.author?.name ?? item.author ?? item['dc:creator']),
      },
    }];
  });
}

export function parseFeed(xml: string, baseUrl?: string): FeedItem[] {
  const validation = XMLValidator.validate(xml);
  if (validation !== true) throw new Error('FEED_XML_INVALID');
  return normalizeItems(parser.parse(xml) as Record<string, any>, baseUrl);
}

export async function fetchFeed(
  locator: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ items: FeedItem[]; finalUrl: string; format: 'rss' | 'atom' }> {
  let currentUrl = locator;
  let response: Response | undefined;

  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect += 1) {
    let safeUrl: URL;
    try {
      safeUrl = new URL(currentUrl);
    } catch {
      throw new Error('FEED_URL_INVALID');
    }
    if (!['http:', 'https:'].includes(safeUrl.protocol) || safeUrl.username || safeUrl.password) {
      throw new Error('FEED_URL_UNSUPPORTED');
    }
    if (fetchImpl !== fetch) {
      try {
        await resolveAndValidate(safeUrl.hostname);
      } catch {
        throw new Error('FEED_HOST_BLOCKED');
      }
    }
    response = fetchImpl !== fetch
      ? await fetchImpl(safeUrl, {
          method: 'GET',
          redirect: 'manual',
          signal: AbortSignal.timeout(8_000),
          headers: {
            accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9',
            'user-agent': 'OpportunityEngine/0.1 (+RSS feed reader)',
          },
        })
      : await secureHttpGet(safeUrl, {\n          timeoutMs: 8_000,\n          maxBytes: MAX_FEED_BYTES,\n          headers: { accept: 'application/atom+xml, application/rss+xml, application/xml, text/xml;q=0.9' },\n        });

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get('location');
      await response.body?.cancel();
      if (!location || redirect === MAX_REDIRECTS) throw new Error('FEED_REDIRECT_LIMIT');
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }
    break;
  }

  if (!response?.ok) throw new Error(`FEED_HTTP_ERROR_${response?.status ?? 'UNKNOWN'}`);
  const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
  if (contentType && !/(xml|rss|atom|text\/plain)/.test(contentType)) {
    await response.body?.cancel();
    throw new Error('FEED_CONTENT_TYPE_UNSUPPORTED');
  }
  const declaredLength = Number(response.headers.get('content-length') ?? 0);
  if (declaredLength > MAX_FEED_BYTES) {
    await response.body?.cancel();
    throw new Error('FEED_TOO_LARGE');
  }
  if (!response.body) throw new Error('FEED_BODY_EMPTY');
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error('FEED_TOO_LARGE');
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
  const xml = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  const items = parseFeed(xml, currentUrl);
  const format = /<\s*feed(?:\s|>)/i.test(xml) ? 'atom' : 'rss';
  return { items, finalUrl: currentUrl, format };
}
