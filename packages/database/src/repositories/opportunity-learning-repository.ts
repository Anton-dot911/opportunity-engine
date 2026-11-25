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

export class OpportunityLearningRepository {
  async generate() {
    const result = await pool.query<FeedbackRow>(
      `SELECT id, opportunity_id, outcome, success_factors, failure_factors
       FROM opportunity_feedback ORDER BY created_at ASC, id ASC`,
    );
    const aggregates = new Map<string, Aggregate>();
    for (const row of result.rows) {
      const groups = [
        { kind: 'success_factor' as const, values: asStrings(row.success_factors) },
        { kind: 'failure_factor' as const, values: asStrings(row.failure_factors) },
      ];
      for (const group of groups) for (const statement of group.values) {
        const normalized = statement.toLocaleLowerCase().replace(/\\s+/g, ' ').trim();
        const key = group.kind + ':' + normalized;
        let aggregate = aggregates.get(key);
        if (!aggregate) {
          aggregate = { kind: group.kind, statement, feedbackIds: new Set(), opportunityIds: new Set(), outcomes: {} };
          aggregates.set(key, aggregate);
        }
        aggregate.feedbackIds.add(row.id);
        aggregate.opportunityIds.add(row.opportunity_id);
        aggregate.outcomes[row.outcome] = (aggregate.outcomes[row.outcome] ?? 0) + 1;
      }
    }

    const candidates = [...aggregates.entries()].filter(([, item]) => item.opportunityIds.size >= 2);
    const created = [];
    for (const [key, item] of candidates) {
      const fingerprint = createHash('sha256').update(key).digest('hex');
      const inserted = await pool.query(
        `INSERT INTO opportunity_learning_insights
         (fingerprint, kind, statement, support_count, opportunity_count, feedback_ids, outcome_counts)
         VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb)
         ON CONFLICT (fingerprint) DO NOTHING RETURNING *`,
        [fingerprint, item.kind, item.statement, item.feedbackIds.size, item.opportunityIds.size,
         JSON.stringify([...item.feedbackIds]), JSON.stringify(item.outcomes)],
      );
      if (inserted.rows[0]) created.push(inserted.rows[0]);
    }
    return { scannedFeedback: result.rows.length, qualifyingPatterns: candidates.length, created };
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

  async review(id: string, status: 'accepted' | 'rejected', reviewedBy?: string) {
    const result = await pool.query(
      `UPDATE opportunity_learning_insights
       SET status=$2, reviewed_at=now(), reviewed_by=$3
       WHERE id=$1 RETURNING *`,
      [id, status, reviewedBy ?? null],
    );
    return result.rows[0] ?? null;
  }
}
