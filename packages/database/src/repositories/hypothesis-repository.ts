import { createHash } from 'node:crypto';
import { pool } from '../pool.js';

type SignalRow = { id: string; signal_type: string; summary: string; confidence: string | null; document_id: string };
type Candidate = { key: string; category: string; title: string; statement: string; mechanism: string; assumptions: string[]; falsificationCriteria: string; confidence: number; signalIds: string[] };

const LABELS: Record<string, string> = {
  price: 'pricing pressure or pricing opportunity',
  regulation: 'regulatory change',
  technology: 'technology adoption or disruption',
  supply: 'supply-chain pressure',
  demand: 'demand shift',
  inefficiency: 'operational inefficiency',
  complaint: 'customer pain or dissatisfaction',
  trend: 'emerging trend',
  event: 'market event',
  market_change: 'market change',
  other: 'market signal',
};

function buildCandidate(category: string, rows: SignalRow[]): Candidate | null {
  const documents = new Set(rows.map(row => row.document_id));
  if (documents.size < 2) return null;
  const label = LABELS[category] ?? category.replace(/_/g, ' ');
  const signalIds = [...new Set(rows.map(row => row.id))];
  const key = createHash('sha256').update('hypothesis-v1|' + category).digest('hex');
  const avg = rows.reduce((sum, row) => sum + (row.confidence === null ? 0.5 : Number(row.confidence)), 0) / rows.length;
  const confidence = Math.min(0.55, Math.max(0.2, avg * 0.65));
  return {
    key, category,
    title: `Repeated ${label} signals may indicate an actionable market pattern`,
    statement: `Across ${documents.size} distinct source documents, repeated ${label} signals suggest a potentially actionable pattern. This is a research hypothesis, not a confirmed market fact.`,
    mechanism: `If the pattern is real, it may create value through identifying an unmet need, reducing friction, improving availability, or enabling a better-priced alternative. The specific mechanism must be verified.`,
    assumptions: ['Signals are independent enough to represent more than one observation.', 'The pattern is relevant to a reachable customer segment.', 'A solution can capture value without unacceptable cost or risk.'],
    falsificationCriteria: 'Reject or downgrade if independent sources fail to corroborate the pattern, affected customers do not confirm the problem, or a viable value-capture mechanism cannot be demonstrated.',
    confidence, signalIds,
  };
}

export class HypothesisRepository {
  async generate(limit = 200): Promise<{ signalsConsidered: number; candidatesGenerated: number; evidenceLinked: number }> {
    const result = await pool.query(
      `SELECT id, signal_type, summary, confidence, document_id
       FROM signals WHERE review_status IN ('pending', 'accepted')
       ORDER BY created_at DESC LIMIT $1`,
      [Math.max(1, Math.min(1000, Math.floor(limit)))],
    );
    const rows = result.rows as SignalRow[];
    const groups = new Map<string, SignalRow[]>();
    for (const row of rows) {
      const group = groups.get(row.signal_type) ?? [];
      group.push(row);
      groups.set(row.signal_type, group);
    }
    let candidatesGenerated = 0;
    let evidenceLinked = 0;
    for (const [category, group] of groups) {
      const candidate = buildCandidate(category, group);
      if (!candidate) continue;
      const upsert = await pool.query(
        `INSERT INTO hypotheses (hypothesis_key, category, title, statement, mechanism, assumptions, falsification_criteria, confidence, generation_method)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'signal-cluster-v1')
         ON CONFLICT (hypothesis_key) DO UPDATE SET
           title = EXCLUDED.title, statement = EXCLUDED.statement, mechanism = EXCLUDED.mechanism,
           assumptions = EXCLUDED.assumptions, falsification_criteria = EXCLUDED.falsification_criteria,
           confidence = EXCLUDED.confidence, updated_at = now()
         RETURNING id`,
        [candidate.key, candidate.category, candidate.title, candidate.statement, candidate.mechanism, JSON.stringify(candidate.assumptions), candidate.falsificationCriteria, candidate.confidence],
      );
      const hypothesisId = (upsert.rows[0] as { id: string }).id;
      candidatesGenerated += 1;
      for (const signalId of candidate.signalIds) {
        const linked = await pool.query(
          `INSERT INTO hypothesis_evidence (hypothesis_id, signal_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING signal_id`,
          [hypothesisId, signalId],
        );
        evidenceLinked += linked.rowCount ?? 0;
      }
    }
    return { signalsConsidered: rows.length, candidatesGenerated, evidenceLinked };
  }
}
