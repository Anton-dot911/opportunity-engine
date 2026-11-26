import { pool } from '../pool.js';

export class OpportunityResearchLoopRepository {
  async loadInput(opportunityId: string) {
    const opportunity = await pool.query(
      `SELECT id, title, problem, target_segment, value_capture_mechanism,
              proposed_solution, evidence, assumptions, unknowns, economics, risks
       FROM opportunities WHERE id=$1`,
      [opportunityId],
    );
    if (!opportunity.rows[0]) return null;
    const research = await pool.query(
      'SELECT * FROM opportunity_research WHERE opportunity_id=$1',
      [opportunityId],
    );
    const learning = await pool.query(
      `SELECT id, kind, statement, support_count, opportunity_count, outcome_counts
       FROM opportunity_learning_insights
       WHERE status='accepted'
       ORDER BY opportunity_count DESC, support_count DESC, id ASC
       LIMIT 50`,
    );
    const evidence = opportunity.rows[0].evidence as { signals?: Array<Record<string, unknown>> } | null;
    const signals = Array.isArray(evidence?.signals) ? evidence.signals : [];
    const evidenceRecords = signals.map((signal) => ({
      id: String(signal.signal_id ?? ''),
      summary: String(signal.summary ?? ''),
      documentId: signal.document_id ?? null,
      contribution: signal.contribution ?? null,
    })).filter((item) => item.id);
    return {
      opportunity: opportunity.rows[0],
      research: research.rows[0] ?? null,
      acceptedLearningInsights: learning.rows,
      evidenceRecords,
    };
  }

  async saveRun(input: {
    opportunityId: string;
    researchId: string;
    runId: string;
    iteration: number;
    inputSnapshot: unknown;
    outputSnapshot: unknown;
    nextAction: string;
    questions: unknown[];
    findings: unknown[];
    evidence: unknown[];
    unknowns: unknown[];
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const run = await client.query(
        `INSERT INTO opportunity_research_runs
         (opportunity_id,research_id,ai_run_id,status,iteration,input_snapshot,output_snapshot,next_action)
         VALUES ($1,$2,$3,'succeeded',$4,$5::jsonb,$6::jsonb,$7) RETURNING *`,
        [input.opportunityId,input.researchId,input.runId,input.iteration,
         JSON.stringify(input.inputSnapshot),JSON.stringify(input.outputSnapshot),input.nextAction],
      );
      const updated = await client.query(
        `UPDATE opportunity_research SET status='in_progress',
          questions=$2::jsonb, findings=$3::jsonb, evidence=$4::jsonb,
          unknowns=$5::jsonb, updated_at=now()
         WHERE id=$1 RETURNING *`,
        [input.researchId,JSON.stringify(input.questions),JSON.stringify(input.findings),
         JSON.stringify(input.evidence),JSON.stringify(input.unknowns)],
      );
      await client.query('COMMIT');
      return { run: run.rows[0], research: updated.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveFailedRun(input: {
    opportunityId: string; researchId: string; iteration: number;
    inputSnapshot: unknown; errorCode: string;
  }) {
    const result = await pool.query(
      `INSERT INTO opportunity_research_runs
       (opportunity_id,research_id,status,iteration,input_snapshot,error_code)
       VALUES ($1,$2,'failed',$3,$4::jsonb,$5) RETURNING *`,
      [input.opportunityId,input.researchId,input.iteration,JSON.stringify(input.inputSnapshot),input.errorCode],
    );
    return result.rows[0];
  }

  async recordExecution(input: {
    runId: string; taskType: string; provider: string; model: string;
    promptId: string; promptVersion: string; status: 'succeeded'|'failed';
    inputTokens: number|null; outputTokens: number|null; estimatedCostUsd: number|null;
    durationMs: number; attempts: number; errorCode?: string;
  }) {
    const result = await pool.query(
      `INSERT INTO ai_execution_logs
       (run_id,task_type,provider,model,prompt_id,prompt_version,status,input_tokens,
        output_tokens,estimated_cost_usd,duration_ms,attempts,error_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
      [input.runId,input.taskType,input.provider,input.model,input.promptId,input.promptVersion,
       input.status,input.inputTokens,input.outputTokens,input.estimatedCostUsd,input.durationMs,
       input.attempts,input.errorCode??null],
    );
    return result.rows[0];
  }

  async countRuns(opportunityId: string) {
    const result = await pool.query(
      'SELECT count(*)::integer AS count FROM opportunity_research_runs WHERE opportunity_id=$1',
      [opportunityId],
    );
    return result.rows[0]?.count ?? 0;
  }
}
