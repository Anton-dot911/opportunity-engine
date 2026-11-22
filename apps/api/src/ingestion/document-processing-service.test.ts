import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentProcessingService } from './document-processing-service.js';

const fetchArticleHtml = vi.fn();
const extractArticle = vi.fn();
vi.mock('@oe/connectors', () => ({ fetchArticleHtml, extractArticle }));

describe('DocumentProcessingService', () => {
  const documents = {
    claimPending: vi.fn(),
    complete: vi.fn(),
    fail: vi.fn(),
  };
  let service: DocumentProcessingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new DocumentProcessingService(documents as never);
  });

  it('fetches, extracts, and persists normalized article data', async () => {
    documents.claimPending.mockResolvedValue([{
      id: 'doc-1', canonical_url: 'https://example.com/article', title: 'Feed title', content: null, metadata: {},
    }]);
    fetchArticleHtml.mockResolvedValue({ url: 'https://example.com/article', html: '<html/>', contentType: 'text/html' });
    extractArticle.mockReturnValue({
      title: 'Article title', canonicalUrl: 'https://example.com/canonical', text: 'Normalized article body',
      contentHash: 'hash-1', language: 'en', byline: 'Author', excerpt: 'Excerpt', siteName: 'Example',
      publishedTime: null, extractionMethod: 'readability', extractor: 'readability-v1',
    });

    await expect(service.processPending(5)).resolves.toEqual({ kind: 'success', claimed: 1, processed: 1, failed: 0 });
    expect(fetchArticleHtml).toHaveBeenCalledWith('https://example.com/article');
    expect(documents.complete).toHaveBeenCalledWith(expect.objectContaining({
      id: 'doc-1', canonicalUrl: 'https://example.com/canonical', title: 'Article title',
      content: 'Normalized article body', contentHash: 'hash-1', language: 'en',
    }));
    expect(documents.fail).not.toHaveBeenCalled();
  });

  it('marks individual failures and continues processing the batch', async () => {
    documents.claimPending.mockResolvedValue([
      { id: 'doc-1', canonical_url: 'https://example.com/bad', title: null, content: null, metadata: {} },
      { id: 'doc-2', canonical_url: 'https://example.com/good', title: null, content: null, metadata: {} },
    ]);
    fetchArticleHtml.mockRejectedValueOnce(new Error('fetch timeout')).mockResolvedValueOnce({
      url: 'https://example.com/good', html: '<html/>', contentType: 'text/html',
    });
    extractArticle.mockReturnValue({
      title: 'Good article', canonicalUrl: 'https://example.com/good', text: 'Body', contentHash: 'hash',
      language: null, byline: null, excerpt: null, siteName: null, publishedTime: null,
      extractionMethod: 'readability', extractor: 'readability-v1',
    });

    await expect(service.processPending()).resolves.toEqual({ kind: 'success', claimed: 2, processed: 1, failed: 1 });
    expect(documents.fail).toHaveBeenCalledWith('doc-1', 'fetch timeout');
    expect(documents.complete).toHaveBeenCalledTimes(1);
  });
});
