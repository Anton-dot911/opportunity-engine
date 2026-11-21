import { createHash } from 'node:crypto';
import { Readability } from '@mozilla/readability';
import { JSDOM } from 'jsdom';

const MAX_TEXT_LENGTH = 100_000;
const MAX_DOM_ELEMENTS = 10_000;

export type ExtractedArticle = {
  title: string | null;
  canonicalUrl: string;
  text: string;
  contentHash: string;
  byline: string | null;
  excerpt: string | null;
  siteName: string | null;
  publishedTime: string | null;
  language: string | null;
  extractionMethod: 'readability' | 'body-fallback';
  extractor: 'readability-v1';
};

function normalizeText(value: string): string {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, MAX_TEXT_LENGTH);
}

function resolveCanonicalUrl(sourceUrl: string, candidate: string | null): string {
  if (!candidate) return sourceUrl;
  try {
    const url = new URL(candidate, sourceUrl);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return sourceUrl;
    return url.toString();
  } catch {
    return sourceUrl;
  }
}

function getFallbackText(document: Document): string {
  const body = document.body?.cloneNode(true) as HTMLElement | undefined;
  if (!body) return '';
  body.querySelectorAll('script, style, noscript, nav, header, footer, aside, form, iframe, svg').forEach((element) => element.remove());
  return body.textContent ?? '';
}

export function extractArticle(html: string, sourceUrl: string): ExtractedArticle {
  const dom = new JSDOM(html, { url: sourceUrl });
  try {
    const document = dom.window.document;
    const fallbackText = getFallbackText(document);
    const sourceTitle = document.title.trim() || null;
    const canonicalHref = document.querySelector('link[rel~="canonical"]')?.getAttribute('href')?.trim() ?? null;
    const canonicalUrl = resolveCanonicalUrl(sourceUrl, canonicalHref);

    let article: ReturnType<Readability['parse']> = null;
    try {
      article = new Readability(document, { maxElemsToParse: MAX_DOM_ELEMENTS }).parse();
    } catch {
      article = null;
    }

    const extractionMethod = article ? 'readability' : 'body-fallback';
    const text = normalizeText(article?.textContent ?? fallbackText);
    const title = article?.title?.trim() || sourceTitle;
    const language = document.documentElement.lang?.trim() || article?.lang?.trim() || null;

    return {
      title,
      canonicalUrl,
      text,
      contentHash: createHash('sha256').update(text).digest('hex'),
      byline: article?.byline?.trim() || null,
      excerpt: article?.excerpt?.trim() || null,
      siteName: article?.siteName?.trim() || null,
      publishedTime: article?.publishedTime?.trim() || null,
      language,
      extractionMethod,
      extractor: 'readability-v1',
    };
  } finally {
    dom.window.close();
  }
}
