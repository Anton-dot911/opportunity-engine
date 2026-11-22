import { pool } from '../pool.js';
type EntityExtraction = {
  entities: Array<{ name: string; normalizedName: string; evidenceExcerpt: string; confidence: number; dedupKey: string }>;
  relationships: Array<{ subjectName: string; objectName: string; predicate: 'acquired' | 'partnered_with'; evidenceExcerpt: string; confidence: number; dedupKey: string }>;
};

export type EntitySourceDocument = { id: string; content: string };

export class EntityRepository {
  async claimDocuments(limit = 10): Promise<EntitySourceDocument[]> {
    const result = await pool.query(
      `WITH claimed AS (
         SELECT id FROM documents
         WHERE processing_status = 'processed'
           AND (entity_processing_status IN ('pending', 'failed') OR (entity_processing_status = 'processing' AND entity_processing_started_at < now() - interval '15 minutes'))
           AND content IS NOT NULL AND length(trim(content)) > 0
         ORDER BY processing_completed_at ASC NULLS FIRST
         LIMIT $1
         FOR UPDATE SKIP LOCKED
       )
       UPDATE documents d
       SET entity_processing_status = 'processing',
           entity_processing_started_at = now(),
           entity_processing_error = NULL
       FROM claimed
       WHERE d.id = claimed.id
       RETURNING d.id, d.content`,
      [Math.max(1, Math.min(100, Math.floor(limit)))],
    );
    return result.rows as EntitySourceDocument[];
  }

  async saveExtraction(documentId: string, extraction: EntityExtraction): Promise<{ entitiesCreated: number; mentionsCreated: number; relationshipsCreated: number }> {
    const ids = new Map<string, string>();
    let entitiesCreated = 0;
    let mentionsCreated = 0;
    let relationshipsCreated = 0;
    for (const item of extraction.entities) {
      const entity = await pool.query(
        `INSERT INTO entities (entity_type, canonical_name, normalized_name)
         VALUES ('organization', $1, $2)
         ON CONFLICT (entity_type, normalized_name) DO UPDATE SET updated_at = now()
         RETURNING id, (xmax = 0) AS inserted`,
        [item.name, item.normalizedName],
      );
      const row = entity.rows[0] as { id: string; inserted: boolean };
      ids.set(item.normalizedName, row.id);
      if (row.inserted) entitiesCreated += 1;
      await pool.query(
        `INSERT INTO entity_aliases (entity_id, alias, normalized_alias)
         VALUES ($1, $2, $3) ON CONFLICT (entity_id, normalized_alias) DO NOTHING`,
        [row.id, item.name, item.normalizedName],
      );
      const mention = await pool.query(
        `INSERT INTO entity_mentions (entity_id, document_id, mention_text, evidence_excerpt, confidence, extraction_method, dedup_key)
         VALUES ($1, $2, $3, $4, $5, 'heuristic-org-suffix-v1', $6)
         ON CONFLICT (dedup_key) DO NOTHING RETURNING id`,
        [row.id, documentId, item.name, item.evidenceExcerpt, item.confidence, item.dedupKey],
      );
      mentionsCreated += mention.rowCount ?? 0;
    }
    for (const relation of extraction.relationships) {
      const subjectId = ids.get(relation.subjectName.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim());
      const objectId = ids.get(relation.objectName.toLocaleLowerCase().replace(/[^\\p{L}\\p{N}]+/gu, ' ').trim());
      if (!subjectId || !objectId) continue;
      const inserted = await pool.query(
        `INSERT INTO entity_relationships (subject_entity_id, predicate, object_entity_id, document_id, evidence_excerpt, confidence, extraction_method, dedup_key)
         VALUES ($1, $2, $3, $4, $5, $6, 'heuristic-relation-v1', $7)
         ON CONFLICT (dedup_key) DO NOTHING RETURNING id`,
        [subjectId, relation.predicate, objectId, documentId, relation.evidenceExcerpt, relation.confidence, relation.dedupKey],
      );
      relationshipsCreated += inserted.rowCount ?? 0;
    }
    return { entitiesCreated, mentionsCreated, relationshipsCreated };
  }

  async completeDocument(id: string): Promise<void> {
    await pool.query(
      `UPDATE documents SET entity_processing_status = 'processed',
       entity_processing_started_at = NULL, entity_processing_completed_at = now(),
       entity_processing_error = NULL WHERE id = $1`,
      [id],
    );
  }

  async failDocument(id: string, error: string): Promise<void> {
    await pool.query(
      `UPDATE documents SET entity_processing_status = 'failed',
       entity_processing_started_at = NULL, entity_processing_error = $2 WHERE id = $1`,
      [id, error.slice(0, 1000)],
    );
  }
}
