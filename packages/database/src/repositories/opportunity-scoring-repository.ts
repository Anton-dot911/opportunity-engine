import { pool } from '../pool.js';

export const SCORE_DIMENSIONS = {
  evidence_strength: 25,
  customer_demand: 20,
  market_potential: 15,
  economic_viability: 20,
  execution_feasibility: 10,
  defensibility: 10,
} as const;

export type ScoreDimension = keyof typeof SCORE_DIMENSIONS;
export type ScoreInput = {
  dimensions: Partial<Record<ScoreDimension, number | null>>;
  rationale: Partial<Record<ScoreDimension, string>>;
  evidenceRefs?: Partial<Record<ScoreDimension, string[]>>;
};

export function calculateOpportunityScore(input: ScoreInput) {
  let weightedTotal = 0;
  let knownWeight = 0;
  for (const [key, weight] of Object.entries(SCORE_DIMENSIONS) as [ScoreDimension, number][]) {
    const value = input.dimensions[key];
    if (value === null || value === undefined) continue;
    weightedTotal += value * weight;
    knownWeight += weight;
  }
  const coveragePercent = knownWeight;
  const weightedScore = knownWeight === 0 ? null : Math.round((weightedTotal / knownWeight) * 20 * 100) / 100;
  const rating = coveragePercent < 60 || weightedScore === null
    ? 'insufficient_data'
    : weightedScore < 40 ? 'low'
    : weightedScore < 60 ? 'moderate'
    : weightedScore < 80 ? 'high' : 'very_high';
  return { weightedScore, coveragePercent, rating };
}

export class OpportunityScoringRepository {
  async create(opportunityId: string, input: ScoreInput) {
    const calculated = calculateOpportunityScore(input);
    const result = await pool.query(
      `INSERT INTO opportunity_scores
       (opportunity_id, version, dimensions, weighted_score, coverage_percent, rating, rationale, evidence_refs)
       SELECT id, 'v1', $2::jsonb, $3, $4, $5, $6::jsonb, $7::jsonb
       FROM opportunities WHERE id = $1
       RETURNING *`,
      [opportunityId, JSON.stringify(input.dimensions), calculated.weightedScore,
       calculated.coveragePercent, calculated.rating, JSON.stringify(input.rationale),
       JSON.stringify(input.evidenceRefs ?? {})],
    );
    return result.rows[0] ?? null;
  }

  async listByOpportunityId(opportunityId: string) {
    const result = await pool.query(
      'SELECT * FROM opportunity_scores WHERE opportunity_id = $1 ORDER BY created_at DESC',
      [opportunityId],
    );
    return result.rows;
  }
}
