import { describe, expect, it } from 'vitest';
import { extractArticle } from './article.js';

describe('extractArticle', () => {
  it('extracts article text, title, canonical URL and content hash', () => {
    const html = '<title>Example</title><link rel="canonical" href="/canonical"><article><p>Market demand &amp; supply</p><script>bad()</script></article>';
    const result = extractArticle(html, 'https://example.org/story');
    expect(result.title).toBe('Example');
    expect(result.canonicalUrl).toBe('https://example.org/canonical');
    expect(result.text).toContain('Market demand & supply');
    expect(result.text).not.toContain('bad');
    expect(result.contentHash).toHaveLength(64);
  });
});
