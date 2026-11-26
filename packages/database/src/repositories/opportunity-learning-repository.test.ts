import { describe, expect, it } from 'vitest';
import { aggregateLearningFactors, normalizeLearningFactor } from './opportunity-learning-repository.js';

describe('normalizeLearningFactor', () => {
  it('normalizes case, leading/trailing whitespace, tabs and newlines', () => {
    expect(normalizeLearningFactor('  Strong\t distribution\nNETWORK  '))
      .toBe('strong distribution network');
  });
});

describe('aggregateLearningFactors', () => {
  it('groups equivalent factors across distinct opportunities', () => {
    const result = aggregateLearningFactors([
      { id: 'f1', opportunity_id: 'o1', outcome: 'achieved', success_factors: ['Strong  distribution'], failure_factors: [] },
      { id: 'f2', opportunity_id: 'o2', outcome: 'partially_achieved', success_factors: [' strong distribution '], failure_factors: [] },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      key: 'success_factor:strong distribution',
      supportCount: undefined,
      kind: 'success_factor',
      opportunityIds: new Set(['o1', 'o2']),
      feedbackIds: new Set(['f1', 'f2']),
      outcomes: { achieved: 1, partially_achieved: 1 },
    });
  });

  it('requires two distinct opportunities and counts a factor once per feedback record', () => {
    const result = aggregateLearningFactors([
      { id: 'f1', opportunity_id: 'o1', outcome: 'achieved', success_factors: ['Repeat', ' repeat '], failure_factors: [] },
      { id: 'f2', opportunity_id: 'o1', outcome: 'achieved', success_factors: ['REPEAT'], failure_factors: [] },
    ]);
    expect(result).toHaveLength(0);
  });

  it('keeps success and failure factors separate', () => {
    const result = aggregateLearningFactors([
      { id: 'f1', opportunity_id: 'o1', outcome: 'achieved', success_factors: ['Fast delivery'], failure_factors: [] },
      { id: 'f2', opportunity_id: 'o2', outcome: 'not_achieved', success_factors: [], failure_factors: ['fast delivery'] },
    ]);
    expect(result).toHaveLength(0);
  });
});
