export type LearningInsight = {
  id: string;
  kind: 'success_factor' | 'failure_factor';
  statement: string;
  support_count: number;
  opportunity_count: number;
  feedback_ids: string[];
  outcome_counts: Record<string, number>;
  status: 'pending' | 'accepted' | 'rejected';
};

const FACTOR_CATEGORIES: Record<string, string[]> = {
  distribution: ['distribution', 'delivery', 'logistics', 'warehouse', 'retail', 'outlet', 'route'],
  pricing: ['price', 'pricing', 'margin', 'discount', 'cost', 'profit'],
  product: ['product', 'quality', 'assortment', 'packaging', 'brand'],
  customer: ['customer', 'client', 'buyer', 'demand', 'feedback', 'retention'],
  operations: ['process', 'operation', 'capacity', 'staff', 'team', 'execution', 'inventory'],
  marketing: ['marketing', 'promotion', 'advertising', 'campaign', 'awareness'],
  finance: ['finance', 'funding', 'cash', 'payment', 'budget', 'revenue'],
  regulation: ['regulation', 'license', 'compliance', 'tax', 'law', 'permit'],
  technology: ['technology', 'software', 'platform', 'automation', 'system', 'api'],
};

export function classifyLearningFactor(statement: string): string {
  const normalized = statement.toLowerCase();
  for (const [category, terms] of Object.entries(FACTOR_CATEGORIES)) {
    if (terms.some((term) => normalized.includes(term))) return category;
  }
  return 'other';
}

export function calculateLearningEvidenceStrength(supportCount: number, opportunityCount: number) {
  const independentOpportunities = Math.max(0, opportunityCount);
  const support = Math.max(0, supportCount);
  const band = independentOpportunities >= 5 && support >= 5
    ? 'strong'
    : independentOpportunities >= 3 && support >= 3
      ? 'moderate'
      : 'limited';
  return {
    band,
    supportCount: support,
    independentOpportunityCount: independentOpportunities,
    // This is a descriptive heuristic, not a statistical confidence estimate.
    basis: 'recurrence_and_distinct_opportunity_count',
  } as const;
}

function normalize(statement: string): string {
  return statement.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function analyzeLearningInsights(insights: LearningInsight[]) {
  const classified = insights.map((insight) => {
    const counts = insight.outcome_counts ?? {};
    const achieved = counts.achieved ?? 0;
    const partiallyAchieved = counts.partially_achieved ?? 0;
    const notAchieved = counts.not_achieved ?? 0;
    const unknown = counts.unknown ?? 0;
    const total = achieved + partiallyAchieved + notAchieved + unknown;
    const positive = achieved + partiallyAchieved;
    const outcomeProfile = {
      achieved,
      partiallyAchieved,
      notAchieved,
      unknown,
      total,
      positiveRate: total > 0 ? Number((positive / total).toFixed(4)) : null,
    };
    const evidenceStrength = calculateLearningEvidenceStrength(
      insight.support_count,
      insight.opportunity_count,
    );
    return {
      insightId: insight.id,
      kind: insight.kind,
      statement: insight.statement,
      category: classifyLearningFactor(insight.statement),
      status: insight.status,
      outcomeProfile,
      evidenceStrength,
    };
  });

  const byFactor = new Map<string, { success?: LearningInsight; failure?: LearningInsight }>();
  for (const insight of insights) {
    const key = normalize(insight.statement);
    const entry = byFactor.get(key) ?? {};
    if (insight.kind === 'success_factor') entry.success = insight;
    else entry.failure = insight;
    byFactor.set(key, entry);
  }
  const contradictions = [...byFactor.entries()]
    .filter(([, pair]) => pair.success && pair.failure)
    .map(([normalizedFactor, pair]) => ({
      normalizedFactor,
      successInsightId: pair.success!.id,
      failureInsightId: pair.failure!.id,
      successOpportunityCount: pair.success!.opportunity_count,
      failureOpportunityCount: pair.failure!.opportunity_count,
      interpretation: 'same_normalized_factor_recorded_as_both_success_and_failure',
      requiresHumanReview: true,
    }));

  const recommendations = classified.map((item) => {
    const hasContradiction = contradictions.some((entry) =>
      entry.successInsightId === item.insightId || entry.failureInsightId === item.insightId);
    const mixedOutcomes = item.outcomeProfile.positiveRate !== null
      && item.outcomeProfile.positiveRate > 0
      && item.outcomeProfile.positiveRate < 1;
    const action = hasContradiction
      ? 'review_conflicting_feedback'
      : item.evidenceStrength.band === 'limited'
        ? 'collect_more_independent_feedback'
        : mixedOutcomes
          ? 'inspect_outcome_variation'
          : 'retain_as_observed_pattern';
    return {
      insightId: item.insightId,
      action,
      rationale: hasContradiction
        ? 'The same normalized factor appears in both success and failure feedback.'
        : item.evidenceStrength.band === 'limited'
          ? 'The recurrence base is small; gather more feedback from distinct opportunities.'
          : mixedOutcomes
            ? 'Recorded outcomes are mixed; inspect context before drawing conclusions.'
            : 'The recorded pattern is consistent in the available feedback.',
      advisoryOnly: true,
    };
  });

  return {
    generatedFrom: 'opportunity_learning_insights',
    classified,
    contradictions,
    recommendations,
    limitations: [
      'Classification uses deterministic keyword rules and may be incomplete.',
      'Outcome profiles describe recorded feedback and do not establish causation.',
      'Evidence strength is a recurrence heuristic, not statistical confidence.',
      'Recommendations are advisory and require operator review.',
    ],
  };
}
