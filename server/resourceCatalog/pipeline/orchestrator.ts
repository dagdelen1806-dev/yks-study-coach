import type { CurriculumTopicCandidate } from "../curriculumMapper";
import { mapBookToCurriculumTopics } from "../curriculumMapper";
import { resourceCatalogConfig } from "../config";
import { detectDuplicate, type DuplicateMatch, type ExistingBookForDedupe } from "../duplicateDetector";
import type { HybridDifficultyClassifier } from "../difficulty/hybridClassifier";
import type { BookSourceAdapter } from "../sources/types";
import type { ImportOptions, ImportResultStats, PipelineItemOutcome, RawExternalProduct } from "../types";
import { normalizeProduct, slugForBook } from "./normalize";
import type { CatalogDbPort, CatalogBookRow, UpsertCatalogBookInput } from "./types";
import { validateRawProduct } from "./validate";

const emptyStats = (source: string, dryRun: boolean, startedAt: Date): ImportResultStats => ({
  source,
  dryRun,
  fetched: 0,
  created: 0,
  updated: 0,
  skipped: 0,
  failed: 0,
  needsReview: 0,
  difficulty: { easy: 0, medium: 0, hard: 0, needsReview: 0 },
  curriculumMapped: 0,
  curriculumUnmapped: 0,
  missing: { isbn: 0, publisher: 0, subject: 0, examScope: 0, bookType: 0, image: 0, price: 0 },
  errors: [],
  startedAt: startedAt.toISOString(),
  finishedAt: startedAt.toISOString(),
});

// Below this confidence a duplicate candidate is treated as "probably a new
// edition, not certain enough to auto-merge" — spec §11: don't collapse two
// genuinely different editions into one row just because a fuzzy/partial
// signal fired.
const AUTO_MERGE_CONFIDENCE_THRESHOLD = 0.75;

/**
 * FETCH → RAW STORE → VALIDATE → NORMALIZE → DEDUPLICATE → UPSERT CANONICAL
 * → MAP PUBLISHER/EXAM/SUBJECT/BOOK TYPE → CLASSIFY DIFFICULTY → MAP
 * CURRICULUM → MARK REVIEW → SYNC COMPLETE (spec §25), each concern kept in
 * its own module — this class only orchestrates the order and the
 * per-item failure isolation (spec §28: one bad product never aborts the run).
 */
export class ResourceCatalogImportPipeline {
  constructor(
    private readonly source: BookSourceAdapter,
    private readonly db: CatalogDbPort,
    private readonly difficultyClassifier: HybridDifficultyClassifier
  ) {}

  async run(options: ImportOptions = {}): Promise<ImportResultStats> {
    const startedAt = new Date();
    const dryRun = !!options.dryRun;
    const log = dryRun ? null : await this.db.createSyncLog({ source: this.source.name, startedAt, dryRun, triggeredBy: options.triggeredBy ?? null });

    const stats = emptyStats(this.source.name, dryRun, startedAt);
    const limit = options.limit ?? Number.POSITIVE_INFINITY;
    // Fetched once per run, not per item — avoids an N+1 query against yks_topics.
    const curriculumTopics = await this.db.listCurriculumTopics();

    let page = 0;
    let hasMore = true;
    while (hasMore && stats.fetched < limit) {
      const { products, hasMore: more } = await this.source.fetchPage(page);
      hasMore = more;
      page += 1;
      if (products.length === 0 && !hasMore) break;

      for (const product of products) {
        if (stats.fetched >= limit) break;
        stats.fetched += 1;
        try {
          this.trackMissingFields(stats, product);
          const outcome = await this.processOne(product, options, curriculumTopics, stats);
          this.tally(stats, outcome);
        } catch (error) {
          stats.failed += 1;
          stats.errors.push({ sourceProductId: product.sourceProductId, message: error instanceof Error ? error.message : String(error) });
        }
      }
    }

    stats.finishedAt = new Date().toISOString();

    if (log) {
      await this.db.finishSyncLog(log.id, {
        finishedAt: new Date(stats.finishedAt),
        fetched: stats.fetched,
        created: stats.created,
        updated: stats.updated,
        skipped: stats.skipped,
        failed: stats.failed,
        needsReview: stats.needsReview,
        statsJson: JSON.stringify(stats),
        errorLog: stats.errors.length ? JSON.stringify(stats.errors) : null,
      });
    }

    return stats;
  }

