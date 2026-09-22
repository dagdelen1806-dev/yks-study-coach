import { and, asc, desc, eq, gte, inArray, isNull, like, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bookCurriculumTopics, bookInventory, bookOffers, catalogBooks, publishers, yksTopics } from "../../drizzle/schema";
import { ENV } from "../_core/env";
import type { BookType, DifficultyLabel, ExamScope } from "./types";

let _db: ReturnType<typeof drizzle> | null = null;
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

export type CatalogListFilters = {
  exam?: ExamScope;
  subject?: string;
  publisherId?: number;
  bookType?: BookType;
  difficulty?: DifficultyLabel;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  topic?: string;
};

export type CatalogListPage = { page: number; pageSize: number };

export type CatalogListItem = {
  id: number;
  name: string;
  slug: string;
  publisher: string | null;
  examScope: ExamScope;
  subject: string | null;
  bookType: BookType;
  imageUrl: string | null;
  difficultyLabel: DifficultyLabel;
  difficultyScore: number;
  difficultyConfidence: number;
  price: number | null;
  productUrl: string | null;
};

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 60;

/** Publicly-facing, filtered + paginated catalog listing. Never returns
 * internal fields (classificationMethod, manualOverride, needsReview, raw
 * metadata) — spec §31. Joins publisher + a best offer in two extra
 * IN-clause queries (not per-row) to avoid N+1. */
export async function listCatalogBooks(filters: CatalogListFilters, page: CatalogListPage): Promise<{ items: CatalogListItem[]; total: number }> {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };

  const pageSize = Math.max(1, Math.min(page.pageSize || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
  const offset = Math.max(0, (page.page - 1) * pageSize);

  const conditions = [eq(catalogBooks.active, 1)];
  if (filters.exam) conditions.push(eq(catalogBooks.examScope, filters.exam));
  if (filters.subject) conditions.push(eq(catalogBooks.subject, filters.subject));
  if (filters.publisherId) conditions.push(eq(catalogBooks.publisherId, filters.publisherId));
  if (filters.bookType) conditions.push(eq(catalogBooks.bookType, filters.bookType));
  if (filters.difficulty) conditions.push(eq(catalogBooks.difficultyLabel, filters.difficulty));
  if (filters.search) conditions.push(like(catalogBooks.name, `%${filters.search}%`));

  let bookIdsForTopic: number[] | null = null;
  if (filters.topic) {
    const topicRows = await db
      .select({ bookId: bookCurriculumTopics.bookId })
      .from(bookCurriculumTopics)
      .innerJoin(yksTopics, eq(bookCurriculumTopics.topicId, yksTopics.id))
      .where(eq(yksTopics.topic, filters.topic));
    bookIdsForTopic = topicRows.map((r) => r.bookId);
    if (bookIdsForTopic.length === 0) return { items: [], total: 0 };
    conditions.push(inArray(catalogBooks.id, bookIdsForTopic));
  }

  const where = and(...conditions);

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(catalogBooks).where(where);

  let rows = await db.select().from(catalogBooks).where(where).orderBy(desc(catalogBooks.createdAt)).limit(pageSize).offset(offset);

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const ids = rows.map((r) => r.id);
    const offerRows = ids.length ? await db.select().from(bookOffers).where(inArray(bookOffers.bookId, ids)) : [];
    const bestPriceByBook = new Map<number, number>();
    for (const offer of offerRows) {
      if (offer.price === null) continue;
      const price = Number(offer.price);
      const current = bestPriceByBook.get(offer.bookId);
      if (current === undefined || price < current) bestPriceByBook.set(offer.bookId, price);
    }
    rows = rows.filter((row) => {
      const price = bestPriceByBook.get(row.id);
      if (price === undefined) return false;
      if (filters.minPrice !== undefined && price < filters.minPrice) return false;
      if (filters.maxPrice !== undefined && price > filters.maxPrice) return false;
      return true;
    });
  }

  const publisherIds = Array.from(new Set(rows.map((r) => r.publisherId).filter((id): id is number => id !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));

  const bookIds = rows.map((r) => r.id);
  const offerRows = bookIds.length ? await db.select().from(bookOffers).where(inArray(bookOffers.bookId, bookIds)) : [];
  const offerByBook = new Map<number, { price: number | null; productUrl: string | null }>();
  for (const offer of offerRows) {
    if (!offerByBook.has(offer.bookId)) offerByBook.set(offer.bookId, { price: offer.price !== null ? Number(offer.price) : null, productUrl: offer.productUrl });
  }

  const items: CatalogListItem[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    publisher: row.publisherId ? (publisherNameById.get(row.publisherId) ?? null) : null,
    examScope: row.examScope,
    subject: row.subject,
    bookType: row.bookType,
    imageUrl: row.imageUrl,
    difficultyLabel: row.difficultyLabel,
    difficultyScore: row.difficultyScore,
    difficultyConfidence: Number(row.difficultyConfidence),
    price: offerByBook.get(row.id)?.price ?? null,
    productUrl: offerByBook.get(row.id)?.productUrl ?? null,
  }));

  return { items, total: Number(count) };
}

