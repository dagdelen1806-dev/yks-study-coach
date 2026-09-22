import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bookCurriculumTopics, bookOffers, catalogBooks, externalBookSources, publishers, resourceCatalogSyncLogs, yksTopics } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import type { CurriculumTopicCandidate } from "./curriculumMapper";
import type { CatalogBookRow, CatalogDbPort, DifficultyPatch, PublisherRow, UpsertCatalogBookInput } from "./pipeline/types";

let _db: ReturnType<typeof drizzle> | null = null;

// Same lazy-connect pattern as `server/db.ts` so local tooling / dry runs
// keep working without a DATABASE_URL.
async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn("[ResourceCatalog] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

const toCatalogBookRow = (row: typeof catalogBooks.$inferSelect): CatalogBookRow => ({
  id: row.id,
  isbn: row.isbn,
  publisherId: row.publisherId,
  name: row.name,
  editionYear: row.editionYear,
  slug: row.slug,
  bookType: row.bookType,
  examScope: row.examScope,
  subject: row.subject,
  imageUrl: row.imageUrl,
  description: row.description,
  active: row.active === 1,
  manualOverride: row.manualOverride === 1,
  difficultyLabel: row.difficultyLabel,
  difficultyScore: row.difficultyScore,
  difficultyConfidence: Number(row.difficultyConfidence),
  classificationMethod: row.classificationMethod,
});

/** Real, Drizzle/MySQL-backed implementation of `CatalogDbPort` — the only
 * place SQL for the Resource Catalog tables is written. Every method is a
 * no-op-safe empty/undefined when `DATABASE_URL` isn't configured, matching
 * the rest of the project's "works without a DB for local tooling" convention. */
export const catalogDb: CatalogDbPort = {
  async findPublisherByNormalizedName(normalizedName) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(publishers).where(eq(publishers.normalizedName, normalizedName)).limit(1);
    return rows[0] ? { id: rows[0].id, name: rows[0].name, slug: rows[0].slug, normalizedName: rows[0].normalizedName } : null;
  },

  async createPublisher(input) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(publishers).values(input);
    const id = Number(result[0].insertId);
    return { id, ...input } satisfies PublisherRow;
  },

  async findExternalSource(source, sourceProductId) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(externalBookSources).where(and(eq(externalBookSources.source, source), eq(externalBookSources.sourceProductId, sourceProductId))).limit(1);
    return rows[0] ? { id: rows[0].id, source: rows[0].source, sourceProductId: rows[0].sourceProductId, matchedBookId: rows[0].matchedBookId, syncStatus: rows[0].syncStatus } : null;
  },

  async upsertExternalSource(row) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const existing = await db.select().from(externalBookSources).where(and(eq(externalBookSources.source, row.source), eq(externalBookSources.sourceProductId, row.sourceProductId))).limit(1);
    const values = {
      source: row.source,
      sourceProductId: row.sourceProductId,
      sourceUrl: row.sourceUrl,
      rawName: row.rawName,
      rawDescription: row.rawDescription,
      rawPrice: row.rawPrice !== null ? String(row.rawPrice) : null,
      rawCurrency: row.rawCurrency,
      rawImageUrl: row.rawImageUrl,
      rawPublisher: row.rawPublisher,
      rawCategory: row.rawCategory,
      rawIsbn: row.rawIsbn,
      rawMetadata: row.rawMetadata ? JSON.stringify(row.rawMetadata) : null,
    };
    if (existing[0]) {
      await db.update(externalBookSources).set(values).where(eq(externalBookSources.id, existing[0].id));
      return { id: existing[0].id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: existing[0].matchedBookId, syncStatus: existing[0].syncStatus };
    }
    const result = await db.insert(externalBookSources).values(values);
    const id = Number(result[0].insertId);
    return { id, source: row.source, sourceProductId: row.sourceProductId, matchedBookId: null, syncStatus: "pending" };
  },

  async markExternalSourceOutcome(id, patch) {
    const db = await getDb();
    if (!db) return;
    await db
      .update(externalBookSources)
      .set({ matchedBookId: patch.matchedBookId, syncStatus: patch.syncStatus, lastSyncedAt: new Date(), errorMessage: patch.errorMessage ?? null })
      .where(eq(externalBookSources.id, id));
  },

  async findCatalogBookByIsbn(isbn) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq(catalogBooks.isbn, isbn)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },

  async listCatalogBooksByPublisher(publisherId) {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(catalogBooks).where(eq(catalogBooks.publisherId, publisherId));
    return rows.map((row) => ({ id: row.id, isbn: row.isbn, publisherId: row.publisherId, name: row.name, editionYear: row.editionYear }));
  },

  async getCatalogBookById(id) {
    const db = await getDb();
    if (!db) return null;
    const rows = await db.select().from(catalogBooks).where(eq(catalogBooks.id, id)).limit(1);
    return rows[0] ? toCatalogBookRow(rows[0]) : null;
  },

  async createCatalogBook(input: UpsertCatalogBookInput) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const result = await db.insert(catalogBooks).values({
      publisherId: input.publisherId,
      name: input.name,
      slug: input.slug,
      isbn: input.isbn,
      editionYear: input.editionYear,
      description: input.description,
      imageUrl: input.imageUrl,
      bookType: input.bookType,
      examScope: input.examScope,
      subject: input.subject,
      metadata: input.metadata ? JSON.stringify(input.metadata) : null,
    });
    const id = Number(result[0].insertId);
    const row = await this.getCatalogBookById(id);
    if (!row) throw new Error("Failed to read back created catalog book");
    return row;
  },

  async updateCatalogBook(id, patch) {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const values: Record<string, unknown> = {};
    if (patch.publisherId !== undefined) values.publisherId = patch.publisherId;
    if (patch.name !== undefined) values.name = patch.name;
    if (patch.isbn !== undefined) values.isbn = patch.isbn;
    if (patch.editionYear !== undefined) values.editionYear = patch.editionYear;
    if (patch.description !== undefined) values.description = patch.description;
    if (patch.imageUrl !== undefined) values.imageUrl = patch.imageUrl;
    if (patch.bookType !== undefined) values.bookType = patch.bookType;
    if (patch.examScope !== undefined) values.examScope = patch.examScope;
    if (patch.subject !== undefined) values.subject = patch.subject;
    if (patch.metadata !== undefined) values.metadata = patch.metadata ? JSON.stringify(patch.metadata) : null;
    if (Object.keys(values).length > 0) {
      await db.update(catalogBooks).set(values).where(eq(catalogBooks.id, id));
    }
    const row = await this.getCatalogBookById(id);
    if (!row) throw new Error(`Catalog book ${id} not found after update`);
    return row;
  },

  async updateCatalogBookDifficulty(id, patch: DifficultyPatch) {
    const db = await getDb();
    if (!db) return;
    await db
      .update(catalogBooks)
      .set({
        difficultyScore: patch.difficultyScore,
        difficultyLabel: patch.difficultyLabel,
        difficultyConfidence: String(patch.difficultyConfidence),
        classificationMethod: patch.classificationMethod,
        needsReview: patch.needsReview ? 1 : 0,
        classifiedAt: patch.classifiedAt,
      })
      .where(eq(catalogBooks.id, id));
  },

  async upsertBookOffer(input) {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select().from(bookOffers).where(and(eq(bookOffers.bookId, input.bookId), eq(bookOffers.source, input.source))).limit(1);
    const values = { price: input.price !== null ? String(input.price) : null, currency: input.currency, productUrl: input.productUrl, lastSyncedAt: new Date() };
    if (existing[0]) {
      await db.update(bookOffers).set(values).where(eq(bookOffers.id, existing[0].id));
    } else {
      await db.insert(bookOffers).values({ bookId: input.bookId, source: input.source, ...values });
    }
  },

  async listCurriculumTopics(): Promise<CurriculumTopicCandidate[]> {
    const db = await getDb();
    if (!db) return [];
    const rows = await db.select().from(yksTopics);
    return rows.map((row) => ({ id: row.id, exam: row.exam, subject: row.subject, topic: row.topic, unit: row.unit }));
  },

  async upsertBookCurriculumMapping(input) {
    const db = await getDb();
    if (!db) return;
    const existing = await db.select().from(bookCurriculumTopics).where(and(eq(bookCurriculumTopics.bookId, input.bookId), eq(bookCurriculumTopics.topicId, input.topicId))).limit(1);
    if (existing[0]) {
      if (existing[0].isVerified === 1) return; // never downgrade an admin-verified mapping automatically
      await db.update(bookCurriculumTopics).set({ confidence: String(input.confidence), mappingMethod: "rule" }).where(eq(bookCurriculumTopics.id, existing[0].id));
    } else {
      await db.insert(bookCurriculumTopics).values({ bookId: input.bookId, topicId: input.topicId, confidence: String(input.confidence), mappingMethod: "rule" });
    }
  },

  async createSyncLog(input) {
    const db = await getDb();
    if (!db) return { id: -1 };
    const result = await db.insert(resourceCatalogSyncLogs).values({ source: input.source, startedAt: input.startedAt, dryRun: input.dryRun ? 1 : 0, triggeredBy: input.triggeredBy });
    return { id: Number(result[0].insertId) };
  },

  async finishSyncLog(id, patch) {
    if (id < 0) return;
    const db = await getDb();
    if (!db) return;
    await db
      .update(resourceCatalogSyncLogs)
      .set({
        finishedAt: patch.finishedAt,
        fetched: patch.fetched,
        created: patch.created,
        updated: patch.updated,
        skipped: patch.skipped,
        failed: patch.failed,
        needsReview: patch.needsReview,
        statsJson: patch.statsJson,
        errorLog: patch.errorLog,
      })
      .where(eq(resourceCatalogSyncLogs.id, id));
  },
};

