/**
 * Deterministic Turkish text normalization shared by every normalizer in this
 * module (publisher names, book-type keywords, difficulty rule signals).
 * Same input must always produce the same output — this is what makes
 * duplicate detection and rule-based classification explainable.
 */

// Turkish-aware casefolding: `toLowerCase()` alone mishandles the dotted/dotless I pair
// (İ -> i̇ with a combining dot, I -> ı is skipped by plain JS lowercase without a locale).
export const turkishLowerCase = (value: string): string =>
  value.replace(/İ/g, "i").replace(/I/g, "ı").toLowerCase();

const DIACRITIC_MAP: Record<string, string> = {
  ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u",
};

export const foldTurkishDiacritics = (value: string): string =>
  value.replace(/[çğıöşü]/g, (char) => DIACRITIC_MAP[char] ?? char);

/** lowercase -> strip diacritics -> collapse punctuation/whitespace. Used for
 * fuzzy/deterministic identity comparisons (publisher aliasing, duplicate title match). */
export const normalizeForComparison = (value: string): string =>
  foldTurkishDiacritics(turkishLowerCase(value))
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Explicit Latin+Turkish letter allowlist instead of a `\p{L}` unicode
// property escape — the project's tsconfig has no `target` set, which
// leaves `tsc` defaulting to a level too old to allow unicode regex flags.
const ALLOWED_LETTER_CLASS = "a-zçğıöşüâîû";

/** lowercase + whitespace/punctuation cleanup but Turkish characters kept —
 * used for slugs and rule-based keyword matching where "ı" vs "i" still matters. */
export const normalizeKeepingTurkish = (value: string): string =>
  turkishLowerCase(value)
    .replace(/['’‘"“”]/g, "")
    .replace(new RegExp(`[^${ALLOWED_LETTER_CLASS}0-9\\s]`, "g"), " ")
    .replace(/\s+/g, " ")
    .trim();

export const slugify = (value: string): string => {
  const folded = normalizeForComparison(value);
  return folded.replace(/\s+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
};

/** Tokenizes on word boundaries so keyword rules never match inside another
 * word (e.g. the substring "zor" inside "Zorunlu" must NOT trigger the "zor" hard-signal). */
export const tokenize = (value: string): string[] =>
  normalizeKeepingTurkish(value).split(" ").filter(Boolean);
