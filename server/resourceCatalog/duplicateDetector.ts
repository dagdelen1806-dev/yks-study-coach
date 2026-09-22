import { normalizeForComparison } from "./normalizers/turkishText";

export type ExistingBookForDedupe = {
  id: number;
  isbn: string | null;
  publisherId: number | null;
  name: string;
  editionYear: number | null;
};

export type DuplicateMatchTier = "isbn" | "normalized_identity" | "publisher_name" | "fuzzy";

export type DuplicateMatch = {
  bookId: number;
  tier: DuplicateMatchTier;
  confidence: number;
  reason: string;
};

export type DuplicateCandidateInput = {
  isbn: string | null;
  name: string;
  publisherId: number | null;
  editionYear: number | null;
};

const normalizeIsbn = (isbn: string): string => isbn.replace(/[^0-9Xx]/g, "").toUpperCase();

// Classic Levenshtein edit distance — no dependency needed for catalog-scale
// (a few thousand rows) fuzzy matching restricted to the same publisher.
function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const previousRow = Array.from({ length: b.length + 1 }, (_, i) => i);
  const currentRow = new Array<number>(b.length + 1);

  for (let i = 0; i < a.length; i++) {
    currentRow[0] = i + 1;
    for (let j = 0; j < b.length; j++) {
      const cost = a[i] === b[j] ? 0 : 1;
      currentRow[j + 1] = Math.min(
        currentRow[j] + 1,
        previousRow[j + 1] + 1,
        previousRow[j] + cost
      );
    }
    for (let j = 0; j <= b.length; j++) previousRow[j] = currentRow[j];
  }
  return previousRow[b.length];
}

const similarity = (a: string, b: string): number => {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
};

const FUZZY_SIMILARITY_THRESHOLD = 0.88;

/**
 * Deterministic, explainable duplicate detection, checked in priority order.
 * Caller is expected to have already checked `external_book_sources` for an
 * exact (source, sourceProductId) re-sync match before calling this — that
 * tier is a straight unique-index lookup and doesn't need fuzzy logic.
 *
 * Editions are respected: a differing, both-known `editionYear` between the
 * candidate and an otherwise-identical existing book is treated as a
 * *different* book (new edition), never silently merged.
 */
export function detectDuplicate(
  candidate: DuplicateCandidateInput,
  existingBooks: ExistingBookForDedupe[]
): DuplicateMatch | null {
  // Tier 1: ISBN — the strongest, near-certain signal.
  if (candidate.isbn) {
    const candidateIsbn = normalizeIsbn(candidate.isbn);
    const isbnMatch = existingBooks.find((book) => book.isbn && normalizeIsbn(book.isbn) === candidateIsbn);
    if (isbnMatch) {
      return { bookId: isbnMatch.id, tier: "isbn", confidence: 1, reason: `ISBN eşleşmesi (${candidateIsbn})` };
    }
  }

  const candidateNormalizedName = normalizeForComparison(candidate.name);

  // Tier 2: normalized name + publisher + edition all agree.
  const identityMatch = existingBooks.find((book) => {
    if (book.publisherId !== candidate.publisherId) return false;
    if (normalizeForComparison(book.name) !== candidateNormalizedName) return false;
    const bothEditionsKnown = book.editionYear !== null && candidate.editionYear !== null;
    if (bothEditionsKnown && book.editionYear !== candidate.editionYear) return false;
    return true;
  });
  if (identityMatch) {
    return {
      bookId: identityMatch.id,
      tier: "normalized_identity",
      confidence: 0.95,
      reason: "Aynı yayıncı + normalize edilmiş ad + baskı yılı uyumu",
    };
  }

  // Tier 3: same publisher + same normalized name, edition year differs or unknown
  // on one side — still very likely the same book, but flagged with lower
  // confidence so the pipeline can route it to review rather than auto-merge
  // when both edition years are known and actually differ.
  const publisherNameMatch = existingBooks.find(
    (book) => book.publisherId === candidate.publisherId && normalizeForComparison(book.name) === candidateNormalizedName
  );
  if (publisherNameMatch) {
    const editionsDiffer = publisherNameMatch.editionYear !== null && candidate.editionYear !== null && publisherNameMatch.editionYear !== candidate.editionYear;
    return {
      bookId: publisherNameMatch.id,
      tier: "publisher_name",
      confidence: editionsDiffer ? 0.55 : 0.85,
      reason: editionsDiffer
        ? `Aynı yayıncı + ad, farklı baskı yılı (${publisherNameMatch.editionYear} vs ${candidate.editionYear}) — muhtemelen yeni baskı`
        : "Aynı yayıncı + normalize edilmiş ad",
    };
  }

  // Tier 4: fuzzy match, restricted to the same publisher to keep false positives low.
  if (candidate.publisherId !== null) {
    let best: { book: ExistingBookForDedupe; score: number } | null = null;
    for (const book of existingBooks) {
      if (book.publisherId !== candidate.publisherId) continue;
      const score = similarity(candidateNormalizedName, normalizeForComparison(book.name));
      if (score >= FUZZY_SIMILARITY_THRESHOLD && (!best || score > best.score)) {
        best = { book, score };
      }
    }
    if (best) {
      return {
        bookId: best.book.id,
        tier: "fuzzy",
        confidence: Number(best.score.toFixed(3)),
        reason: `Aynı yayıncı, bulanık ad benzerliği %${Math.round(best.score * 100)}`,
      };
    }
  }

  return null;
}
