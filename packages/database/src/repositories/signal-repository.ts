import { pool } from '../pool.js';

export type SignalSourceDocument = {
  id: string;
  title: string | null;
  content: string;
  published_at: string | null;
};

export type ExtractedSignal = {
  signalType: string;
  summary: string;
  observedAt: string | null;
  confidence: number;
  dedupKey: string;
  extractionMethod: string;
};

export class SignalRepository {
  async claimDocuments(limit = 10): Promise<SignalSourceDocument[]> {
    const result = await pool.query(
      `WITH claimed AS (
         SELECT id FROM documents
         WHERE processing_status = 'processed'
           AND signal_processing_status IN ('pending', 'failed')
           AND content IS NOT NULL AND length(trim(content)) > 0
         ORDER BY processing_completed_at ASC NULLS FIRST
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE documents d
       SET signal_processing_status = 'processing',
           signal_processing_started_at = now(),
           signal_processing_error = NULL
       FROM claimed
       WHERE d.id = claimed.id
       RETURNING d.id, d.title, d.content, d.published_at`,
      [Math.max(1, Math.min(100, Math.floor(limit)))],
    );
    return result.rows as SignalSourceDocument[];
  }

  async saveSignals(documentId: string, signals: ExtractedSignal[]): Promise<number> {
    let inserted = 0;
    for (const signal of signals) {
      const result = await pool.query(
        `INSERT INTO signals (document_id, signal_type, summary, observed_at, confidence, review_status, dedup_key, extraction_method)
         VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
         ON CONFLICT (dedup_key) WHERE dedup_key IS NOT NULL DO NOTHING
         RETURNING id`,
        [documentId, signal.signalType, signal.summary, signal.observedAt, signal.confidence, signal.dedupKey, signal.extractionMethod],
      );
      inserted += result.rowCount ?? 0;
    }
    return inserted;
  }

  async completeDocument(id: string): Promise<void> {
    await pool.query(
      `UPDATE documents SET signal_processing_status = 'processed',
       signal_processing_started_at = NULL, signal_processing_completed_at = now(),
       signal_processing_error = NULL WHERE id = $1`,
      [id],
    );
  }

  async failDocument(id: string, error: string): Promise<void> {
    await pool.query(
      `UPDATE documents SET signal_processing_status = 'failed',
       signal_processing_started_at = NULL, signal_processing_error = $2 WHERE id = $1`,
      [id, error.slice(0, 1000)],
    );
  }
}
