import { and, desc, eq, isNull, or, sql, ilike } from "drizzle-orm";
import { bookInventory, sharedBooks, userResourceBooks } from "../../drizzle/schema";
import { isSameBook, normalizeBookText, normalizeIsbn } from "../../shared/bookIdentity";
import type { ExamKind } from "../../shared/exams";
import { addBookToInventory, getDb } from "../db";
import { replaceBookContents, type SaveContentInput } from "./bookContentDb";

/**
 * Ortak kitap kaydı (shared_books). Öğrenci kütüphanesine kitap eklediğinde kitap burada da
 * kaydedilir; aynı kitabı ekleyen sonraki öğrenciye "Bu kitabı mı eklemek istiyorsun?" diye
 * sorulur. Onaylarsa ilk öğrencinin onayladığı içindekiler kopyalanır — kapak ve içindekiler
 * fotoğrafı yeniden okunmaz (OCR maliyeti). Kayıtta öğrenci verisi yoktur: kitap kimliği ve
 * içindekiler (ünite/test/sayfa/konu eşleşmesi). Öğrencinin kendi kopyası her zaman düzeltilebilir.
 */

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok.");
  return db;
}

export type SharedBookDraft = { title: string; publisher: string; subject: string; exam: ExamKind; authors?: string | null; isbn?: string | null; edition?: string | null };
export type SharedBookMatch = { id: number; title: string; publisher: string; subject: string; exam: ExamKind; authors: string | null; isbn: string | null; edition: string | null; ownerCount: number; contentsItemCount: number; contentsTopicCount: number; score: number; exact: boolean };

/** İçindekiler en az bu kadar satırsa ve en az bir konu eşleşmişse ortak kayda alınır. */
export const SHARED_CONTENTS_MIN_ITEMS = 3;
const MATCH_MIN_SCORE = 0.6;
const SEARCH_MIN_SCORE = 0.5;

const tokensOf = (value: string) => normalizeBookText(value).split(" ").filter((token) => token.length >= 2);
// OCR ve yazım farkı ("Problemleri"/"Problemler", "0dan"/"0 dan") tolere edilsin: ilk 5 harf yeter.
const sameToken = (a: string, b: string) => a === b || (a.length >= 4 && b.length >= 4 && a.slice(0, 5) === b.slice(0, 5));
const covered = (tokens: string[], pool: string[]) => tokens.filter((token) => pool.some((other) => sameToken(token, other))).length;
// "3D Yayınları" ile "Limit Yayınları" yalnızca "yayınları" kelimesi yüzünden aynı sayılmasın.
const GENERIC_PUBLISHER_WORDS = new Set(["yayin", "yayinlari", "yayinevi", "yayincilik", "yayinlar", "yay", "kitap", "kitaplari", "akademi"]);
const publisherTokens = (value: string) => tokensOf(value).filter((token) => !GENERIC_PUBLISHER_WORDS.has(token));

// Başlıktaki sayılar (cilt, yıl, deneme no: "TYT Deneme 10" / "Deneme 12") kitabı ayırır: tam eşleşmeli.
const numbersOf = (tokens: string[]) => tokens.filter((token) => /^\d+$/.test(token));
const sameNumbers = (a: string[], b: string[]) => { const x = numbersOf(a), y = numbersOf(b); return x.length === y.length && x.every((value) => y.includes(value)); };

/** Kapaktan okunan kitaba benzerlik: ad tokenlarının Dice benzerliği + aynı yayınevi bonusu; ISBN eşitse kesin. */
export function scoreSharedBook(draft: Pick<SharedBookDraft, "title" | "publisher" | "isbn">, row: { title: string; publisher: string; isbn: string | null }): number {
  const isbnA = normalizeIsbn(draft.isbn), isbnB = normalizeIsbn(row.isbn);
  if (isbnA && isbnB) return isbnA === isbnB ? 1 : 0;
  const a = tokensOf(draft.title), b = tokensOf(row.title);
  if (!a.length || !b.length || !sameNumbers(a, b)) return 0;
  const dice = (covered(a, b) + covered(b, a)) / (a.length + b.length);
  const publisherA = publisherTokens(draft.publisher), publisherB = publisherTokens(row.publisher);
  const publisher = !publisherA.length || !publisherB.length ? 0 : covered(publisherA, publisherB) > 0 ? 0.15 : -0.2;
  return Math.max(0, Math.min(1, dice + publisher));
}

const toMatch = (row: typeof sharedBooks.$inferSelect, score: number, exact: boolean): SharedBookMatch => ({ id: row.id, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, authors: row.authors, isbn: row.isbn, edition: row.edition, ownerCount: row.ownerCount, contentsItemCount: row.contentsItemCount, contentsTopicCount: row.contentsTopicCount, score: Math.round(score * 100) / 100, exact });

