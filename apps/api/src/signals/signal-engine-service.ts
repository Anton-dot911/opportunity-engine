import { SignalRepository } from '@oe/database';
import { extractSignals } from './extract-signals.js';

export class SignalEngineService {
  constructor(private readonly repository = new SignalRepository()) {}

  async processPending(limit = 10) {
    const documents = await this.repository.claimDocuments(limit);
    let signalsCreated = 0;
    let documentsProcessed = 0;
    let failed = 0;

    for (const document of documents) {
      try {
        const extracted = extractSignals(document);
        signalsCreated += await this.repository.saveSignals(document.id, extracted);
        await this.repository.completeDocument(document.id);
        documentsProcessed += 1;
      } catch (error) {
        const reason = error instanceof Error ? error.message : 'SIGNAL_EXTRACTION_FAILED';
        await this.repository.failDocument(document.id, reason);
        failed += 1;
      }
    }

    return { kind: 'success' as const, claimed: documents.length, documentsProcessed, signalsCreated, failed };
  }
}
