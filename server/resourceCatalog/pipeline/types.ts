import type { CurriculumTopicCandidate } from "../curriculumMapper";
import type { ExistingBookForDedupe } from "../duplicateDetector";
import type { BookType, ClassificationMethod, DifficultyLabel, ExamScope, SyncStatus } from "../types";

export type PublisherRow = { id: number; name: string; slug: string; normalizedName: string };

export type ExternalSourceRow = {
  id: number;
  source: string;
  sourceProductId: string;
  matchedBookId: number | null;
  syncStatus: SyncStatus;
};

export type CatalogBookRow = ExistingBookForDedupe & {
  slug: string;
  bookType: BookType;
  examScope: ExamScope;
  subject: string | null;
  imageUrl: string | null;
  description: string | null;
  active: boolean;
  manualOverride: boolean;
  difficultyLabel: DifficultyLabel;
  difficultyScore: number;
  difficultyConfidence: number;
  classificationMethod: ClassificationMethod;
};

export type UpsertCatalogBookInput = {
  publisherId: number | null;
  name: string;
  slug: string;
  isbn: string | null;
  editionYear: number | null;
  description: string | null;
  imageUrl: string | null;
  bookType: BookType;
  examScope: ExamScope;
  subject: string | null;
  metadata: Record<string, unknown> | null;
};

export type DifficultyPatch = {
  difficultyScore: number;
  difficultyLabel: DifficultyLabel;
  difficultyConfidence: number;
  classificationMethod: ClassificationMethod;
  needsReview: boolean;
  classifiedAt: Date;
};

/**
 * Everything the import pipeline needs from persistence, expressed as a
 * narrow port so `ResourceCatalogImportPipeline` can be unit-tested with an
 * in-memory fake and never needs a live MySQL connection in CI. The real
 * implementation is `server/resourceCatalog/catalogDb.ts`.
 */
export type CatalogDbPort = {
  findPublisherByNormalizedName(normalizedName: string): Promise<PublisherRow | null>;
  createPublisher(input: { name: string; slug: string; normalizedName: string }): Promise<PublisherRow>;

  findExternalSource(source: string, sourceProductId: string): Promise<ExternalSourceRow | null>;
  upsertExternalSource(row: {
    source: string;
    sourceProductId: string;
    sourceUrl: string | null;
    rawName: string;
    rawDescription: string | null;
    rawPrice: number | null;
    rawCurrency: string | null;
    rawImageUrl: string | null;
    rawPublisher: string | null;
    rawCategory: string | null;
    rawIsbn: string | null;
    rawMetadata: Record<string, unknown> | null;
  }): Promise<ExternalSourceRow>;
  markExternalSourceOutcome(id: number, patch: { matchedBookId: number | null; syncStatus: SyncStatus; errorMessage?: string | null }): Promise<void>;

  findCatalogBookByIsbn(isbn: string): Promise<CatalogBookRow | null>;
  listCatalogBooksByPublisher(publisherId: number): Promise<ExistingBookForDedupe[]>;
  getCatalogBookById(id: number): Promise<CatalogBookRow | null>;
  createCatalogBook(input: UpsertCatalogBookInput): Promise<CatalogBookRow>;
  updateCatalogBook(id: number, patch: Partial<UpsertCatalogBookInput>): Promise<CatalogBookRow>;
  updateCatalogBookDifficulty(id: number, patch: DifficultyPatch): Promise<void>;

  upsertBookOffer(input: { bookId: number; source: string; price: number | null; currency: string; productUrl: string | null }): Promise<void>;

  listCurriculumTopics(): Promise<CurriculumTopicCandidate[]>;
  upsertBookCurriculumMapping(input: { bookId: number; topicId: number; confidence: number; reason: string }): Promise<void>;

  createSyncLog(input: { source: string; startedAt: Date; dryRun: boolean; triggeredBy: number | null }): Promise<{ id: number }>;
  finishSyncLog(
    id: number,
    patch: { finishedAt: Date; fetched: number; created: number; updated: number; skipped: number; failed: number; needsReview: number; statsJson: string; errorLog: string | null }
  ): Promise<void>;
};
