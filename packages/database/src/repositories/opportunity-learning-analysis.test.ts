import { describe, expect, it } from 'vitest';
import {
  analyzeLearningInsights,
  calculateLearningEvidenceStrength,
  classifyLearningFactor,
} from './opportunity-learning-analysis.js';

describe('classifyLearningFactor', () => {
  it('classifies known keyword groups and falls back to other', () => {
    expect(classifyLearningFactor('Improved warehouse delivery')).toBe('distribution');
    expect(classifyLearningFactor('Customer retention improved')).toBe('customer');
    expect(classifyLearningFactor('Unmapped observation')).toBe('other');
  });
});

describe('calculateLearningEvidenceStrength', () => {
  it('uses recurrence and distinct opportunities without claiming statistical confidence', () => {
    expect(calculateLearningEvidenceStrength(5, 5)).toMatchObject({
      band: 'strong',
      supportCount: 5,
      independentOpportunityCount: 5,
      basis: 'recurrence_and_distinct_opportunity_count',
    });
    expect(calculateLearningEvidenceStrength(2, 2).band).toBe('limited');
  });
});

describe('analyzeLearningInsights', () => {
  it('reports outcome profile, contradictions, and reviewable recommendations', () => {
    const result = analyzeLearningInsights([
      {
        id: 'success-1', kind: 'success_factor', statement: 'Strong distribution',
        support_count: 4, opportunity_count: 3, feedback_ids: ['f1','f2','f3','f4'],
        outcome_counts: { achieved: 2, partially_achieved: 1, not_achieved: 1 }, status: 'pending',
      },
      {
        id: 'failure-1', kind: 'failure_factor', statement: ' strong  distribution ',
        support_count: 3, opportunity_count: 2, feedback_ids: ['f5','f6','f7'],
        outcome_counts: { not_achieved: 3 }, status: 'accepted',
      },
    ]);
    expect(result.classified[0]).toMatchObject({
      category: 'distribution',
      outcomeProfile: { total: 4, positiveRate: 0.75 },
      evidenceStrength: { band: 'moderate' },
    });
    expect(result.contradictions).toHaveLength(1);
    expect(result.contradictions[0]?.requiresHumanReview).toBe(true);
    expect(result.recommendations[0]).toMatchObject({
      insightId: 'success-1',
      action: 'review_conflicting_feedback',
      advisoryOnly: true,
    });
    expect(result.limitations.join(' ')).toContain('do not establish causation');
  });

  it('returns null positive rate when outcome counts are empty', () => {
    const result = analyzeLearningInsights([{
      id: 'i1', kind: 'success_factor', statement: 'New factor',
      support_count: 2, opportunity_count: 2, feedback_ids: [],
      outcome_counts: {}, status: 'pending',
    }]);
    expect(result.classified[0]?.outcomeProfile.positiveRate).toBeNull();
  });
});
