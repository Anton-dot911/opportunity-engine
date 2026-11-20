import { createHash } from 'node:crypto';
import { IngestionRepository, SourceRepository } from '@oe/database';
import { fetchFeed } from '@oe/connectors';

export class IngestionService {
  constructor(
    private readonly sources = new SourceRepository(),
    private readonly ingestion = new IngestionRepository(),
  ) {}

  async ingestSource(sourceId: string) {
    const source = await this.sources.getById(sourceId);
    if (!source) return { kind: 'not_found' as const };
    if (!source.enabled) return { kind: 'disabled' as const };
    if (source.type !== 'rss' && source.type !== 'atom') {
      return { kind: 'unsupported_source' as const };
    }

    const runId = await this.ingestion.createRun(source.id);
    let itemsSeen = 0;
    let itemsCreated = 0;
    try {
      const feed = await fetchFeed(source.locator);
      itemsSeen = feed.items.length;
      for (const item of feed.items) {
        const contentHash = createHash('sha256')
          .update([item.title ?? '', item.content ?? '', item.publishedAt?.toISOString() ?? ''].join('\n'))
          .digest('hex');
        const created = await this.ingestion.saveDocument({
          sourceId: source.id,
          canonicalUrl: item.url,
          title: item.title,
          content: item.content,
          contentHash,
          publishedAt: item.publishedAt,
          metadata: { ...item.metadata, feedUrl: feed.finalUrl, feedFormat: feed.format },
        });
        if (created) itemsCreated += 1;
      }
      await this.ingestion.finishRun({
        runId,
        status: 'succeeded',
        itemsSeen,
        itemsCreated,
        metadata: { feedFormat: feed.format, finalUrl: feed.finalUrl },
      });
      return { kind: 'success' as const, runId, itemsSeen, itemsCreated };
    } catch (error) {
      const errorSummary = error instanceof Error ? error.message.slice(0, 500) : 'INGESTION_FAILED';
      await this.ingestion.finishRun({
        runId,
        status: 'failed',
        itemsSeen,
        itemsCreated,
        errorSummary,
      });
      return { kind: 'failed' as const, runId, itemsSeen, itemsCreated, error: errorSummary };
    }
  }
}
