import { describe, expect, it, vi } from 'vitest';
import { fetchArticleHtml, validateArticleUrl } from './fetch-article.js';

describe('validateArticleUrl', () => {
  it('accepts a public hostname when DNS resolves publicly', async () => {
    const result = await validateArticleUrl('https://example.com/article', async () => ['93.184.216.34']);
    expect(result.hostname).toBe('example.com');
  });

  it('rejects private IP literals', async () => {
    await expect(validateArticleUrl('http://127.0.0.1', async () => [])).rejects.toThrow(/private/);
  });

  it('rejects unsupported schemes and URL credentials', async () => {
    await expect(validateArticleUrl('file:///etc/passwd')).rejects.toThrow(/HTTP/);
    await expect(validateArticleUrl('https://user:pass@example.com')).rejects.toThrow(/credentials/);
  });
});

describe('fetchArticleHtml', () => {
  it('fetches HTML and returns content type and final URL', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('<html/>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }),
    );
    const result = await fetchArticleHtml('https://example.com', {
      fetchImpl,
      resolveHost: async () => ['93.184.216.34'],
    });
    expect(result.html).toBe('<html/>');
    expect(result.url).toBe('https://example.com/');
  });

  it('accepts XHTML responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('<html/>', { status: 200, headers: { 'content-type': 'application/xhtml+xml' } }),
    );
    await expect(fetchArticleHtml('https://example.com', {
      fetchImpl,
      resolveHost: async () => ['93.184.216.34'],
    })).resolves.toMatchObject({ contentType: 'application/xhtml+xml' });
  });

  it('rejects non-HTML responses', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('not html', { status: 200, headers: { 'content-type': 'application/json' } }),
    );
    await expect(fetchArticleHtml('https://example.com', {
      fetchImpl,
      resolveHost: async () => ['93.184.216.34'],
    })).rejects.toThrow('Article response is not HTML');
  });

  it('enforces the response byte limit while streaming', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('1234'));
        controller.enqueue(new TextEncoder().encode('56'));
        controller.close();
      },
    });
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(body, { status: 200, headers: { 'content-type': 'text/html' } }),
    );
    await expect(fetchArticleHtml('https://example.com', {
      fetchImpl,
      resolveHost: async () => ['93.184.216.34'],
      maxBytes: 5,
    })).rejects.toThrow('Article response exceeds size limit');
  });

  it('validates redirect destinations before requesting them', async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/private' } }),
    );
    await expect(fetchArticleHtml('https://example.com', {
      fetchImpl,
      resolveHost: async (host) => (host === 'example.com' ? ['93.184.216.34'] : ['127.0.0.1']),
    })).rejects.toThrow(/private/);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});
