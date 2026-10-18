import { and, count, desc, eq } from "drizzle-orm";
import { readingBooks } from "../../drizzle/schema";
import { MAX_READING_BOOKS, applyReadingProgress, type ReadingBook } from "../../shared/reading";
import { getDb } from "../db";

// Okuma kitapları veri katmanı. Her sorgu userId ile kapsamlıdır.

export class ReadingError extends Error {}

const columns = { id: readingBooks.id, title: readingBooks.title, author: readingBooks.author, totalPages: readingBooks.totalPages, pagesRead: readingBooks.pagesRead, status: readingBooks.status, finishedAt: readingBooks.finishedAt };

export async function listReadingBooks(userId: number): Promise<ReadingBook[]> {
  const db = await getDb();
  if (!db) return [];
  // Okunmakta olanlar önce, sonra bitenler; her grupta en yeni üstte.
  const rows = await db.select(columns).from(readingBooks).where(eq(readingBooks.userId, userId)).orderBy(desc(readingBooks.updatedAt));
  return [...rows.filter((row) => row.status === "reading"), ...rows.filter((row) => row.status === "finished")];
}

export async function addReadingBook(userId: number, input: { title: string; author?: string | null; totalPages?: number | null }): Promise<ReadingBook> {
  const db = await getDb();
  if (!db) throw new ReadingError("Veritabanına ulaşılamadı.");
  const [{ total }] = await db.select({ total: count() }).from(readingBooks).where(eq(readingBooks.userId, userId));
  if (total >= MAX_READING_BOOKS) throw new ReadingError(`En fazla ${MAX_READING_BOOKS} okuma kitabı eklenebilir.`);
  const result = await db.insert(readingBooks).values({ userId, title: input.title.trim(), author: input.author?.trim() || null, totalPages: input.totalPages || null });
  const [row] = await db.select(columns).from(readingBooks).where(and(eq(readingBooks.id, Number(result[0].insertId)), eq(readingBooks.userId, userId))).limit(1);
  return row;
}

export async function updateReadingBook(userId: number, id: number, patch: { status?: "reading" | "finished"; totalPages?: number | null }): Promise<ReadingBook> {
  const db = await getDb();
  if (!db) throw new ReadingError("Veritabanına ulaşılamadı.");
  const values: Partial<typeof readingBooks.$inferInsert> = {};
  if (patch.totalPages !== undefined) values.totalPages = patch.totalPages || null;
  if (patch.status) { values.status = patch.status; values.finishedAt = patch.status === "finished" ? new Date() : null; }
  if (Object.keys(values).length) await db.update(readingBooks).set(values).where(and(eq(readingBooks.id, id), eq(readingBooks.userId, userId)));
  const [row] = await db.select(columns).from(readingBooks).where(and(eq(readingBooks.id, id), eq(readingBooks.userId, userId))).limit(1);
  if (!row) throw new ReadingError("Kitap bulunamadı.");
  return row;
}

export async function removeReadingBook(userId: number, id: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(readingBooks).where(and(eq(readingBooks.id, id), eq(readingBooks.userId, userId)));
}

/** Gece okuması kaydı: okunan sayfaları kitabın ilerlemesine ekler. Başkasının kitabıysa null döner (kayıt yine de alınır). */
export async function recordReadingPages(userId: number, id: number, pages: number): Promise<(ReadingBook & { justFinished: boolean }) | null> {
  const db = await getDb();
  if (!db) return null;
  const [book] = await db.select(columns).from(readingBooks).where(and(eq(readingBooks.id, id), eq(readingBooks.userId, userId))).limit(1);
  if (!book) return null;
  const next = applyReadingProgress(book, pages);
  await db.update(readingBooks).set({ pagesRead: next.pagesRead, status: next.status, ...(next.justFinished ? { finishedAt: new Date() } : {}) }).where(and(eq(readingBooks.id, id), eq(readingBooks.userId, userId)));
  return { ...book, pagesRead: next.pagesRead, status: next.status, justFinished: next.justFinished };
}
