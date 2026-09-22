export type BookType =
  | "question_bank"
  | "topic_explanation"
  | "topic_explanation_question_bank"
  | "mock_exam"
  | "fasikul"
  | "past_questions"
  | "camp"
  | "test_book"
  | "reference"
  | "other";

export type ExamScope = "TYT" | "AYT" | "TYT_AYT" | "YKS" | "GENEL";
export type DifficultyLabel = "easy" | "medium" | "hard";
export type ClassificationMethod = "rule" | "ai" | "hybrid" | "manual";
export type MappingMethod = "rule" | "ai" | "manual";
export type SyncStatus = "pending" | "processed" | "needs_review" | "failed";

/** What a source adapter hands the pipeline — untouched, as the source gave it. */
export type RawExternalProduct = {
  source: string;
  sourceProductId: string;
  sourceUrl?: string;
  rawName: string;
  rawDescription?: string;
  rawPrice?: number;
  rawCurrency?: string;
  rawImageUrl?: string;
  rawPublisher?: string;
  rawCategory?: string;
  rawIsbn?: string;
  rawMetadata?: Record<string, unknown>;
};

/** Output of the VALIDATE + NORMALIZE steps — still not written to `catalog_books`. */
export type NormalizedProduct = {
  raw: RawExternalProduct;
  name: string;
  publisherName: string | null;
  publisherSlug: string | null;
  publisherNormalizedName: string | null;
  isbn: string | null;
  editionYear: number | null;
  description: string | null;
  imageUrl: string | null;
  bookType: BookType;
  examScope: ExamScope;
  subject: string | null;
  price: number | null;
  currency: string;
};

export type ValidationIssue = { field: string; message: string };

export type PipelineItemOutcome =
  | { status: "created"; bookId: number; sourceRowId: number }
  | { status: "updated"; bookId: number; sourceRowId: number }
  | { status: "skipped"; reason: string; sourceRowId?: number }
  | { status: "needs_review"; bookId: number | null; sourceRowId: number; reason: string; wasNew: boolean }
  | { status: "failed"; reason: string; product?: RawExternalProduct };

export type ImportResultStats = {
  source: string;
  dryRun: boolean;
  fetched: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  needsReview: number;
  difficulty: { easy: number; medium: number; hard: number; needsReview: number };
  curriculumMapped: number;
  curriculumUnmapped: number;
  missing: { isbn: number; publisher: number; subject: number; examScope: number; bookType: number; image: number; price: number };
  errors: Array<{ sourceProductId?: string; message: string }>;
  startedAt: string;
  finishedAt: string;
};

export type ImportOptions = {
  limit?: number;
  dryRun?: boolean;
  force?: boolean;
  noAi?: boolean;
  onlyNew?: boolean;
  reviewNeeded?: boolean;
  triggeredBy?: number | null;
};
