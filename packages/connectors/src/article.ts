import { createHash } from 'node:crypto';

export type ExtractedArticle = {
  title: string | null;
  canonicalUrl: string;
  text: string;
  contentHash: string;
  extractor: 'basic-html-v1';
};

export function extractArticle(html: string, sourceUrl: string): ExtractedArticle {
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/<[^>]*>/g, '').trim() ?? null;
  const canonical = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1];
  let canonicalUrl = sourceUrl;
  try { if (canonical) canonicalUrl = new URL(canonical, sourceUrl).toString(); } catch {}
  const main = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i)?.[1] ?? html.match(/<main[^>]*>([\s\S]*?)<\/main>/i)?.[1] ?? html;
  const text = main.replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<br\s*\/?\s*>/gi, '\n').replace(/<\/(p|div|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]*>/g, ' ').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/[\t\r ]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n').trim().slice(0, 100000);
  return { title, canonicalUrl, text, contentHash: createHash('sha256').update(text).digest('hex'), extractor: 'basic-html-v1' };
}
