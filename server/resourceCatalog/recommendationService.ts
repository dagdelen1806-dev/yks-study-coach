import { resourceCatalogConfig } from "./config";
import { normalizeForComparison } from "./normalizers/turkishText";
import type { BookType, DifficultyLabel, ExamScope } from "./types";

export type ExamType = "TYT" | "AYT";
export type TopicStatusLabel = "Zayıf" | "Orta" | "İyi";

export type StudentTopicPerformance = {
  subject: string;
  topic: string;
  exam: ExamType;
  accuracy: number; // 0-100
  status: TopicStatusLabel;
};

export type RecommendationCandidateBook = {
  id: number;
  name: string;
  subject: string | null;
  examScope: ExamScope;
  bookType: BookType;
  difficultyLabel: DifficultyLabel;
  difficultyScore: number;
  difficultyConfidence: number;
  active: boolean;
  mappedTopicNames?: string[];
};

export type RecommendationLabel = "Temel tekrar kaynağı" | "Seviyene uygun" | "Bir sonraki seviyeye geçiş" | "İleri seviye";

export type Recommendation = {
  bookId: number;
  score: number; // 0-100
  label: RecommendationLabel;
  reason: string;
  signals: { difficultyFit: number; subjectMatch: number; examMatch: number; topicMatch: number; bookTypeMatch: number; performanceMatch: number };
};

const DIFFICULTY_RANK: Record<DifficultyLabel, number> = { easy: 0, medium: 1, hard: 2 };

// Preferred difficulty distribution per topic status (spec §21 example: weak
// topic -> easy first, medium second, hard low priority). Índices 0/1/2 map
// to easy/medium/hard fit scores.
const DIFFICULTY_FIT_BY_STATUS: Record<TopicStatusLabel, [number, number, number]> = {
  "Zayıf": [1, 0.6, 0.15],
  "Orta": [0.55, 1, 0.45],
  "İyi": [0.25, 0.65, 1],
};

const LEARNING_TYPES: BookType[] = ["topic_explanation", "topic_explanation_question_bank", "fasikul"];
const PRACTICE_TYPES: BookType[] = ["question_bank", "test_book"];
const EXAM_STAGE_TYPES: BookType[] = ["mock_exam", "past_questions", "camp"];

const bookTypeFitByStatus = (status: TopicStatusLabel, bookType: BookType): number => {
  if (status === "Zayıf") return LEARNING_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES.includes(bookType) ? 0.5 : 0.2;
  if (status === "Orta") return PRACTICE_TYPES.includes(bookType) ? 1 : LEARNING_TYPES.includes(bookType) ? 0.6 : 0.4;
  return EXAM_STAGE_TYPES.includes(bookType) ? 1 : PRACTICE_TYPES.includes(bookType) ? 0.8 : 0.3;
};

const examScopeCovers = (examScope: ExamScope, exam: ExamType): boolean =>
  examScope === "TYT_AYT" || examScope === "YKS" || examScope === "GENEL" || examScope === exam;

const idealDifficultyScore = (accuracy: number): number => Math.max(0, Math.min(100, accuracy + 15));

const labelFor = (bookDifficulty: DifficultyLabel, status: TopicStatusLabel): RecommendationLabel => {
  const idealRank = DIFFICULTY_FIT_BY_STATUS[status].indexOf(Math.max(...DIFFICULTY_FIT_BY_STATUS[status]));
  const bookRank = DIFFICULTY_RANK[bookDifficulty];
  if (bookRank === idealRank) return "Seviyene uygun";
  if (bookRank === idealRank + 1) return "Bir sonraki seviyeye geçiş";
  if (bookRank > idealRank + 1) return "İleri seviye";
  return "Temel tekrar kaynağı";
};

/**
 * Deterministic, explainable recommendation for a single topic (spec §21/§22).
 * No AI involvement in v1: every subscore and the final label are derivable
 * from the inputs, and low-confidence difficulty classifications are damped
 * (not hidden) via a confidence multiplier so an uncertain auto-classification
 * never outranks a confidently-classified book with a worse raw fit.
 */