export async function getCatalogBookBySlug(slug: string) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db.select().from(catalogBooks).where(eq(catalogBooks.slug, slug)).limit(1);
  const book = rows[0];
  if (!book) return null;

  const [publisherRow, offerRows, topicRows] = await Promise.all([
    book.publisherId ? db.select().from(publishers).where(eq(publishers.id, book.publisherId)).limit(1) : Promise.resolve([]),
    db.select().from(bookOffers).where(eq(bookOffers.bookId, book.id)),
    db.select({ topic: yksTopics.topic, subject: yksTopics.subject, confidence: bookCurriculumTopics.confidence, isVerified: bookCurriculumTopics.isVerified }).from(bookCurriculumTopics).innerJoin(yksTopics, eq(bookCurriculumTopics.topicId, yksTopics.id)).where(eq(bookCurriculumTopics.bookId, book.id)),
  ]);

  return {
    id: book.id,
    name: book.name,
    slug: book.slug,
    description: book.description,
    publisher: publisherRow[0]?.name ?? null,
    examScope: book.examScope,
    subject: book.subject,
    bookType: book.bookType,
    imageUrl: book.imageUrl,
    difficulty: { label: book.difficultyLabel, score: book.difficultyScore, confidence: Number(book.difficultyConfidence) },
    offers: offerRows.map((o) => ({ source: o.source, price: o.price !== null ? Number(o.price) : null, currency: o.currency, stockStatus: o.stockStatus, productUrl: o.productUrl })),
    relatedTopics: topicRows.map((t) => ({ topic: t.topic, subject: t.subject, confidence: Number(t.confidence), verified: t.isVerified === 1 })),
  };
}

export async function listPublishersForFilter() {
  const db = await getDb();
  if (!db) return [];
  return db.select({ id: publishers.id, name: publishers.name }).from(publishers).where(eq(publishers.isActive, 1)).orderBy(asc(publishers.name));
}

/** Active catalog projected into the shape `recommendationService` expects,
 * including each book's verified/high-confidence curriculum topic names. */
