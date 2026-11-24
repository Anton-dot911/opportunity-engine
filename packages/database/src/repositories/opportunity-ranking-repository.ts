import { pool } from '../pool.js';

export type RankingOptions = {
  status?: string | undefined;
  limit?: number;
  minimumCoverage?: number;
};

export class OpportunityRankingRepository {
  async list(options: RankingOptions = {}) {
    const limit = Math.max(1, Math.min(200, Math.floor(options.limit ?? 100)));
    const minimumCoverage = Math.max(0, Math.min(100, options.minimumCoverage ?? 60));
    const result = await pool.query(
      `WITH latest_scores AS (
         SELECT DISTINCT ON (opportunity_id)
           opportunity_id, id AS score_id, weighted_score, coverage_percent, rating,
           dimensions, rationale, evidence_refs, created_at AS scored_at
         FROM opportunity_scores
         ORDER BY opportunity_id, created_at DESC, id DESC
       )
       SELECT
         o.*,
         ls.score_id,
         ls.weighted_score,
         ls.coverage_percent,
         ls.rating AS score_rating,
         ls.dimensions AS score_dimensions,
         ls.rationale AS score_rationale,
         ls.evidence_refs AS score_evidence_refs,
         ls.scored_at,
         (ls.weighted_score IS NOT NULL AND ls.coverage_percent >= $2
           AND ls.rating <> 'insufficient_data') AS rankable
       FROM opportunities o
       LEFT JOIN latest_scores ls ON ls.opportunity_id = o.id
       WHERE ($1::text IS NULL OR o.status = $1)
       ORDER BY
         CASE WHEN ls.weighted_score IS NOT NULL
                   AND ls.coverage_percent >= $2
                   AND ls.rating <> 'insufficient_data' THEN 0 ELSE 1 END,
         ls.weighted_score DESC NULLS LAST,
         ls.coverage_percent DESC NULLS LAST,
         o.updated_at DESC,
         o.id ASC
       LIMIT $3`,
      [options.status ?? null, minimumCoverage, limit],
    );
    return {
      items: result.rows,
      criteria: {
        sort: 'latest score descending; coverage descending; updated_at descending',
        minimumCoverage,
        limit,
      },
      note: 'Advisory ordering only. Ranking does not approve, reject, or change opportunity status.',
    };
  }
}
