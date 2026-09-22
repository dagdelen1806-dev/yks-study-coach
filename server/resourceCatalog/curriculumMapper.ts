import { normalizeForComparison, tokenize } from "./normalizers/turkishText";
import type { ExamScope } from "./types";

export type CurriculumTopicCandidate = {
  id: number;
  exam: "TYT" | "AYT";
  subject: string;
  topic: string;
  unit: string;
};

export type CurriculumMapping = { topicId: number; confidence: number; reason: string };

const STOPWORDS = new Set(["ve", "ile", "soru", "bankasi", "konu", "anlatimi", "anlatimli", "deneme", "kitap", "kitabi", "tyt", "ayt", "fasikul"]);

const examScopeAllows = (examScope: ExamScope, topicExam: "TYT" | "AYT"): boolean => {
  if (examScope === "TYT_AYT" || examScope === "YKS" || examScope === "GENEL") return true;
  return examScope === topicExam;
};

/**
 * Deterministic subject/exam filter + token-overlap scoring against the
 * project's existing curriculum (`yks_topics`), no parallel topic system.
 * Never returns a verified match on its own — the pivot row is always
 * created with `isVerified = false`; an admin (or `is_verified` set via a
 * manual review action) is what turns a candidate into a confirmed mapping
 * (spec §20: low confidence must not become an automatic hard match).
 */
export function mapBookToCurriculumTopics(
  book: { name: string; subject: string | null; examScope: ExamScope },
  topics: CurriculumTopicCandidate[],
  options: { maxMatches?: number } = {}
): CurriculumMapping[] {
  if (!book.subject) return [];
  const maxMatches = options.maxMatches ?? 3;
  const bookSubjectKey = normalizeForComparison(book.subject);
  const bookNameTokens = new Set(tokenize(book.name).filter((token) => !STOPWORDS.has(token)));

  const candidates = topics
    .filter((topic) => normalizeForComparison(topic.subject) === bookSubjectKey && examScopeAllows(book.examScope, topic.exam))
    .map((topic) => {
      const topicTokens = tokenize(topic.topic).filter((token) => !STOPWORDS.has(token));
      const shared = topicTokens.filter((token) => bookNameTokens.has(token));
      const overlapRatio = topicTokens.length > 0 ? shared.length / topicTokens.length : 0;
      return { topic, shared, overlapRatio };
    })
    .filter((candidate) => candidate.shared.length > 0)
    .map((candidate) => ({
      topicId: candidate.topic.id,
      confidence: Math.min(0.9, 0.35 + candidate.overlapRatio * 0.55),
      reason: `Ders eşleşti (${book.subject}) + ortak kelimeler: ${candidate.shared.join(", ")}`,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, maxMatches);

  return candidates;
}
