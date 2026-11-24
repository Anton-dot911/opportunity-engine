import { pool } from '../pool.js';

export type FeedbackInput = {
  opportunityId: string;
  validationId?: string | null;
  outcome: 'achieved' | 'partially_achieved' | 'not_achieved' | 'unknown';
  actualMetrics?: unknown[];
  successFactors?: unknown[];
  failureFactors?: unknown[];
  findings?: string | null;
  evidence?: unknown[];
  recordedBy?: string | null;
  occurredAt?: string | null;
};

export class OpportunityFeedbackRepository {
  async create(input: FeedbackInput) {
    const result = await pool.query(
      `INSERT INTO opportunity_feedback
       (opportunity_id, validation_id, outcome, actual_metrics, success_factors,
        failure_factors, findings, evidence, recorded_by, occurred_at)
       SELECT o.id, v.id, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7, $8::jsonb, $9, $10
       FROM opportunities o
       LEFT JOIN opportunity_validations v
         ON v.id = $2::uuid AND v.opportunity_id = o.id
       WHERE o.id = $1 AND ($2::uuid IS NULL OR v.id IS NOT NULL)
       RETURNING *`,
      [input.opportunityId, input.validationId ?? null, input.outcome,
       JSON.stringify(input.actualMetrics ?? []), JSON.stringify(input.successFactors ?? []),
       JSON.stringify(input.failureFactors ?? []), input.findings ?? null,
       JSON.stringify(input.evidence ?? []), input.recordedBy ?? null, input.occurredAt ?? null],
    );
    return result.rows[0] ?? null;
  }

  async listByOpportunityId(opportunityId: string) {
    const result = await pool.query(
      'SELECT * FROM opportunity_feedback WHERE opportunity_id = $1 ORDER BY created_at DESC, id DESC',
      [opportunityId],
    );
    return result.rows;
  }
}
