import { createHash } from 'node:crypto';

export type EntityCandidate = {
  name: string;
  normalizedName: string;
  evidenceExcerpt: string;
  confidence: number;
  dedupKey: string;
};
export type RelationshipCandidate = {
  subjectName: string;
  objectName: string;
  predicate: 'acquired' | 'partnered_with' | 'launched';
  evidenceExcerpt: string;
  confidence: number;
  dedupKey: string;
};
export type EntityExtraction = { entities: EntityCandidate[]; relationships: RelationshipCandidate[] };

const ORG_SUFFIX = '(?:LLC|L\\.?L\\.?C\\.?|Inc\\.?|Incorporated|Ltd\\.?|Limited|GmbH|AG|PLC|Corp\\.?|Corporation|ТОВ|ПП|АТ|ПрАТ|ФОП)';
const ORG_PATTERN = new RegExp('\\b([\\p{L}\\p{N}][\\p{L}\\p{N}&.,’\\'-]*(?:\\s+[\\p{L}\\p{N}][\\p{L}\\p{N}&.,’\\'-]*){0,5}\\s+' + ORG_SUFFIX + ')\\b', 'giu');

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}
function splitSentences(value: string): string[] {
  return value.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 25 && s.length <= 1000);
}

export function extractEntities(document: { id: string; content: string }): EntityExtraction {
  const entities = new Map<string, EntityCandidate>();
  const relationships = new Map<string, RelationshipCandidate>();
  for (const sentence of splitSentences(document.content.slice(0, 100_000))) {
    const matches = [...sentence.matchAll(new RegExp(ORG_PATTERN.source, ORG_PATTERN.flags))];
    const local = matches.map(match => match[1]?.trim()).filter((name): name is string => Boolean(name));
    for (const name of local) {
      const normalizedName = normalize(name);
      if (normalizedName.length < 2) continue;
      const dedupKey = hash(document.id + '|organization|' + normalizedName + '|' + normalize(sentence));
      entities.set(dedupKey, { name, normalizedName, evidenceExcerpt: sentence.slice(0, 700), confidence: 0.82, dedupKey });
    }
    if (local.length < 2) continue;
    const relationRules: Array<{ pattern: RegExp; predicate: RelationshipCandidate['predicate'] }> = [
      { pattern: /\b(?:acquired|bought|purchased)\b|придбал[аио]?|купил[аио]?/iu, predicate: 'acquired' },
      { pattern: /\bpartnered with\b|\bpartnership with\b|уклал[аио]? партнерств[оа] з|співпрацює з/iu, predicate: 'partnered_with' },
      { pattern: /\b(?:launched|introduced)\b|запустил[аио]?|представил[аио]?/iu, predicate: 'launched' },
    ];
    for (const rule of relationRules) {
      if (!rule.pattern.test(sentence)) continue;
      const subjectName = local[0];
      const objectName = local[1];
      if (!subjectName || !objectName || normalize(subjectName) === normalize(objectName)) continue;
      const dedupKey = hash(document.id + '|' + rule.predicate + '|' + normalize(subjectName) + '|' + normalize(objectName) + '|' + normalize(sentence));
      relationships.set(dedupKey, { subjectName, objectName, predicate: rule.predicate, evidenceExcerpt: sentence.slice(0, 700), confidence: 0.68, dedupKey });
      break;
    }
  }
  return { entities: [...entities.values()], relationships: [...relationships.values()] };
}
