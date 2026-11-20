import { pool } from '../pool.js';

export type IngestionRunStatus = 'running' | 'succeeded' | 'failed';

export class IngestionRepository {
  async createRun(sourceId: string): Promise<string> {
    const result = await pool.query(
      `INSERT INTO ingestion_runs (source_id, status, started_at)
       VALUES ($1, 'running', now()) RETURNING id`,
      [sourceId],
    );
    return result.rows[0].id as string;
  }

  async saveDocument(input: {
    sourceId: string;
    canonicalUrl: string;
    title: string | null;
    content: string | null;
    contentHash: string;
    publishedAt: Date | null;
    metadata: Record<string, unknown>;
  }): Promise<boolean> {
    const result = await pool.query(
      `INSERT INTO documents
         (source_id, canonical_url, title, content, content_hash, published_at, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
       ON CONFLICT (source_id, canonical_url) WHERE canonical_url IS NOT NULL
       DO NOTHING
       RETURNING id`,
      [
        input.sourceId,
        input.canonicalUrl,
        input.title,
        input.content,
        input.contentHash,
        input.publishedAt,
        JSON.stringify(input.metadata),
      ],
    );
    if (result.rowCount) return true;

    const duplicateByHash = await pool.query(
      `SELECT 1 FROM documents
       WHERE source_id = $1 AND content_hash = $2
       LIMIT 1`,
      [input.sourceId, input.contentHash],
    );
    return false;
  }

  async finishRun(input: {
    runId: string;
    status: Exclude<IngestionRunStatus, 'running'>;
    itemsSeen: number;
    itemsCreated: number;
    errorSummary?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    await pool.query(
      `UPDATE ingestion_runs
       SET status = $2, finished_at = now(), items_seen = $3,
           items_created = $4, error_summary = $5, metadata = $6::jsonb
       WHERE id = $1`,
      [
        input.runId,
        input.status,
        input.itemsSeen,
        input.itemsCreated,
        input.errorSummary ?? null,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }
}