  private trackMissingFields(stats: ImportResultStats, product: RawExternalProduct) {
    if (!product.rawIsbn) stats.missing.isbn += 1;
    if (!product.rawPublisher) stats.missing.publisher += 1;
    if (!product.rawMetadata?.subjectLabel) stats.missing.subject += 1;
    if (!product.rawMetadata?.examLabel && !product.rawCategory) stats.missing.examScope += 1;
    if (!product.rawCategory) stats.missing.bookType += 1;
    if (!product.rawImageUrl) stats.missing.image += 1;
    if (product.rawPrice === undefined) stats.missing.price += 1;
  }

  private tally(stats: ImportResultStats, outcome: PipelineItemOutcome) {
    if (outcome.status === "created") stats.created += 1;
    else if (outcome.status === "updated") stats.updated += 1;
    else if (outcome.status === "skipped") stats.skipped += 1;
    else if (outcome.status === "needs_review") {
      stats.needsReview += 1;
      if (outcome.wasNew) stats.created += 1;
      else stats.updated += 1;
    } else {
      stats.failed += 1;
      stats.errors.push({ sourceProductId: outcome.product?.sourceProductId, message: outcome.reason });
    }
  }

  private async processOne(product: RawExternalProduct, options: ImportOptions, curriculumTopics: CurriculumTopicCandidate[], stats: ImportResultStats): Promise<PipelineItemOutcome> {
    const dryRun = !!options.dryRun;

    // VALIDATE (raw is stored regardless, so a bad product is still auditable).
    const issues = validateRawProduct(product);
    if (!dryRun) {
      const sourceRow = await this.db.upsertExternalSource({
        source: product.source,
        sourceProductId: product.sourceProductId,
        sourceUrl: product.sourceUrl ?? null,
        rawName: product.rawName,
        rawDescription: product.rawDescription ?? null,
        rawPrice: product.rawPrice ?? null,
        rawCurrency: product.rawCurrency ?? null,
        rawImageUrl: product.rawImageUrl ?? null,
        rawPublisher: product.rawPublisher ?? null,
        rawCategory: product.rawCategory ?? null,
        rawIsbn: product.rawIsbn ?? null,
        rawMetadata: product.rawMetadata ?? null,
      });
      if (issues.length > 0) {
        await this.db.markExternalSourceOutcome(sourceRow.id, { matchedBookId: sourceRow.matchedBookId, syncStatus: "failed", errorMessage: issues.map((i) => i.message).join("; ") });
        return { status: "failed", reason: issues.map((i) => i.message).join("; "), product };
      }
      if (options.onlyNew && sourceRow.matchedBookId) {
        return { status: "skipped", reason: "--only-new: bu ürün zaten eşleşmiş", sourceRowId: sourceRow.id };
      }
      return this.upsertAndClassify(product, sourceRow.matchedBookId, options, curriculumTopics, sourceRow.id, stats);
    }

    if (issues.length > 0) return { status: "failed", reason: issues.map((i) => i.message).join("; "), product };
    const existing = await this.db.findExternalSource(product.source, product.sourceProductId);
    if (options.onlyNew && existing?.matchedBookId) return { status: "skipped", reason: "--only-new: bu ürün zaten eşleşmiş" };
    return this.upsertAndClassify(product, existing?.matchedBookId ?? null, options, curriculumTopics, existing?.id ?? -1, stats);
  }

