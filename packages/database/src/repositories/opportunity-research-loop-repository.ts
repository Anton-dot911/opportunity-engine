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

  async claimRun(input: {
    opportunityId: string; researchId: string; runId: string;
    maxIterations: number; inputSnapshot: unknown;
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [input.opportunityId]);
      const running = await client.query(
        "SELECT id FROM opportunity_research_runs WHERE opportunity_id=$1 AND status='running' LIMIT 1",
        [input.opportunityId],
      );
      if (running.rows[0]) {
        await client.query('ROLLBACK');
        return { error: 'RESEARCH_CYCLE_ALREADY_RUNNING' as const };
      }
      const count = await client.query(
        'SELECT count(*)::integer AS count FROM opportunity_research_runs WHERE opportunity_id=$1',
        [input.opportunityId],
      );
      const iteration = Number(count.rows[0]?.count ?? 0) + 1;
      if (iteration > input.maxIterations) {
        await client.query('ROLLBACK');
        return { error: 'RESEARCH_ITERATION_LIMIT_REACHED' as const };
      }
      const run = await client.query(
        `INSERT INTO opportunity_research_runs
         (opportunity_id,research_id,ai_run_id,status,iteration,input_snapshot)
         VALUES ($1,$2,$3,'running',$4,$5::jsonb) RETURNING *`,
        [input.opportunityId,input.researchId,input.runId,iteration,JSON.stringify(input.inputSnapshot)],
      );
      await client.query('COMMIT');
      return { run: run.rows[0], iteration };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async saveRun(input: {
    runId: string; outputSnapshot: unknown; nextAction: string;
    researchId: string; questions: unknown[]; findings: unknown[];
    evidence: unknown[]; unknowns: unknown[];
  }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const run = await client.query(
        `UPDATE opportunity_research_runs
         SET status='succeeded', output_snapshot=$2::jsonb, next_action=$3
         WHERE ai_run_id=$1 AND status='running' RETURNING *`,
        [input.runId,JSON.stringify(input.outputSnapshot),input.nextAction],
      );
      if (!run.rows[0]) throw new Error('RESEARCH_RUN_NOT_FOUND');
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

  async saveFailedRun(input: { runId: string; errorCode: string }) {
    const result = await pool.query(
      `UPDATE opportunity_research_runs SET status='failed', error_code=$2
       WHERE ai_run_id=$1 AND status='running' RETURNING *`,
      [input.runId,input.errorCode],
    );
    return result.rows[0] ?? null;
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
