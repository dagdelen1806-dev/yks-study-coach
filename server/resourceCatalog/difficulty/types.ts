import type { BookType, ClassificationMethod, DifficultyLabel, ExamScope } from "../types";

export type BookClassificationInput = {
  title: string;
  publisher?: string | null;
  subject?: string | null;
  exam?: ExamScope | null;
  bookType?: BookType | null;
  description?: string | null;
  category?: string | null;
};

export type DifficultyClassificationResult = {
  label: DifficultyLabel;
  score: number; // 0-100
  confidence: number; // 0-1
  rationale: string;
  model: string;
  classifiedAt: string;
};

/**
 * AI provider abstraction (spec §16/§46). `HybridDifficultyClassifier` is the
 * only consumer that matters to the pipeline — it composes a rule-based
 * layer with whichever `DifficultyClassifierInterface` implementation is
 * configured (mock, local heuristic, or a real LLM), so swapping providers
 * never touches pipeline code.
 */
export interface DifficultyClassifierInterface {
  readonly method: ClassificationMethod;
  classify(input: BookClassificationInput): Promise<DifficultyClassificationResult>;
}
