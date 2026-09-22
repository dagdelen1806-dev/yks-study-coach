import { resourceCatalogConfig } from "../config";
import { normalizeKeepingTurkish } from "../normalizers/turkishText";
import type { BookType } from "../types";
import type { BookClassificationInput, DifficultyClassificationResult, DifficultyClassifierInterface } from "./types";

// Spec §14 — keyword signals. Kept as literal Turkish phrases (not stemmed)
// and matched on whole-token/whole-phrase boundaries only, so a false
// positive like "Zorunlu Din Kültürü" never triggers the "zor" hard signal:
// "zorunlu" and "zor" are different tokens once padded-boundary matching is used.
const EASY_PHRASES = ["sıfır", "sıfırdan", "temel", "başlangıç", "ilk adım", "kolay", "temelden", "0dan", "0 dan", "başlangıç seviyesi"];
const HARD_PHRASES = ["ileri", "zor", "extreme", "advanced", "master", "pro", "ileri düzey", "üst düzey", "seçici"];

const normalizedPhrases = (phrases: string[]) => phrases.map((phrase) => normalizeKeepingTurkish(phrase));
const EASY = normalizedPhrases(EASY_PHRASES);
const HARD = normalizedPhrases(HARD_PHRASES);

const countPhraseMatches = (text: string, phrases: string[]): string[] => {
  const padded = ` ${normalizeKeepingTurkish(text)} `;
  return phrases.filter((phrase) => padded.includes(` ${phrase} `));
};

// Spec §15 — book type nudges the score but never decides it alone.
const BOOK_TYPE_MODIFIER: Record<BookType, number> = {
  topic_explanation: -6,
  topic_explanation_question_bank: -2,
  question_bank: 0,
  fasikul: -3,
  test_book: -2,
  mock_exam: 2,
  past_questions: 6,
  camp: 3,
  reference: 0,
  other: 0,
};

const EASY_SHIFT_PER_MATCH = 16;
const HARD_SHIFT_PER_MATCH = 16;
const MAX_KEYWORD_SHIFT = 34;

export class RuleBasedDifficultyClassifier implements DifficultyClassifierInterface {
  readonly method = "rule" as const;

  async classify(input: BookClassificationInput): Promise<DifficultyClassificationResult> {
    const haystack = [input.title, input.description ?? "", input.category ?? ""].join(" ");
    const easyMatches = countPhraseMatches(haystack, EASY);
    const hardMatches = countPhraseMatches(haystack, HARD);

    const easyShift = Math.min(easyMatches.length * EASY_SHIFT_PER_MATCH, MAX_KEYWORD_SHIFT);
    const hardShift = Math.min(hardMatches.length * HARD_SHIFT_PER_MATCH, MAX_KEYWORD_SHIFT);
    const bookTypeShift = input.bookType ? BOOK_TYPE_MODIFIER[input.bookType] : 0;

    const rawScore = 50 - easyShift + hardShift + bookTypeShift;
    const score = Math.max(0, Math.min(100, Math.round(rawScore)));

    const { easyMax, mediumMax } = resourceCatalogConfig.difficulty.thresholds;
    const label = score <= easyMax ? "easy" : score <= mediumMax ? "medium" : "hard";

    const signalCount = easyMatches.length + hardMatches.length + (bookTypeShift !== 0 ? 1 : 0);
    // Zero textual/type signal -> we're guessing at the neutral midpoint, say so with low confidence.
    const confidence = signalCount === 0 ? 0.3 : Math.min(0.3 + signalCount * 0.18, 0.85);

    const rationaleParts: string[] = [];
    if (easyMatches.length) rationaleParts.push(`kolay sinyaller: ${easyMatches.join(", ")}`);
    if (hardMatches.length) rationaleParts.push(`zor sinyaller: ${hardMatches.join(", ")}`);
    if (bookTypeShift !== 0) rationaleParts.push(`tür etkisi: ${input.bookType} (${bookTypeShift > 0 ? "+" : ""}${bookTypeShift})`);
    if (rationaleParts.length === 0) rationaleParts.push("belirgin anahtar kelime yok, nötr puan");

    return {
      label,
      score,
      confidence,
      rationale: rationaleParts.join("; "),
      model: "rule-based-v1",
      classifiedAt: new Date().toISOString(),
    };
  }
}
