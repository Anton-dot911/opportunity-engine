import { lookup as dnsLookup } from 'node:dns/promises';
import { request as httpRequest, type RequestOptions } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { isIP } from 'node:net';

export type ResolveHost = (hostname: string) => Promise<string[]>;

const defaultResolveHost: ResolveHost = async (hostname) => {
  const records = await dnsLookup(hostname, { all: true, verbatim: true });
  return records.map(({ address }) => address);
};

function ipv4ToNumber(ip: string): number {
  return ip.split('.').reduce((value, part) => ((value << 8) | Number(part)) >>> 0, 0);
}

function inCidr(ip: string, network: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4ToNumber(ip) & mask) === (ipv4ToNumber(network) & mask);
}

function isNonPublicIPv4(ip: string): boolean {
  const blocked: Array<[string, number]> = [
    ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
    ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24],
    ['192.0.2.0', 24], ['192.88.99.0', 24], ['192.168.0.0', 16],
    ['198.18.0.0', 15], ['198.51.100.0', 24], ['203.0.113.0', 24],
    ['224.0.0.0', 4], ['240.0.0.0', 4],
  ];
  return blocked.some(([network, bits]) => inCidr(ip, network, bits));
}

function ipv6Groups(ip: string): number[] {
  const normalized = ip.toLowerCase().split('%')[0] ?? '';
  const halves = normalized.split('::');
  if (halves.length > 2) return [];
  const left = halves[0] ? halves[0].split(':').filter(Boolean) : [];
  const right = halves[1] ? halves[1].split(':').filter(Boolean) : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return [];
  return [...left, ...Array(missing).fill('0'), ...right].map((part) => Number.parseInt(part, 16));
}

function isNonPublicIPv6(ip: string): boolean {
  const groups = ipv6Groups(ip);
  if (groups.length !== 8 || groups.some((group) => !Number.isInteger(group) || group < 0 || group > 0xffff)) return true;
  const [a = 0, b = 0, c = 0, d = 0, e = 0, f = 0, g = 0, h = 0] = groups;
  // IPv4-mapped addresses must be evaluated using their embedded IPv4 address.
  if (groups.slice(0, 5).every((part) => part === 0) && f === 0xffff) {
    const embedded = [g >> 8, g & 255, h >> 8, h & 255].join('.');
    return isNonPublicIPv4(embedded);
  }
  // Only global-unicast 2000::/3 is eligible; deny special-use subranges.
  if (a < 0x2000 || a > 0x3fff) return true;
  if (a === 0x2001 && (b === 0x0db8 || b === 0 || (b >= 0x0010 && b <= 0x002f))) return true;
  if (a === 0x2002) return true; // 6to4 transition space
  if (a === 0x3fff) return true; // documentation range
  return false;
}

export function assertPublicAddress(address: string): void {
  const family = isIP(address);
  if (!family || (family === 4 ? isNonPublicIPv4(address) : isNonPublicIPv6(address))) {
    throw new Error('URL resolves to a private, reserved, or invalid IP address');
  }
}

export async function resolveAndValidate(hostname: string, resolver: ResolveHost = defaultResolveHost): Promise<string[]> {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (isIP(host)) {
    assertPublicAddress(host);
    return [host];
  }
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) {
    throw new Error('URL resolves to a private, reserved, or invalid IP address');
  }
  const addresses = await resolver(host);
  if (addresses.length === 0) throw new Error('Hostname did not resolve');
  // Fail closed if even one DNS answer is non-public.
  addresses.forEach(assertPublicAddress);
  return addresses;
}

export function createPinnedLookup(address: string): NonNullable<RequestOptions['lookup']> {
  const family = isIP(address);
  assertPublicAddress(address);
  return (( _hostname: string, options: unknown, callback: (...args: unknown[]) => void) => {
    if (options && typeof options === 'object' && 'all' in options && options.all === true) {
      callback(null, [{ address, family }]);
    } else {
      callback(null, address, family);
    }
  }) as NonNullable<RequestOptions['lookup']>;
}

export type SecureHttpOptions = {
  timeoutMs: number;
  maxBytes: number;
  resolveHost?: ResolveHost;
  headers?: Record<string, string>;
};

export async function secureHttpGet(input: URL, options: SecureHttpOptions): Promise<Response> {
  if (input.protocol !== 'http:' && input.protocol !== 'https:') throw new Error('Only HTTP and HTTPS URLs are supported');
  if (input.username || input.password) throw new Error('URL credentials are not allowed');

  const addresses = await resolveAndValidate(input.hostname, options.resolveHost);
  const pinnedAddress = addresses[0]!;
  const requestOptions: RequestOptions = {
    method: 'GET',
    headers: {
      host: input.host,
      'user-agent': 'OpportunityEngine/0.1',
      accept: options.headers?.accept ?? '*/*',
      ...options.headers,
    },
    lookup: createPinnedLookup(pinnedAddress),
    ...(input.protocol === 'https:' ? { servername: input.hostname.replace(/^\[|\]$/g, '') } : {}),
  };
  const requestFn = input.protocol === 'https:' ? httpsRequest : httpRequest;

  return new Promise<Response>((resolve, reject) => {
    const request = requestFn(input, requestOptions, (response) => {
      const chunks: Buffer[] = [];
      let total = 0;
      response.on('data', (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        total += buffer.byteLength;
        if (total > options.maxBytes) {
          request.destroy(new Error('HTTP response exceeds size limit'));
          return;
        }
        chunks.push(buffer);
      });
      response.on('end', () => {
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers)) {
          if (Array.isArray(value)) value.forEach((entry) => headers.append(name, entry));
          else if (value !== undefined) headers.set(name, String(value));
        }
        const init: ResponseInit = { status: response.statusCode ?? 502, headers };
        if (response.statusMessage) init.statusText = response.statusMessage;
        resolve(new Response(Buffer.concat(chunks), init));
      });
      response.on('error', reject);
    });
    request.setTimeout(options.timeoutMs, () => request.destroy(new Error('HTTP request timed out')));
    request.on('error', reject);
    request.end();
  });
}