/** Ad tokenlarından birini içeren kayıtlar (en uzun 3 token; çok sık kullanılan kitap önce). */
async function candidatesFor(db: Db, title: string, isbn: string | null) {
  const tokens = tokensOf(title).filter((token) => token.length >= 3).sort((a, b) => b.length - a.length).slice(0, 3);
  const conditions = [...tokens.map((token) => ilike(sharedBooks.titleKey, `%${token.slice(0, 5)}%`)), ...(isbn ? [eq(sharedBooks.isbn, isbn)] : [])];
  if (!conditions.length) return [];
  return db.select().from(sharedBooks).where(or(...conditions)).orderBy(desc(sharedBooks.ownerCount)).limit(100);
}

/** Kapaktan okunan (ya da elle yazılan) kitaba benzeyen ortak kayıtlar, en olası önce. */
export async function findSharedBookMatches(draft: Pick<SharedBookDraft, "title" | "publisher" | "isbn" | "authors">, limit = 3): Promise<SharedBookMatch[]> {
  const db = await requireDb();
  const rows = await candidatesFor(db, draft.title, normalizeIsbn(draft.isbn));
  return rows
    .map((row) => ({ row, score: scoreSharedBook(draft, row), exact: isSameBook(draft, row) }))
    .filter((item) => item.exact || item.score >= MATCH_MIN_SCORE)
    .sort((a, b) => Number(b.exact) - Number(a.exact) || b.score - a.score || b.row.ownerCount - a.row.ownerCount)
    .slice(0, limit)
    .map((item) => toMatch(item.row, item.exact ? Math.max(item.score, 0.95) : item.score, item.exact));
}

/** "Kitabını ara": fotoğraf çekmeden ad (ve istenirse yayınevi) yazarak ortak kayıtta arama. */
export async function searchSharedBooks(query: string, limit = 8): Promise<SharedBookMatch[]> {
  const db = await requireDb();
  const queryTokens = tokensOf(query);
  if (!queryTokens.length) return [];
  const isbn = normalizeIsbn(query);
  const rows = await candidatesFor(db, query, isbn);
  return rows
    .map((row) => {
      if (isbn && row.isbn === isbn) return { row, score: 1 };
      const pool = [...tokensOf(row.title), ...tokensOf(row.publisher)];
      // Aramadaki sayı (ör. "deneme 10") kitapta birebir geçmeli; "deneme 12" önerilmez.
      if (numbersOf(queryTokens).some((value) => !pool.includes(value))) return { row, score: 0 };
      return { row, score: covered(queryTokens, pool) / queryTokens.length };
    })
    .filter((item) => item.score >= SEARCH_MIN_SCORE)
    .sort((a, b) => b.score - a.score || b.row.ownerCount - a.row.ownerCount)
    .slice(0, limit)
    .map((item) => toMatch(item.row, item.score, item.score === 1));
}

/** Aynı kitap kayıtlıysa onu (sahip sayısını artırarak), yoksa yeni ortak kaydı döndürür. */
async function registerSharedBook(db: Db, userId: number, draft: SharedBookDraft) {
  const isbn = normalizeIsbn(draft.isbn);
  const existing = (await candidatesFor(db, draft.title, isbn)).find((row) => isSameBook({ ...draft, isbn }, row));
  if (existing) return existing;
  const [created] = await db.insert(sharedBooks).values({
    title: draft.title.trim().slice(0, 180),
    publisher: draft.publisher.trim().slice(0, 120) || "Yayınevi belirtilmemiş",
    subject: draft.subject.trim().slice(0, 80) || "Genel",
    exam: draft.exam,
    authors: draft.authors?.trim().slice(0, 300) || null,
    isbn,
    edition: draft.edition?.trim().slice(0, 120) || null,
    titleKey: normalizeBookText(draft.title).slice(0, 200),
    publisherKey: normalizeBookText(draft.publisher).slice(0, 140),
    ownerCount: 0,
    createdByUserId: userId,
  }).returning();
  return created;
}

type StoredContents = { subject: string; items: SaveContentInput[] };

export type AddedBook = { id: string; title: string; publisher: string; subject: string; exam: ExamKind; level: "Kolay" | "Orta" | "Zor"; format: string; reason: string; sourceUrl: string; tone: string; authors?: string; isbn?: string; sharedBookId: number };

/**
 * Kütüphaneye kitap ekler ve ortak kayda bağlar. `sharedBookId` verilmişse öğrenci "Bu kitap"
 * demiştir: kimlik o kayıttan alınır ve istenirse içindekiler kopyalanır (OCR yok).
 * Öğrenci aynı ortak kitabı zaten rafında tutuyorsa yenisi açılmaz, mevcut kitabı döner.
 */
