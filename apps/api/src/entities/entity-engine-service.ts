import { EntityRepository } from '@oe/database';
import { extractEntities } from './extract-entities.js';

export class EntityEngineService {
  constructor(private readonly repository = new EntityRepository()) {}

  async processPending(limit = 10) {
    const documents = await this.repository.claimDocuments(limit);
    let entitiesCreated = 0;
    let mentionsCreated = 0;
    let relationshipsCreated = 0;
    let documentsProcessed = 0;
    let failed = 0;
    for (const document of documents) {
      try {
        const extraction = extractEntities(document);
        const saved = await this.repository.saveExtraction(document.id, extraction);
        entitiesCreated += saved.entitiesCreated;
        mentionsCreated += saved.mentionsCreated;
        relationshipsCreated += saved.relationshipsCreated;
        await this.repository.completeDocument(document.id);
        documentsProcessed += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'ENTITY_EXTRACTION_FAILED';
        await this.repository.failDocument(document.id, reason);
        failed += 1;
      }
    }
    return { kind: 'success' as const, claimed: documents.length, documentsProcessed, entitiesCreated, mentionsCreated, relationshipsCreated, failed };
  }
}
