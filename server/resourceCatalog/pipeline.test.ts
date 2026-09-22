import { beforeEach, describe, expect, it } from "vitest";
import { HybridDifficultyClassifier } from "./difficulty/hybridClassifier";
import { RuleBasedDifficultyClassifier } from "./difficulty/ruleBasedClassifier";
import type { DifficultyClassifierInterface } from "./difficulty/types";
import { ResourceCatalogImportPipeline } from "./pipeline/orchestrator";
import type { CatalogBookRow, CatalogDbPort, DifficultyPatch, ExternalSourceRow, PublisherRow, UpsertCatalogBookInput } from "./pipeline/types";
import { FixtureBookSource } from "./sources/fixtureSource";
import type { BookSourceAdapter } from "./sources/types";
import type { RawExternalProduct } from "./types";

class UnavailableAi implements DifficultyClassifierInterface {
  readonly method = "ai" as const;
  async classify() {
    return { label: "medium" as const, score: 50, confidence: 0, rationale: "unavailable", model: "ai:unavailable", classifiedAt: new Date().toISOString() };
  }
}

/** Minimal in-memory implementation of `CatalogDbPort`, used only in this
 * test file, so the pipeline is exercised end-to-end without any real DB. */
function createInMemoryDb() {
  let nextPublisherId = 1;
  let nextBookId = 1;
  let nextSourceId = 1;
  const publishers = new Map<number, PublisherRow>();
  const books = new Map<number, CatalogBookRow>();
  const externalSources = new Map<string, ExternalSourceRow>();
  const curriculumMappings: Array<{ bookId: number; topicId: number; confidence: number }> = [];
  const offers: Array<{ bookId: number; source: string; price: number | null }> = [];

  const db: CatalogDbPort = {
    async findPublisherByNormalizedName(normalizedName) {
      return Array.from(publishers.values()).find((p) => p.normalizedName === normalizedName) ?? null;
    },
    async createPublisher(input) {
      const row: PublisherRow = { id: nextPublisherId++, ...input };
      publishers.set(row.id, row);
      return row;
    },
    async findExternalSource(source, sourceProductId) {
      return externalSources.get(`${source}:${sourceProductId}`) ?? null;
    },
    async upsertExternalSource(row) {
      const key = `${row.source}:${row.sourceProductId}`;
      const existing = externalSources.get(key);
      const next: ExternalSourceRow = { id: existing?.id ?? nextSourceId++, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: existing?.matchedBookId ?? null, syncStatus: existing?.syncStatus ?? "pending" };
      externalSources.set(key, next);
      return next;
    },
    async markExternalSourceOutcome(id, patch) {
      const entry = Array.from(externalSources.values()).find((r) => r.id === id);
      if (entry) {
        entry.matchedBookId = patch.matchedBookId;
        entry.syncStatus = patch.syncStatus;
      }
    },
    async findCatalogBookByIsbn(isbn) {
      return Array.from(books.values()).find((b) => b.isbn === isbn) ?? null;
    },
    async listCatalogBooksByPublisher(publisherId) {
      return Array.from(books.values()).filter((b) => b.publisherId === publisherId);
    },
    async getCatalogBookById(id) {
      return books.get(id) ?? null;
    },
    async createCatalogBook(input: UpsertCatalogBookInput) {
      const row: CatalogBookRow = {
        id: nextBookId++,
        publisherId: input.publisherId,
        name: input.name,
        editionYear: input.editionYear,
        isbn: input.isbn,
        slug: input.slug,
        bookType: input.bookType,
        examScope: input.examScope,
        subject: input.subject,
        imageUrl: input.imageUrl,
        description: input.description,
        active: true,
        manualOverride: false,
        difficultyLabel: "medium",
        difficultyScore: 50,
        difficultyConfidence: 0,
        classificationMethod: "rule",
      };
      books.set(row.id, row);
      return row;
    },
    async updateCatalogBook(id, patch) {
      const existing = books.get(id);
      if (!existing) throw new Error("not found");
      const updated = { ...existing, ...patch } as CatalogBookRow;
      books.set(id, updated);
      return updated;
    },
    async updateCatalogBookDifficulty(id, patch: DifficultyPatch) {
      const existing = books.get(id);
      if (!existing) return;
      books.set(id, { ...existing, difficultyScore: patch.difficultyScore, difficultyLabel: patch.difficultyLabel, difficultyConfidence: patch.difficultyConfidence, classificationMethod: patch.classificationMethod });
    },
    async upsertBookOffer(input) {
      offers.push({ bookId: input.bookId, source: input.source, price: input.price });
    },
    async listCurriculumTopics() {
      return [];
    },
    async upsertBookCurriculumMapping(input) {
      curriculumMappings.push(input);
    },
    async createSyncLog() {
      return { id: 1 };
    },
    async finishSyncLog() {
      // no-op
    },
  };

  return { db, books, publishers, externalSources, curriculumMappings, offers };
}

