import { DocumentProcessingRepository } from '@oe/database';
import { extractArticle, fetchArticleHtml } from '@oe/connectors';

export class DocumentProcessingService {
  constructor(private readonly documents = new DocumentProcessingRepository()) {}

  async processPending(limit = 10) {
    const batch = await this.documents.claimPending(limit);
    let processed = 0;
    let failed = 0;

    for (const document of batch) {
      try {
        const fetched = await fetchArticleHtml(document.canonical_url);
        const article = extractArticle(fetched.html, fetched.url);
        if (!article.text.trim()) throw new Error('ARTICLE_TEXT_EMPTY');

        await this.documents.complete({
          id: document.id,
          canonicalUrl: article.canonicalUrl,
          title: article.title ?? document.title,
          content: article.text,
          contentHash: article.contentHash,
          language: article.language,
          metadata: {
            extraction: {
              method: article.extractionMethod,
              extractor: article.extractor,
              byline: article.byline,
              excerpt: article.excerpt,
              siteName: article.siteName,
              publishedTime: article.publishedTime,
              fetchedUrl: fetched.url,
              fetchedContentType: fetched.contentType,
            },
          },
        });
        processed += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'DOCUMENT_PROCESSING_FAILED';
        await this.documents.fail(document.id, reason);
        failed += 1;
      }
    }

    return { kind: 'success' as const, claimed: batch.length, processed, failed };
  }
}
