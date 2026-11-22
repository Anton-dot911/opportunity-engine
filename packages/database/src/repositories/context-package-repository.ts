import { pool } from '../pool.js';

export type ContextPackageInput = {
  agent: string;
  task: string;
  tags?: string[] | undefined;
  itemTypes?: string[] | undefined;
  limit?: number | undefined;
};

export class ContextPackageRepository {
  async build(input: ContextPackageInput) {
    const limit = Math.max(1, Math.min(100, Math.floor(input.limit ?? 20)));
    const tags = input.tags?.length ? input.tags : null;
    const itemTypes = input.itemTypes?.length ? input.itemTypes : null;
    const selection = { tags: tags ?? [], itemTypes: itemTypes ?? [], limit };
    const result = await pool.query(
      `WITH selected AS (
         SELECT id, context_key, item_type, title, content, provenance, priority, confidence,
                status, tags, valid_from, valid_until, created_at, updated_at,
                (priority * 0.65 + confidence * 25
                  + CASE WHEN cardinality($1::text[]) > 0
                         THEN (SELECT count(*) FROM unnest(tags) tag WHERE tag = ANY($1::text[])) * 8
                         ELSE 0 END) AS relevance_score
         FROM context_items
         WHERE status = 'active'
           AND (valid_from IS NULL OR valid_from <= now())
           AND (valid_until IS NULL OR valid_until > now())
           AND ($2::text[] IS NULL OR item_type = ANY($2::text[]))
         ORDER BY relevance_score DESC, updated_at DESC, id ASC
         LIMIT $3
       ), snapshot AS (
         SELECT COALESCE(jsonb_agg(to_jsonb(selected) - 'relevance_score'
                    ORDER BY relevance_score DESC, updated_at DESC, id ASC), '[]'::jsonb) AS items,
                count(*)::integer AS item_count
         FROM selected
       )
       INSERT INTO context_packages (agent, task, selection, items, item_count)
       SELECT $4, $5, $6::jsonb, snapshot.items, snapshot.item_count FROM snapshot
       RETURNING *`,
      [tags, itemTypes, limit, input.agent, input.task, JSON.stringify(selection)],
    );
    return result.rows[0];
  }

  async getById(id: string) {
    const result = await pool.query('SELECT * FROM context_packages WHERE id = $1', [id]);
    return result.rows[0] ?? null;
  }
}
