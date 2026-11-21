import { describe, expect, it } from 'vitest';
import { extractArticle } from './article.js';

const articleHtml = `<!doctype html>
<html lang="en">
<head>
  <title>Supply chain market report</title>
  <link rel="canonical" href="/reports/supply-chain">
</head>
<body>
  <nav>Navigation menu and unrelated links</nav>
  <article>
    <h1>Supply chain market report</h1>
    <p>Market demand increased across several regions as suppliers struggled to replenish inventory. Retailers reported longer delivery windows and reduced availability for frequently purchased goods.</p>
    <p>Wholesale prices changed during the quarter, while smaller distributors faced higher operating costs. The disruption created new opportunities for companies that could aggregate demand and coordinate reliable sourcing.</p>
    <p>Several businesses responded by changing purchasing schedules and negotiating alternative supply arrangements. These changes were measurable in order volume, delivery time, and the price paid per unit.</p>
    <p>Further research is required to determine whether the market imbalance is temporary or structural, and whether the observed changes create sustainable value for participants.</p>
  </article>
  <script>window.untrusted = 'must not appear';</script>
  <footer>Copyright and site navigation</footer>
</body>
</html>`;

describe('extractArticle', () => {
  it('extracts readable article text, title, canonical URL, and metadata', () => {
    const result = extractArticle(articleHtml, 'https://example.org/story');

    expect(result.title?.toLowerCase()).toContain('supply chain');
    expect(result.canonicalUrl).toBe('https://example.org/reports/supply-chain');
    expect(result.text).toContain('Market demand increased');
    expect(result.text).toContain('sustainable value');
    expect(result.text).not.toContain('Navigation menu');
    expect(result.text).not.toContain('must not appear');
    expect(result.text).not.toContain('Copyright');
    expect(result.language).toBe('en');
    expect(result.extractor).toBe('readability-v1');
    expect(result.extractionMethod).toBe('readability');
    expect(result.contentHash).toHaveLength(64);
  });

  it('decodes HTML entities on short pages', () => {
    const result = extractArticle('<html><head><title>Short</title></head><body><p>Supply &amp; demand</p></body></html>', 'https://example.org/short');
    expect(result.text).toContain('Supply & demand');
    expect(result.title).toBe('Short');
  });

  it('uses the body fallback when Readability cannot parse a page', () => {
    const result = extractArticle('<html><head><title>Empty</title></head><body></body></html>', 'https://example.org/empty');
    expect(result.text).toBe('');
    expect(result.extractionMethod).toBe('body-fallback');
  });


  it('ignores invalid canonical URLs and uses the source URL', () => {
    const result = extractArticle('<link rel="canonical" href="javascript:alert(1)"><article><p>Some content.</p></article>', 'https://example.org/source');
    expect(result.canonicalUrl).toBe('https://example.org/source');
  });

  it('caps extracted text length', () => {
    const longText = 'market signal '.repeat(12_000);
    const result = extractArticle(`<html><head><title>Long article</title></head><body><article><p>${longText}</p></article></body></html>`, 'https://example.org/long');
    expect(result.text.length).toBeLessThanOrEqual(100_000);
  });
});
