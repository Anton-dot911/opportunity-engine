import { pool } from '../pool.js';

export type PendingDocument = {
  id: string;
  canonical_url: string;
  title: string | null;
  content: string | null;
  metadata: Record<string, unknown>;
};

export class DocumentProcessingRepository {
  async claimPending(limit = 10): Promise<PendingDocument[]> {
    const result = await pool.query(
      `WITH claimed AS (
         SELECT id FROM documents
         WHERE processing_status IN ('pending', 'failed')
           AND canonical_url IS NOT NULL
         ORDER BY collected_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE documents d
       SET processing_status = 'processing',
           processing_attempts = processing_attempts + 1,
           processing_started_at = now(),
           processing_error = NULL
       FROM claimed
       WHERE d.id = claimed.id
       RETURNING d.id, d.canonical_url, d.title, d.content, d.metadata`,
      [Math.max(1, Math.min(100, Math.floor(limit)))],
    );
    return result.rows as PendingDocument[];
  }

  async complete(input: {
    id: string;
    canonicalUrl: string;
    title: string | null;
    content: string;
    contentHash: string;
    language: string | null;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await pool.query(
      `UPDATE documents
       SET canonical_url = $2, title = $3, content = $4, content_hash = $5,
           language = $6, metadata = metadata || $7::jsonb,
           processing_status = 'processed', processing_completed_at = now(),
           processing_error = NULL
       WHERE id = $1`,
      [input.id, input.canonicalUrl, input.title, input.content, input.contentHash, input.language, JSON.stringify(input.metadata)],
    );
  }

  async fail(id: string, error: string): Promise<void> {
    await pool.query(
      `UPDATE documents
       SET processing_status = 'failed', processing_error = $2,
           processing_started_at = NULL
       WHERE id = $1`,
      [id, error.slice(0, 1000)],
    );
  }
}