// Re-exported for admin read endpoints (list publishers / sync logs / needs-review queue).
export async function listResourceCatalogSyncLogs(limit = 20) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(resourceCatalogSyncLogs).orderBy(resourceCatalogSyncLogs.id).limit(limit);
}

export async function listNeedsReviewBooks() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(catalogBooks).where(eq(catalogBooks.needsReview, 1));
}

export async function getCatalogBooksByIds(ids: number[]) {
  const db = await getDb();
  if (!db || ids.length === 0) return [];
  return db.select().from(catalogBooks).where(inArray(catalogBooks.id, ids));
}

/** Admin "Change Difficulty" action (spec §19/§47). Always sets
 * `manualOverride = true` — from this point on, automatic sync must never
 * silently overwrite it (enforced in the pipeline via `book.manualOverride`). */
export async function setManualDifficulty(bookId: number, input: { label: "easy" | "medium" | "hard"; score: number }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db
    .update(catalogBooks)
    .set({ difficultyLabel: input.label, difficultyScore: input.score, difficultyConfidence: "1", classificationMethod: "manual", manualOverride: 1, needsReview: 0, classifiedAt: new Date() })
    .where(eq(catalogBooks.id, bookId));
}

/** Admin "Approve" action — confirms the current (auto) classification is fine. */
export async function approveCatalogBookClassification(bookId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: 0 }).where(eq(catalogBooks.id, bookId));
}

/** Admin "Mark Needs Review" action. */
export async function markCatalogBookNeedsReview(bookId: number, needsReview: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(catalogBooks).set({ needsReview: needsReview ? 1 : 0 }).where(eq(catalogBooks.id, bookId));
}
