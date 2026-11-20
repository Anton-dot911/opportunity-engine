import { describe, expect, it } from 'vitest';
import { parseFeed } from './rss-atom.js';

describe('RSS and Atom parsing', () => {
  it('parses RSS items and strips markup from descriptions', () => {
    const items = parseFeed(`<?xml version="1.0"?>
      <rss version="2.0"><channel><title>Example</title><item>
        <title>Market update</title><link>https://example.org/story/1</link>
        <description><![CDATA[<p>Demand <b>increased</b>.</p>]]></description>
        <pubDate>Tue, 18 Nov 2025 10:00:00 GMT</pubDate><guid>story-1</guid>
      </item></channel></rss>`);
    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      title: 'Market update',
      url: 'https://example.org/story/1',
      content: 'Demand increased .',
      metadata: { feedFormat: 'rss', guid: 'story-1' },
    });
    expect(items[0]!.publishedAt?.toISOString()).toBe('2025-11-18T10:00:00.000Z');
  });

  it('parses Atom alternate links', () => {
    const items = parseFeed(`<?xml version="1.0"?>
      <feed xmlns="http://www.w3.org/2005/Atom"><entry>
        <title>Atom story</title><link href="https://example.org/atom/1" rel="alternate"/>
        <summary>Short summary</summary><updated>2025-11-18T10:00:00Z</updated>
      </entry></feed>`);
    expect(items).toHaveLength(1);
    expect(items[0]!.url).toBe('https://example.org/atom/1');
    expect(items[0].content).toBe('Short summary');
  });

  it('rejects malformed XML and unsupported documents', () => {
    expect(() => parseFeed('<rss><channel>')).toThrow('FEED_XML_INVALID');
    expect(() => parseFeed('<html><body>not a feed</body></html>')).toThrow('FEED_FORMAT_UNSUPPORTED');
  });

  it('bounds the number of returned feed entries', () => {
    const entries = Array.from({ length: 60 }, (_, index) =>
      `<item><title>Item ${index}</title><link>https://example.org/${index}</link></item>`,
    ).join('');
    const items = parseFeed(`<rss><channel>${entries}</channel></rss>`);
    expect(items).toHaveLength(50);
  });
});
