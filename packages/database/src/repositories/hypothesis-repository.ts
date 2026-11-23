import { createHash } from 'node:crypto';
import { pool } from '../pool.js';

type SignalRow = {
  id: string;
  signal_type: string;
  summary: string;
  confidence: string | null;
  document_id: string;
  entity_id: string;
  entity_name: string;
};

type Candidate = {
  key: string;
  category: string;
  entityId: string;
  entityName: string;
  title: string;
  statement: string;
  mechanism: string;
  assumptions: string[];
  falsificationCriteria: string;
  confidence: number;
  signalIds: string[];
};

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

function buildCandidate(entityId: string, entityName: string, category: string, rows: SignalRow[]): Candidate | null {
  const documents = new Set(rows.map(row => row.document_id));
  if (documents.size < 2) return null;

  const label = LABELS[category] ?? category.replace(/_/g, ' ');
  const signalIds = [...new Set(rows.map(row => row.id))];
  const key = createHash('sha256')
    .update('hypothesis-v2|' + entityId + '|' + category)
    .digest('hex');
  const avg = rows.reduce((sum, row) => sum + (row.confidence === null ? 0.5 : Number(row.confidence)), 0) / rows.length;

  return {
    key,
    category,
    entityId,
    entityName,
    title: `${entityName}: repeated ${label} signals require investigation`,
    statement: `At least ${documents.size} distinct source documents mention ${entityName} in connection with repeated ${label} signals. This association is a research lead, not proof that the organization caused the pattern or that a business opportunity exists.`,
    mechanism: `Investigate whether the observed ${label} pattern affects ${entityName}, its customers, suppliers, or competitors, and whether a reachable segment has an unmet need with a viable value-capture mechanism.`,
    assumptions: [
      'The entity mentions refer to the same real-world organization.',
      'The source documents provide sufficiently independent observations.',
      'The repeated signal is materially relevant to the named organization or its market.',
      'A reachable customer segment experiences a problem for which a viable solution can capture value.',
    ],
    falsificationCriteria: 'Downgrade or reject if entity resolution is incorrect, sources are not independent, the organization is only incidental to the reports, affected customers do not confirm the problem, or no viable value-capture mechanism can be demonstrated.',
    confidence: Math.min(0.6, Math.max(0.2, avg * 0.6)),
    signalIds,
  };
}

export class HypothesisRepository {
  async generate(limit = 200): Promise<{
    signalsConsidered: number;
    entityGroupsConsidered: number;
    candidatesGenerated: number;
    evidenceLinked: number;
    entityLinksCreated: number;
  }> {
    const result = await pool.query(
      `SELECT s.id, s.signal_type, s.summary, s.confidence, s.document_id,
              e.id AS entity_id, e.canonical_name AS entity_name
       FROM signals s
       INNER JOIN entity_mentions em ON em.document_id = s.document_id
       INNER JOIN entities e ON e.id = em.entity_id
       WHERE s.review_status IN ('pending', 'accepted')
         AND em.review_status IN ('pending', 'accepted')
       ORDER BY s.created_at DESC
       LIMIT $1`,
      [Math.max(1, Math.min(1000, Math.floor(limit)))],
    );

    const rows = result.rows as SignalRow[];
    const groups = new Map<string, SignalRow[]>();
    for (const row of rows) {
      const groupKey = row.entity_id + '|' + row.signal_type;
      const group = groups.get(groupKey) ?? [];
      group.push(row);
      groups.set(groupKey, group);
    }

    let candidatesGenerated = 0;
    let evidenceLinked = 0;
    let entityLinksCreated = 0;

    for (const group of groups.values()) {
      const first = group[0];
      if (!first) continue;
      const candidate = buildCandidate(first.entity_id, first.entity_name, first.signal_type, group);
      if (!candidate) continue;

      const upsert = await pool.query(
        `INSERT INTO hypotheses (hypothesis_key, category, title, statement, mechanism, assumptions, falsification_criteria, confidence, generation_method)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'entity-signal-cluster-v2')
         ON CONFLICT (hypothesis_key) DO UPDATE SET
           title = EXCLUDED.title, statement = EXCLUDED.statement, mechanism = EXCLUDED.mechanism,
           assumptions = EXCLUDED.assumptions, falsification_criteria = EXCLUDED.falsification_criteria,
           confidence = EXCLUDED.confidence, updated_at = now()
         RETURNING id`,
        [candidate.key, candidate.category, candidate.title, candidate.statement, candidate.mechanism,
          JSON.stringify(candidate.assumptions), candidate.falsificationCriteria, candidate.confidence],
      );

      const hypothesisId = (upsert.rows[0] as { id: string }).id;
      candidatesGenerated += 1;

      const entityLink = await pool.query(
        `INSERT INTO hypothesis_entities (hypothesis_id, entity_id, role)
         VALUES ($1, $2, 'subject') ON CONFLICT DO NOTHING RETURNING entity_id`,
        [hypothesisId, candidate.entityId],
      );
      entityLinksCreated += entityLink.rowCount ?? 0;

      for (const signalId of candidate.signalIds) {
        const linked = await pool.query(
          `INSERT INTO hypothesis_evidence (hypothesis_id, signal_id)
           VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING signal_id`,
          [hypothesisId, signalId],
        );
        evidenceLinked += linked.rowCount ?? 0;
      }
    }

    return {
      signalsConsidered: rows.length,
      entityGroupsConsidered: groups.size,
      candidatesGenerated,
      evidenceLinked,
      entityLinksCreated,
    };
  }
}