export async function listCatalogBooksForRecommendation(subject?: string) {
  const db = await getDb();
  if (!db) return [];

  // Exam-scope compatibility (TYT_AYT/YKS/GENEL covering both exams) is
  // scoring logic, not a filter — left to `recommendationService`.
  const conditions = [eq(catalogBooks.active, 1)];
  if (subject) conditions.push(eq(catalogBooks.subject, subject));
  const rows = await db.select().from(catalogBooks).where(and(...conditions));

  const bookIds = rows.map((r) => r.id);
  const topicRows = bookIds.length
    ? await db.select({ bookId: bookCurriculumTopics.bookId, topic: yksTopics.topic }).from(bookCurriculumTopics).innerJoin(yksTopics, eq(bookCurriculumTopics.topicId, yksTopics.id)).where(inArray(bookCurriculumTopics.bookId, bookIds))
    : [];
  const topicsByBook = new Map<number, string[]>();
  for (const row of topicRows) {
    const list = topicsByBook.get(row.bookId) ?? [];
    list.push(row.topic);
    topicsByBook.set(row.bookId, list);
  }

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    subject: row.subject,
    examScope: row.examScope,
    bookType: row.bookType,
    difficultyLabel: row.difficultyLabel,
    difficultyScore: row.difficultyScore,
    difficultyConfidence: Number(row.difficultyConfidence),
    active: row.active === 1,
    mappedTopicNames: topicsByBook.get(row.id) ?? [],
  }));
}

export type LibraryCatalogBook = {
  bookId: number;
  name: string;
  publisher: string | null;
  subject: string | null;
  examScope: ExamScope;
  difficultyLabel: DifficultyLabel;
  pageCount: null; // canonical catalog doesn't track page count yet — kept for shape-compatibility with the legacy ResourceBook the client merges this into.
  topics: Array<{ topicId: number; topic: string; subject: string; isVerified: boolean; confidence: number }>;
};

/**
 * The student's owned books that came from the *new* global catalog (as
 * opposed to the legacy static `resourceBookCatalog` seed) — resolved with
 * their real curriculum topic links, so the calendar can turn "I own this
 * book" directly into "create a study session for this subject/topic"
 * without asking the student to type it in again.
 *
 * `bookInventory.bookId` is a shared varchar column used by both the legacy
 * static catalog (non-numeric ids like `book-tyt-mat-345`) and this new
 * catalog (`catalog_books.id`, always numeric) — no schema change needed to
 * tell them apart.
 */
export async function listMyLibraryCatalogBooks(userId: number): Promise<LibraryCatalogBook[]> {
  const db = await getDb();
  if (!db) return [];

  const inventoryRows = await db.select().from(bookInventory).where(and(eq(bookInventory.userId, userId), isNull(bookInventory.removedAt)));
  const numericIds = Array.from(new Set(inventoryRows.map((row) => row.bookId).filter((id) => /^\d+$/.test(id)).map(Number)));
  if (numericIds.length === 0) return [];

  const [books, topicRows] = await Promise.all([
    db.select().from(catalogBooks).where(inArray(catalogBooks.id, numericIds)),
    db
      .select({ bookId: bookCurriculumTopics.bookId, topicId: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, isVerified: bookCurriculumTopics.isVerified, confidence: bookCurriculumTopics.confidence })
      .from(bookCurriculumTopics)
      .innerJoin(yksTopics, eq(bookCurriculumTopics.topicId, yksTopics.id))
      .where(inArray(bookCurriculumTopics.bookId, numericIds)),
  ]);

  const publisherIds = Array.from(new Set(books.map((b) => b.publisherId).filter((id): id is number => id !== null)));
  const publisherRows = publisherIds.length ? await db.select().from(publishers).where(inArray(publishers.id, publisherIds)) : [];
  const publisherNameById = new Map(publisherRows.map((p) => [p.id, p.name]));

  const topicsByBook = new Map<number, LibraryCatalogBook["topics"]>();
  for (const row of topicRows) {
    const list = topicsByBook.get(row.bookId) ?? [];
    list.push({ topicId: row.topicId, topic: row.topic, subject: row.subject, isVerified: row.isVerified === 1, confidence: Number(row.confidence) });
    topicsByBook.set(row.bookId, list);
  }

  return books.map((book) => ({
    bookId: book.id,
    name: book.name,
    publisher: book.publisherId ? (publisherNameById.get(book.publisherId) ?? null) : null,
    subject: book.subject,
    examScope: book.examScope,
    difficultyLabel: book.difficultyLabel,
    pageCount: null,
    topics: topicsByBook.get(book.id) ?? [],
  }));
}