export async function addBookToLibrary(userId: number, input: { sharedBookId?: number | null; draft: SharedBookDraft & { level: "Kolay" | "Orta" | "Zor" }; useSharedContents: boolean }): Promise<{ book: AddedBook; contentsCopied: number; topicCount: number; alreadyOwned: boolean }> {
  const db = await requireDb();
  let shared: typeof sharedBooks.$inferSelect;
  if (input.sharedBookId) {
    const [row] = await db.select().from(sharedBooks).where(eq(sharedBooks.id, input.sharedBookId)).limit(1);
    if (!row) throw new Error("Seçilen kitap bulunamadı. Kapağı fotoğrafla ekleyebilirsin.");
    shared = row;
  } else {
    shared = await registerSharedBook(db, userId, input.draft);
  }

  const [owned] = await db.select().from(userResourceBooks)
    .innerJoin(bookInventory, and(eq(bookInventory.userId, userResourceBooks.userId), eq(bookInventory.bookId, userResourceBooks.bookId), isNull(bookInventory.removedAt)))
    .where(and(eq(userResourceBooks.userId, userId), eq(userResourceBooks.sharedBookId, shared.id))).limit(1);
  if (owned) return { book: asAddedBook(owned.user_resource_books, shared.id), contentsCopied: 0, topicCount: 0, alreadyOwned: true };

  const identity = input.sharedBookId ? { title: shared.title, publisher: shared.publisher, subject: shared.subject, exam: shared.exam, authors: shared.authors, isbn: shared.isbn, edition: shared.edition } : input.draft;
  const edition = identity.edition?.trim();
  const bookId = `photo-book-${Date.now()}`;
  const [row] = await db.insert(userResourceBooks).values({
    userId,
    bookId,
    title: identity.title.trim().slice(0, 180),
    publisher: identity.publisher.trim().slice(0, 120) || "Yayınevi belirtilmemiş",
    subject: identity.subject.trim().slice(0, 80) || "Genel",
    exam: identity.exam,
    level: input.draft.level,
    format: "Kaynak",
    reason: `Öğrencinin kendi kütüphanesinden${input.sharedBookId ? ", ortak kitap kaydından" : ", fotoğrafla"} eklendi.${edition ? ` Baskı: ${edition}.` : ""}`,
    tone: "blue",
    authors: identity.authors?.trim() || null,
    isbn: normalizeIsbn(identity.isbn),
    sharedBookId: shared.id,
  }).returning();
  await addBookToInventory(userId, bookId);
  await db.update(sharedBooks).set({ ownerCount: sql`${sharedBooks.ownerCount} + 1` }).where(eq(sharedBooks.id, shared.id));

  let contentsCopied = 0, topicCount = 0;
  if (input.useSharedContents && shared.contentsJson) {
    try {
      const stored = JSON.parse(shared.contentsJson) as StoredContents;
      await replaceBookContents(userId, bookId, stored.subject || row.subject, stored.items, shared.contentsSource ?? "ocr");
      contentsCopied = stored.items.length;
      topicCount = shared.contentsTopicCount;
      await db.update(sharedBooks).set({ contentsReuseCount: sql`${sharedBooks.contentsReuseCount} + 1` }).where(eq(sharedBooks.id, shared.id));
    } catch (error) {
      // Konu listesi değişmiş olabilir: kitap yine eklenir, öğrenci içindekileri tarar.
      console.warn("[shared books] contents reuse failed:", error instanceof Error ? error.message : error);
    }
  }
  return { book: asAddedBook(row, shared.id), contentsCopied, topicCount, alreadyOwned: false };
}

function asAddedBook(row: typeof userResourceBooks.$inferSelect, sharedBookId: number): AddedBook {
  return { id: row.bookId, title: row.title, publisher: row.publisher, subject: row.subject, exam: row.exam, level: row.level, format: row.format, reason: row.reason, sourceUrl: row.sourceUrl ?? "", tone: row.tone, authors: row.authors ?? undefined, isbn: row.isbn ?? undefined, sharedBookId };
}

/**
 * Öğrencinin onayladığı içindekiler, kitabın ortak kaydında içerik yoksa oraya da yazılır (ilk
 * onaylanan geçerli; sonradan gelen öğrencinin düzeltmesi yalnızca kendi kopyasını değiştirir).
 * Konu eşleşmesi olmayan ya da çok kısa liste paylaşılmaz.
 */
export async function shareBookContents(userId: number, bookId: string, subject: string, items: SaveContentInput[], source: "ocr" | "manual"): Promise<boolean> {
  const topicCount = new Set(items.map((item) => item.topicId).filter((id) => id !== null)).size;
  if (items.length < SHARED_CONTENTS_MIN_ITEMS || topicCount === 0) return false;
  const db = await requireDb();
  const [own] = await db.select({ sharedBookId: userResourceBooks.sharedBookId }).from(userResourceBooks).where(and(eq(userResourceBooks.userId, userId), eq(userResourceBooks.bookId, bookId))).limit(1);
  if (!own?.sharedBookId) return false;
  const contentsJson = JSON.stringify({ subject, items } satisfies StoredContents);
  const updated = await db.update(sharedBooks)
    .set({ contentsJson, contentsItemCount: items.length, contentsTopicCount: topicCount, contentsSource: source, contentsByUserId: userId, contentsUpdatedAt: new Date() })
    .where(and(eq(sharedBooks.id, own.sharedBookId), eq(sharedBooks.contentsItemCount, 0)))
    .returning({ id: sharedBooks.id });
  return updated.length > 0;
}
