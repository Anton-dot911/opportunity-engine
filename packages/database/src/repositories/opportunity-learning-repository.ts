import { createHash } from 'node:crypto';
import { pool } from '../pool.js';

type FeedbackRow = {
  id: string;
  opportunity_id: string;
  outcome: 'achieved' | 'partially_achieved' | 'not_achieved' | 'unknown';
  success_factors: unknown;
  failure_factors: unknown;
};

type Aggregate = {
  kind: 'success_factor' | 'failure_factor';
  statement: string;
  feedbackIds: Set<string>;
  opportunityIds: Set<string>;
  outcomes: Record<string, number>;
};

function asStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim()).filter(Boolean);
}

export function normalizeLearningFactor(statement: string): string {
  return statement.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function aggregateLearningFactors(rows: FeedbackRow[]) {
  const aggregates = new Map<string, Aggregate>();
  for (const row of rows) {
    const groups = [
      { kind: 'success_factor' as const, values: asStrings(row.success_factors) },
      { kind: 'failure_factor' as const, values: asStrings(row.failure_factors) },
    ];
    for (const group of groups) {
      const seenInFeedback = new Set<string>();
      for (const statement of group.values) {
        const normalized = normalizeLearningFactor(statement);
        if (!normalized || seenInFeedback.has(normalized)) continue;
        seenInFeedback.add(normalized);
        const key = group.kind + ':' + normalized;
        let aggregate = aggregates.get(key);
        if (!aggregate) {
          aggregate = { kind: group.kind, statement: statement.trim(), feedbackIds: new Set(), opportunityIds: new Set(), outcomes: {} };
          aggregates.set(key, aggregate);
        }
        aggregate.feedbackIds.add(row.id);
        aggregate.opportunityIds.add(row.opportunity_id);
        aggregate.outcomes[row.outcome] = (aggregate.outcomes[row.outcome] ?? 0) + 1;
      }
    }
  }
  return [...aggregates.entries()]
    .filter(([, item]) => item.opportunityIds.size >= 2)
    .map(([key, item]) => ({ key, ...item }));
}

export class OpportunityLearningRepository {
  async generate() {
    const result = await pool.query<FeedbackRow>(
      `SELECT id, opportunity_id, outcome, success_factors, failure_factors
       FROM opportunity_feedback ORDER BY created_at ASC, id ASC`,
    );
    const candidates = aggregateLearningFactors(result.rows);
    const created = [];
    let refreshed = 0;
    for (const item of candidates) {
      const fingerprint = createHash('sha256').update(item.key).digest('hex');
      const upserted = await pool.query(
        `INSERT INTO opportunity_learning_insights
         (fingerprint, kind, statement, support_count, opportunity_count, feedback_ids, outcome_counts)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
         ON CONFLICT (fingerprint) DO UPDATE SET
           support_count = EXCLUDED.support_count,
           opportunity_count = EXCLUDED.opportunity_count,
           feedback_ids = EXCLUDED.feedback_ids,
           outcome_counts = EXCLUDED.outcome_counts
         WHERE opportunity_learning_insights.support_count IS DISTINCT FROM EXCLUDED.support_count
            OR opportunity_learning_insights.opportunity_count IS DISTINCT FROM EXCLUDED.opportunity_count
            OR opportunity_learning_insights.feedback_ids IS DISTINCT FROM EXCLUDED.feedback_ids
            OR opportunity_learning_insights.outcome_counts IS DISTINCT FROM EXCLUDED.outcome_counts
         RETURNING *, (xmax = 0) AS was_created`,
        [fingerprint, item.kind, item.statement, item.feedbackIds.size, item.opportunityIds.size,
         JSON.stringify([...item.feedbackIds]), JSON.stringify(item.outcomes)],
      );
      if (upserted.rows[0]) {
        if (upserted.rows[0].was_created) created.push(upserted.rows[0]);
        else refreshed += 1;
      }
    }
    return { scannedFeedback: result.rows.length, qualifyingPatterns: candidates.length, created, refreshed };
  }

  async list(status?: string) {
    const result = await pool.query(
      `SELECT * FROM opportunity_learning_insights
       WHERE ($1::text IS NULL OR status = $1)
       ORDER BY created_at DESC, id DESC`,
      [status ?? null],
    );
    return result.rows;
  }

  async listReviews(id: string) {
    const result = await pool.query(
      'SELECT * FROM opportunity_learning_reviews WHERE insight_id = $1 ORDER BY reviewed_at DESC, id DESC',
      [id],
    );
    return result.rows;
  }

  async review(id: string, status: 'accepted' | 'rejected', reviewedBy?: string) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const current = await client.query(
        'SELECT status FROM opportunity_learning_insights WHERE id = $1 FOR UPDATE',
        [id],
      );
      if (!current.rows[0]) {
        await client.query('COMMIT');
        return null;
      }
      const previousStatus = current.rows[0].status as string;
      const updated = await client.query(
        `UPDATE opportunity_learning_insights
         SET status=$2, reviewed_at=now(), reviewed_by=$3
         WHERE id=$1 RETURNING *`,
        [id, status, reviewedBy ?? null],
      );
      await client.query(
        `INSERT INTO opportunity_learning_reviews
         (insight_id, previous_status, new_status, reviewed_by)
         VALUES ($1,$2,$3,$4)`,
        [id, previousStatus, status, reviewedBy ?? null],
      );
      await client.query('COMMIT');
      return updated.rows[0] ?? null;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
