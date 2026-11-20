import { pool } from '../pool.js';

export type SourceType = 'url' | 'rss' | 'atom' | 'upload' | 'api';

export type SourceRecord = {
  id: string;
  name: string;
  type: SourceType;
  locator: string;
  enabled: boolean;
  createdAt: string;
};

function mapSource(row: Record<string, unknown>): SourceRecord {
  return {
    id: row.id as string,
    name: row.name as string,
    type: row.type as SourceType,
    locator: row.locator as string,
    enabled: row.enabled as boolean,
    createdAt: (row.created_at as Date).toISOString(),
  };
}

export class SourceRepository {
  async list(): Promise<SourceRecord[]> {
    const result = await pool.query(
      `SELECT id, name, type, locator, enabled, created_at
       FROM sources ORDER BY created_at DESC LIMIT 100`,
    );
    return result.rows.map((row) => mapSource(row));
  }

  async getById(id: string): Promise<SourceRecord | null> {
    const result = await pool.query(
      `SELECT id, name, type, locator, enabled, created_at
       FROM sources WHERE id = $1 LIMIT 1`,
      [id],
    );
    return result.rows[0] ? mapSource(result.rows[0]) : null;
  }

  async create(input: { name: string; type: SourceType; locator: string }): Promise<SourceRecord> {
    const result = await pool.query(
      `INSERT INTO sources (name, type, locator)
       VALUES ($1, $2, $3)
       RETURNING id, name, type, locator, enabled, created_at`,
      [input.name, input.type, input.locator],
    );
    return mapSource(result.rows[0]);
  }
}
