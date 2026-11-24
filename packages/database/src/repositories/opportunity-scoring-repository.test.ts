import { describe, expect, it } from 'vitest';
import { calculateOpportunityScore } from './opportunity-scoring-repository.js';

describe('calculateOpportunityScore', () => {
  it('returns insufficient data when coverage is below 60 percent', () => {
    const result = calculateOpportunityScore({
      dimensions: { evidence_strength: 4, customer_demand: 3 },
      rationale: {},
    });
    expect(result.coveragePercent).toBe(45);
    expect(result.weightedScore).toBeCloseTo(68.89, 1);
    expect(result.rating).toBe('insufficient_data');
  });

  it('normalizes against only known dimensions and reports full coverage', () => {
    const result = calculateOpportunityScore({
      dimensions: {
        evidence_strength: 5, customer_demand: 4, market_potential: 3,
        economic_viability: 4, execution_feasibility: 3, defensibility: 2,
      },
      rationale: {},
    });
    expect(result.coveragePercent).toBe(100);
    expect(result.weightedScore).toBe(80);
    expect(result.rating).toBe('very_high');
  });

  it('does not turn missing dimensions into zero', () => {
    const result = calculateOpportunityScore({ dimensions: {}, rationale: {} });
    expect(result.weightedScore).toBeNull();
    expect(result.coveragePercent).toBe(0);
    expect(result.rating).toBe('insufficient_data');
  });
});