export function recommendBooksForTopic(
  topicPerf: StudentTopicPerformance,
  books: RecommendationCandidateBook[],
  config = resourceCatalogConfig
): Recommendation[] {
  const weights = config.recommendation.weights;
  const topicSubjectKey = normalizeForComparison(topicPerf.subject);
  const topicKey = normalizeForComparison(topicPerf.topic);
  const ideal = idealDifficultyScore(topicPerf.accuracy);

  return books
    .filter((book) => book.active)
    .map((book) => {
      const difficultyFit = DIFFICULTY_FIT_BY_STATUS[topicPerf.status][DIFFICULTY_RANK[book.difficultyLabel]];
      const subjectMatch = book.subject === null ? 0.4 : normalizeForComparison(book.subject) === topicSubjectKey ? 1 : 0;
      const examMatch = examScopeCovers(book.examScope, topicPerf.exam) ? 1 : 0;
      const mappedTopics = (book.mappedTopicNames ?? []).map(normalizeForComparison);
      const topicMatch = mappedTopics.includes(topicKey) ? 1 : subjectMatch === 1 ? 0.3 : 0;
      const bookTypeMatch = bookTypeFitByStatus(topicPerf.status, book.bookType);
      const performanceMatch = 1 - Math.abs(book.difficultyScore - ideal) / 100;

      const rawScore =
        difficultyFit * weights.difficultyFit +
        subjectMatch * weights.subjectMatch +
        examMatch * weights.examMatch +
        topicMatch * weights.topicMatch +
        bookTypeMatch * weights.bookTypeMatch +
        performanceMatch * weights.performanceMatch;

      const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
      const normalizedScore = totalWeight > 0 ? rawScore / totalWeight : 0;
      // Damp (never zero out) by classification confidence, so a book we're
      // unsure about doesn't outrank a confidently-classified alternative.
      const confidenceDamped = normalizedScore * (0.5 + 0.5 * book.difficultyConfidence);
      const score = Math.round(Math.max(0, Math.min(1, confidenceDamped)) * 100);

      const lowConfidenceNote = book.difficultyConfidence < config.difficulty.reviewConfidenceThreshold ? " (zorluk otomatik tahmin, düşük güven)" : "";
      const reason = `Mevcut performansına (%${Math.round(topicPerf.accuracy)} doğruluk, ${topicPerf.status}) ve seçtiğin konuya (${topicPerf.topic}) göre.${lowConfidenceNote}`;

      return {
        bookId: book.id,
        score,
        label: labelFor(book.difficultyLabel, topicPerf.status),
        reason,
        signals: { difficultyFit, subjectMatch, examMatch, topicMatch, bookTypeMatch, performanceMatch },
      };
    })
    // A book for an explicitly different subject is never relevant, regardless
    // of exam-scope overlap; a general/subject-agnostic book (subjectMatch 0.4) still is.
    .filter((rec) => rec.signals.subjectMatch > 0)
    .sort((a, b) => b.score - a.score);
}

export type StudentTopicRecommendation = Recommendation & { subject: string; topic: string; exam: ExamType; status: TopicStatusLabel };

const STATUS_PRIORITY: Record<TopicStatusLabel, number> = { "Zayıf": 0, "Orta": 1, "İyi": 2 };

/**
 * Aggregates per-topic recommendations across a student's whole profile,
 * prioritizing weak topics first (spec: don't ignore weak topics), capped to
 * a sane page size for the API/UI.
 */
export function recommendForStudent(
  topics: StudentTopicPerformance[],
  books: RecommendationCandidateBook[],
  options: { limitPerTopic?: number; overallLimit?: number } = {},
  config = resourceCatalogConfig
): StudentTopicRecommendation[] {
  const limitPerTopic = options.limitPerTopic ?? 3;
  const overallLimit = options.overallLimit ?? 12;

  const sortedTopics = [...topics].sort((a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status]);

  const results: StudentTopicRecommendation[] = [];
  for (const topic of sortedTopics) {
    const perTopic = recommendBooksForTopic(topic, books, config).slice(0, limitPerTopic);
    for (const rec of perTopic) {
      results.push({ ...rec, subject: topic.subject, topic: topic.topic, exam: topic.exam, status: topic.status });
    }
    if (results.length >= overallLimit) break;
  }
  return results.slice(0, overallLimit);
}
