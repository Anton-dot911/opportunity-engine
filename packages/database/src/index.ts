export { pool } from './pool.js';
export { SourceRepository } from './repositories/source-repository.js';
export { IngestionRepository } from './repositories/ingestion-repository.js';
export { DocumentProcessingRepository } from './repositories/document-processing-repository.js';
export { SignalRepository } from './repositories/signal-repository.js';
export type { SignalSourceDocument, ExtractedSignal } from './repositories/signal-repository.js';
export type { PendingDocument } from './repositories/document-processing-repository.js';
export type { SourceRecord, SourceType } from './repositories/source-repository.js';
export { EntityRepository } from './repositories/entity-repository.js';

export { HypothesisRepository } from './repositories/hypothesis-repository.js';
export { ContextRepository } from './repositories/context-repository.js';
export type { ContextItemInput } from './repositories/context-repository.js';
export { ContextPackageRepository } from './repositories/context-package-repository.js';
export type { ContextPackageInput } from './repositories/context-package-repository.js';

export { OpportunityRepository } from './repositories/opportunity-repository.js';
