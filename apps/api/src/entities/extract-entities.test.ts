import { describe, expect, it } from 'vitest';
import { extractEntities } from './extract-entities.js';

describe('extractEntities', () => {
  it('extracts organization mentions with evidence and deterministic deduplication', () => {
    const doc = { id: 'doc-entity-1', content: 'Acme Holdings LLC acquired Beta Systems Inc. after several months of negotiations and regulatory review.' };
    const result = extractEntities(doc);
    expect(result.entities.length).toBe(2);
    expect(result.entities.every(item => item.evidenceExcerpt.includes('acquired') && item.dedupKey.length === 64)).toBe(true);
    expect(extractEntities(doc)).toEqual(result);
  });

  it('extracts only explicitly expressed relationships between recognized organizations', () => {
    const doc = { id: 'doc-entity-2', content: 'Northwind LLC partnered with Contoso Ltd. to expand its regional distribution network.' };
    const result = extractEntities(doc);
    expect(result.relationships).toHaveLength(1);
    expect(result.relationships[0]?.predicate).toBe('partnered_with');
  });

  it('does not infer relationships from co-occurrence alone', () => {
    const doc = { id: 'doc-entity-3', content: 'Acme LLC and Beta Inc. operate in the same market and compete for enterprise customers.' };
    expect(extractEntities(doc).relationships).toHaveLength(0);
  });
});
