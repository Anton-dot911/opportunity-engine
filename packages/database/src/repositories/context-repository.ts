import { pool } from '../pool.js';

export type ContextItemInput = {
  contextKey: string;
  itemType: string;
  title: string;
  content: unknown;
  provenance?: unknown;
  priority?: number;
  confidence?: number;
  status?: 'draft' | 'review' | 'active' | 'rejected' | 'expired';
  tags?: string[];
  validFrom?: string | null;
  validUntil?: string | null;
};

export class ContextRepository {
  async create(input: ContextItemInput) {
    const result = await pool.query(
      `INSERT INTO context_items (context_key, item_type, title, content, provenance, priority, confidence, status, tags, valid_from, valid_until)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (context_key) DO UPDATE SET
         item_type = EXCLUDED.item_type, title = EXCLUDED.title, content = EXCLUDED.content,
         provenance = EXCLUDED.provenance, priority = EXCLUDED.priority, confidence = EXCLUDED.confidence,
         tags = EXCLUDED.tags, valid_from = EXCLUDED.valid_from, valid_until = EXCLUDED.valid_until,
         updated_at = now()
       RETURNING *`,
      [input.contextKey, input.itemType, input.title, JSON.stringify(input.content), JSON.stringify(input.provenance ?? {}), input.priority ?? 50, input.confidence ?? 0.5, input.status ?? 'review', input.tags ?? [], input.validFrom ?? null, input.validUntil ?? null],
    );
    return result.rows[0];
  }

  async list(options: { status?: string; itemType?: string; tags?: string[]; limit?: number } = {}) {
    const result = await pool.query(
      `SELECT * FROM context_items
       WHERE ($1::text IS NULL OR status = $1)
         AND ($2::text IS NULL OR item_type = $2)
         AND ($3::text[] IS NULL OR tags && $3::text[])
         AND (valid_from IS NULL OR valid_from <= now())
         AND (valid_until IS NULL OR valid_until > now())
       ORDER BY priority DESC, updated_at DESC
       LIMIT $4`,
      [options.status ?? null, options.itemType ?? null, options.tags?.length ? options.tags : null, Math.max(1, Math.min(200, Math.floor(options.limit ?? 50)))],
    );
    return result.rows;
  }

  async setStatus(id: string, status: ContextItemInput['status']) {
    const result = await pool.query(
      'UPDATE context_items SET status = $2, updated_at = now() WHERE id = $1 RETURNING *',
      [id, status],
    );
    return result.rows[0] ?? null;
  }
}