  private async upsertAndClassify(
    product: RawExternalProduct,
    matchedBookId: number | null,
    options: ImportOptions,
    curriculumTopics: CurriculumTopicCandidate[],
    sourceRowId: number,
    stats: ImportResultStats
  ): Promise<PipelineItemOutcome> {
    const dryRun = !!options.dryRun;
    const normalized = normalizeProduct(product);

    // MAP PUBLISHER
    let publisherId: number | null = null;
    if (normalized.publisherNormalizedName && normalized.publisherName && normalized.publisherSlug) {
      const existingPublisher = await this.db.findPublisherByNormalizedName(normalized.publisherNormalizedName);
      if (existingPublisher) {
        publisherId = existingPublisher.id;
      } else if (!dryRun) {
        const created = await this.db.createPublisher({ name: normalized.publisherName, slug: normalized.publisherSlug, normalizedName: normalized.publisherNormalizedName });
        publisherId = created.id;
      }
    }

    // DEDUPLICATE
    let existingBook: CatalogBookRow | null = matchedBookId ? await this.db.getCatalogBookById(matchedBookId) : null;
    let match: DuplicateMatch | null = null;
    if (!existingBook) {
      if (normalized.isbn) {
        existingBook = await this.db.findCatalogBookByIsbn(normalized.isbn);
        if (existingBook) match = { bookId: existingBook.id, tier: "isbn", confidence: 1, reason: "ISBN eşleşmesi" };
      }
      if (!existingBook && publisherId !== null) {
        const candidates: ExistingBookForDedupe[] = await this.db.listCatalogBooksByPublisher(publisherId);
        match = detectDuplicate({ isbn: normalized.isbn, name: normalized.name, publisherId, editionYear: normalized.editionYear }, candidates);
      }
    }

    const willAutoMerge = !!existingBook || (match !== null && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD);
    const ambiguousMatch: DuplicateMatch | null = match && match.confidence < AUTO_MERGE_CONFIDENCE_THRESHOLD ? match : null;

    const bookInput: UpsertCatalogBookInput = {
      publisherId,
      name: normalized.name,
      slug: slugForBook(normalized.name, normalized.publisherName) + (ambiguousMatch ? `-${normalized.editionYear ?? Date.now()}` : ""),
      isbn: normalized.isbn,
      editionYear: normalized.editionYear,
      description: normalized.description,
      imageUrl: normalized.imageUrl,
      bookType: normalized.bookType,
      examScope: normalized.examScope,
      subject: normalized.subject,
      metadata: { source: product.source, sourceUrl: product.sourceUrl ?? null },
    };

    let book: CatalogBookRow;
    let isNewBook: boolean;

    if (dryRun) {
      isNewBook = !existingBook && !willAutoMerge;
      book =
        existingBook ??
        (match && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD ? ((await this.db.getCatalogBookById(match.bookId)) as CatalogBookRow) : ({ ...bookInput, id: -1, active: true, manualOverride: false, difficultyLabel: "medium", difficultyScore: 50, difficultyConfidence: 0, classificationMethod: "rule" } as CatalogBookRow));
    } else if (existingBook || (match && match.confidence >= AUTO_MERGE_CONFIDENCE_THRESHOLD)) {
      const targetId = existingBook?.id ?? match!.bookId;
      book = await this.db.updateCatalogBook(targetId, bookInput);
      isNewBook = false;
    } else {
      book = await this.db.createCatalogBook(bookInput);
      isNewBook = true;
    }

    if (!dryRun) {
      await this.db.markExternalSourceOutcome(sourceRowId, { matchedBookId: book.id, syncStatus: ambiguousMatch ? "needs_review" : "processed" });
      if (normalized.price !== null) {
        await this.db.upsertBookOffer({ bookId: book.id, source: product.source, price: normalized.price, currency: normalized.currency, productUrl: product.sourceUrl ?? null });
      }
    }

    // CLASSIFY DIFFICULTY — never touches a manually-overridden book, and only
    // reclassifies new books (or when --force is passed) to keep repeat syncs cheap.
    let needsReview = ambiguousMatch !== null;
    if (!book.manualOverride && (isNewBook || options.force)) {
      const rawMetadata = product.rawMetadata ?? {};
      const useAi = resourceCatalogConfig.difficulty.aiEnabled && !options.noAi;
      const result = await this.difficultyClassifier.classify(
        { title: normalized.name, publisher: normalized.publisherName, subject: normalized.subject, exam: normalized.examScope, bookType: normalized.bookType, description: normalized.description, category: product.rawCategory ?? null },
        { useAi, metadata: { legacyLevel: (rawMetadata.legacyLevel as "Kolay" | "Orta" | "Zor" | undefined) ?? null, pageCount: (rawMetadata.pageCount as number | undefined) ?? null } }
      );
      needsReview = needsReview || result.confidence < resourceCatalogConfig.difficulty.reviewConfidenceThreshold;
      stats.difficulty[result.label] += 1;
      if (needsReview) stats.difficulty.needsReview += 1;
      if (!dryRun) {
        await this.db.updateCatalogBookDifficulty(book.id, {
          difficultyScore: result.score,
          difficultyLabel: result.label,
          difficultyConfidence: result.confidence,
          classificationMethod: "hybrid",
          needsReview,
          classifiedAt: new Date(),
        });
      }
    }

    // MAP CURRICULUM
    const mappings = mapBookToCurriculumTopics({ name: normalized.name, subject: normalized.subject, examScope: normalized.examScope }, curriculumTopics);
    if (mappings.length > 0) stats.curriculumMapped += 1;
    else stats.curriculumUnmapped += 1;
    if (!dryRun) {
      for (const mapping of mappings) {
        await this.db.upsertBookCurriculumMapping({ bookId: book.id, topicId: mapping.topicId, confidence: mapping.confidence, reason: mapping.reason });
      }
    }

    if (needsReview) {
      return { status: "needs_review", bookId: dryRun ? null : book.id, sourceRowId, reason: ambiguousMatch ? ambiguousMatch.reason : "Düşük güvenli zorluk sınıflandırması", wasNew: isNewBook };
    }
    return { status: isNewBook ? "created" : "updated", bookId: book.id, sourceRowId };
  }
}