const classifier = new HybridDifficultyClassifier(new RuleBasedDifficultyClassifier(), new UnavailableAi());

describe("ResourceCatalogImportPipeline", () => {
  let mem: ReturnType<typeof createInMemoryDb>;

  beforeEach(() => {
    mem = createInMemoryDb();
  });

  it("fixture kaynağındaki tüm ürünleri canonical kitaba dönüştürür", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    const stats = await pipeline.run({});
    expect(stats.fetched).toBe(19);
    expect(stats.created).toBe(19);
    expect(stats.failed).toBe(0);
    expect(mem.books.size).toBe(19);
  });

  it("aynı ürün tekrar tekrar sync edildiğinde idempotenttir (duplicate oluşturmaz)", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    await pipeline.run({});
    const countAfterFirst = mem.books.size;
    await pipeline.run({});
    await pipeline.run({});
    expect(mem.books.size).toBe(countAfterFirst);
  });

  it("aynı yayıncının farklı yazımları (3D YAYINLARI / 3D Yayinlari / 3D Yayınları) tek publisher kaydına toplanır", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    await pipeline.run({});
    const threeDPublishers = Array.from(mem.publishers.values()).filter((p) => p.name === "3D Yayınları");
    expect(threeDPublishers).toHaveLength(1);
  });

  it("manuel override edilmiş zorluk bilgisini bir sonraki sync ezmiyor", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    await pipeline.run({});
    const [firstBook] = Array.from(mem.books.values());
    mem.books.set(firstBook.id, { ...firstBook, difficultyLabel: "hard", difficultyScore: 99, manualOverride: true, classificationMethod: "manual" });

    await pipeline.run({ force: true });

    const afterResync = mem.books.get(firstBook.id)!;
    expect(afterResync.difficultyLabel).toBe("hard");
    expect(afterResync.difficultyScore).toBe(99);
    expect(afterResync.classificationMethod).toBe("manual");
  });

  it("dry-run modunda hiçbir kalıcı yazma yapmaz", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    const stats = await pipeline.run({ dryRun: true });
    expect(stats.dryRun).toBe(true);
    expect(stats.fetched).toBe(19);
    expect(mem.books.size).toBe(0);
    expect(mem.publishers.size).toBe(0);
  });

  it("--limit parametresine uyar", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    const stats = await pipeline.run({ limit: 3 });
    expect(stats.fetched).toBe(3);
    expect(mem.books.size).toBe(3);
  });

  it("bozuk bir ürün tüm import'u durdurmaz, sadece o ürünü failed olarak işaretler", async () => {
    class BrokenSource implements BookSourceAdapter {
      readonly name = "broken";
      async fetchPage(page: number) {
        if (page > 0) return { products: [], hasMore: false };
        const products: RawExternalProduct[] = [
          { source: "test", sourceProductId: "", rawName: "" }, // invalid: no name, no id
          { source: "test", sourceProductId: "ok-1", rawName: "Geçerli Kitap", rawPublisher: "Test Yayınları" },
        ];
        return { products, hasMore: false };
      }
    }
    const pipeline = new ResourceCatalogImportPipeline(new BrokenSource(), mem.db, classifier);
    const stats = await pipeline.run({});
    expect(stats.fetched).toBe(2);
    expect(stats.failed).toBe(1);
    expect(stats.created).toBe(1);
  });

  it("--only-new zaten eşleşmiş ürünleri atlar", async () => {
    const pipeline = new ResourceCatalogImportPipeline(new FixtureBookSource(), mem.db, classifier);
    await pipeline.run({});
    const stats = await pipeline.run({ onlyNew: true });
    expect(stats.skipped).toBe(19);
    expect(stats.created).toBe(0);
    expect(stats.updated).toBe(0);
  });
});
