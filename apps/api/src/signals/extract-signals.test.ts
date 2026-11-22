import { describe, expect, it } from 'vitest';
import { extractSignals } from './extract-signals.js';

describe('extractSignals', () => {
  it('extracts deterministic signals with evidence sentence and dedup key', () => {
    const doc = {
      id: 'doc-1', title: 'Market update', content: 'A sufficiently long opening sentence without a matching keyword. The market demand for this new product is growing rapidly among consumers and retailers. Another sufficiently long sentence describing unrelated context.',
      published_at: '2026-11-21T10:00:00Z',
    };
    const signals = extractSignals(doc);
    expect(signals.some(signal => signal.signalType === 'demand')).toBe(true);
    expect(signals.every(signal => signal.summary.length >= 35 && signal.dedupKey.length === 64)).toBe(true);
    expect(extractSignals(doc)).toEqual(signals);
  });

  it('returns no signals for unrelated short content', () => {
    expect(extractSignals({ id: 'empty', title: null, content: 'No relevant information.', published_at: null })).toEqual([]);
  });
});
