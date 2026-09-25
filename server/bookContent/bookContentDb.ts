import { and, eq, inArray, isNull, lte, gte } from "drizzle-orm";
import { bookInventory, bookStudyLogs, catalogBooks, studentProfiles, studyPlanSessions, studyPlans, userBookContents, userResourceBooks, yksTopics } from "../../drizzle/schema";
import { CURRICULUM } from "../../shared/curriculum";
import { getDb, getTopicCatalog, getUserTopicProgress, upsertBookTopicMapping } from "../db";
import { buildBookRecommendations, pickStudyDay, type BookRecommendation, type ContentRow, type PageRange } from "./bookStudyAllocation";
import type { MatchableTopic } from "./curriculumMatcher";
import type { ContentType } from "./tocParser";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new Error("Veritabanı bağlantısı yok.");
  return db;
}

/** Eşleştirmeye aday konular: `yks_topics`'in tamamı (müfredat + eski konular),
 * müfredattaki alias'larla zenginleştirilmiş. Yeni konu buradan asla doğmaz. */
export async function getMatchableTopics(): Promise<MatchableTopic[]> {
  const catalog = await getTopicCatalog();
  const aliasesBySlug = new Map(CURRICULUM.map((def) => [def.slug, def.aliases]));
  return catalog.map((row) => ({ id: row.id, exam: row.exam, subject: row.subject, unit: row.unit, topic: row.topic, aliases: aliasesBySlug.get(row.slug) ?? [] }));
}

/** Öğrencinin rafında (aktif) olan kitap mı? İçerik yalnızca kendi kitabına yazılır/okunur. */
export async function userOwnsBook(userId: number, bookId: string): Promise<boolean> {
  const db = await requireDb();
  const [row] = await db.select({ id: bookInventory.id }).from(bookInventory).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId), isNull(bookInventory.removedAt))).limit(1);
  return Boolean(row);
}

export type SaveContentInput = {
  unitNumber: number | null;
  unitTitle: string;
  contentType: ContentType;
  label: string;
  testNumber: number | null;
  title: string;
  pageStart: number | null;
  pageEnd: number | null;
  topicId: number | null;
  mappingMethod: "exact_topic" | "exact_alias" | "contains_topic" | "contains_alias" | "fuzzy" | "manual" | "none";
  mappingConfidence: number;
};

/**
 * Öğrencinin onayladığı içindekileri kaydeder (o kitabın önceki içeriğinin
 * yerine). `topicId`'ler sunucuda yeniden doğrulanır: yalnızca var olan
 * `yks_topics` satırları kabul edilir — istemci ya da AI yeni konu yaratamaz.
 * Ardından konu başına özet (`book_topic_mappings`) güncellenir; mevcut AI
 * planı bu özeti okuduğu için kitap içeriği plana hemen yansır.
 */
export async function replaceBookContents(userId: number, bookId: string, subject: string, items: SaveContentInput[], source: "ocr" | "manual") {
  const db = await requireDb();
  const topicIds = Array.from(new Set(items.map((item) => item.topicId).filter((id): id is number => id !== null)));
  const validTopics = topicIds.length ? await db.select().from(yksTopics).where(inArray(yksTopics.id, topicIds)) : [];
  const topicById = new Map(validTopics.map((row) => [row.id, row]));
  const unknown = topicIds.filter((id) => !topicById.has(id));
  if (unknown.length) throw new Error("Geçersiz müfredat konusu seçildi. Sayfayı yenileyip tekrar dener misin?");

  const mixed = (type: ContentType) => type === "review" || type === "simulation";
  const rows = items.map((item, index) => ({
    userId,
    bookId,
    sortOrder: index + 1,
    unitNumber: item.unitNumber,
    unitTitle: item.unitTitle.slice(0, 300),
    contentType: item.contentType,
    label: item.label.slice(0, 120),
    testNumber: item.testNumber,
    title: item.title.slice(0, 300),
    pageStart: item.pageStart,
    pageEnd: item.pageEnd,
    topicId: item.topicId,
    mappingStatus: item.topicId !== null ? ("confirmed" as const) : mixed(item.contentType) ? ("not_applicable" as const) : ("unmatched" as const),
    mappingMethod: item.topicId !== null ? item.mappingMethod : ("none" as const),
    mappingConfidence: (item.topicId !== null ? Math.max(0, Math.min(1, item.mappingConfidence)) : 0).toFixed(3),
    source,
  }));

  await db.transaction(async (tx) => {
    await tx.delete(userBookContents).where(and(eq(userBookContents.userId, userId), eq(userBookContents.bookId, bookId)));
    if (rows.length) await tx.insert(userBookContents).values(rows);
  });

  // Konu başına özet: sayfa aralığı + (tek ünitedeyse) test aralığı.
  for (const topicId of topicIds) {
    const topicRows = rows.filter((row) => row.topicId === topicId);
    const pages = topicRows.flatMap((row) => [row.pageStart, row.pageEnd]).filter((value): value is number => value !== null);
    const tests = topicRows.filter((row) => row.contentType === "topic_test").map((row) => row.testNumber).filter((value): value is number => value !== null);
    const singleUnit = new Set(topicRows.map((row) => `${row.unitNumber}|${row.unitTitle}`)).size === 1;
    const topic = topicById.get(topicId)!;
    await upsertBookTopicMapping(userId, {
      bookId,
      topic: topic.topic,
      subject: topic.subject || subject,
      pageStart: pages.length ? Math.min(...pages) : null,
      pageEnd: pages.length ? Math.max(...pages) : null,
      testStart: singleUnit && tests.length ? Math.min(...tests) : null,
      testEnd: singleUnit && tests.length ? Math.max(...tests) : null,
    });
  }
  return getBookContents(userId, bookId);
}

export async function getBookContents(userId: number, bookId: string) {
  const db = await requireDb();
  const rows = await db.select().from(userBookContents).where(and(eq(userBookContents.userId, userId), eq(userBookContents.bookId, bookId))).orderBy(userBookContents.sortOrder);
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId).filter((id): id is number => id !== null)));
  const topics = topicIds.length ? await db.select({ id: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject, unit: yksTopics.unit }).from(yksTopics).where(inArray(yksTopics.id, topicIds)) : [];
  const topicById = new Map(topics.map((row) => [row.id, row]));
  return rows.map((row) => ({ ...row, mappingConfidence: Number(row.mappingConfidence), topic: row.topicId !== null ? topicById.get(row.topicId) ?? null : null }));
}

/** Rafındaki kitaplardan içeriği taranmış olanların id + özet sayıları (kütüphane kartları için). */
export async function getBookContentSummaries(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ bookId: userBookContents.bookId, topicId: userBookContents.topicId, contentType: userBookContents.contentType }).from(userBookContents).where(eq(userBookContents.userId, userId));
  const summary = new Map<string, { bookId: string; entries: number; topicIds: Set<number> }>();
  for (const row of rows) {
    const item = summary.get(row.bookId) ?? { bookId: row.bookId, entries: 0, topicIds: new Set<number>() };
    item.entries += 1;
    if (row.topicId !== null) item.topicIds.add(row.topicId);
    summary.set(row.bookId, item);
  }
  return Array.from(summary.values()).map((item) => ({ bookId: item.bookId, entries: item.entries, topicIds: Array.from(item.topicIds) }));
}

const parseRange = (value: string | null): PageRange | null => {
  const match = value?.match(/(\d+)\s*[-–]\s*(\d+)/) ?? value?.match(/^(\d+)$/);
  if (!match) return null;
  const start = Number(match[1]);
  return { pageStart: start, pageEnd: Number(match[2] ?? match[1]) };
};

/**
 * Zayıf konular (mevcut sistemin `topic_progress` sonucu: "Zayıf" ve verisi
 * yeterli) × rafındaki kitapların onaylı içeriği → öneriler. Çözülmüş
 * sayfalar `book_study_logs`'tan, zaten planlanmış olanlar bekleyen kitap
 * görevlerinden okunur; aynı test iki kez önerilmez.
 */
export async function getWeakTopicBookRecommendations(userId: number): Promise<BookRecommendation[]> {
  const db = await requireDb();
  const progress = await getUserTopicProgress(userId);
  const catalog = await getTopicCatalog();
  const idBySlug = new Map(catalog.map((row) => [row.slug, row.id]));
  const weakTopics = progress
    .filter((row) => row.status === "Zayıf" && !row.insufficientData && idBySlug.has(row.slug))
    .map((row) => ({ topicId: idBySlug.get(row.slug)!, topic: row.topic, subject: row.subject, exam: row.exam, accuracy: row.progress }));
  if (weakTopics.length === 0) return [];

  const activeBooks = (await db.select({ bookId: bookInventory.bookId }).from(bookInventory).where(and(eq(bookInventory.userId, userId), isNull(bookInventory.removedAt)))).map((row) => row.bookId);
  if (activeBooks.length === 0) return [];

  const [contentRows, logs, planned] = await Promise.all([
    db.select().from(userBookContents).where(and(eq(userBookContents.userId, userId), eq(userBookContents.mappingStatus, "confirmed"), inArray(userBookContents.bookId, activeBooks), inArray(userBookContents.topicId, weakTopics.map((topic) => topic.topicId)))),
    db.select({ bookId: bookStudyLogs.bookId, pageStart: bookStudyLogs.pageStart, pageEnd: bookStudyLogs.pageEnd }).from(bookStudyLogs).where(and(eq(bookStudyLogs.userId, userId), inArray(bookStudyLogs.bookId, activeBooks))),
    db.select({ bookId: studyPlanSessions.sourceBookId, targetPages: studyPlanSessions.targetPages }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), inArray(studyPlanSessions.sourceBookId, activeBooks))),
  ]);

  const donePages: Record<string, PageRange[]> = {};
  for (const log of logs) if (log.pageStart !== null) (donePages[log.bookId] ??= []).push({ pageStart: log.pageStart, pageEnd: log.pageEnd ?? log.pageStart });
  const scheduledPages: Record<string, PageRange[]> = {};
  for (const session of planned) { const range = parseRange(session.targetPages); if (session.bookId && range) (scheduledPages[session.bookId] ??= []).push(range); }

  const contents: ContentRow[] = contentRows.map((row) => ({ id: row.id, bookId: row.bookId, sortOrder: row.sortOrder, unitNumber: row.unitNumber, unitTitle: row.unitTitle, contentType: row.contentType, label: row.label, testNumber: row.testNumber, pageStart: row.pageStart, pageEnd: row.pageEnd, topicId: row.topicId, mappingConfidence: Number(row.mappingConfidence) }));
  return buildBookRecommendations({ weakTopics, contents, donePages, scheduledPages });
}

/** Sunucunun bildiği kitap adı (öğrencinin eklediği ya da katalog kitabı); statik vitrin kitaplarında istemcinin gönderdiği ad kullanılır. */
async function resolveBookTitle(db: Db, userId: number, bookId: string, fallback: string) {
  const [custom] = await db.select({ title: userResourceBooks.title }).from(userResourceBooks).where(and(eq(userResourceBooks.userId, userId), eq(userResourceBooks.bookId, bookId))).limit(1);
  if (custom) return custom.title;
  if (/^\d+$/.test(bookId)) {
    const [catalogBook] = await db.select({ name: catalogBooks.name }).from(catalogBooks).where(eq(catalogBooks.id, Number(bookId))).limit(1);
    if (catalogBook) return catalogBook.name;
  }
  return fallback.slice(0, 120) || "Kitap";
}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

/**
 * Bir öneriyi çalışma planına "kitap görevi" olarak ekler. Öneri sunucuda
 * YENİDEN hesaplanır (istemcinin gönderdiği sayfa/test aralığına güvenilmez);
 * `when: "today"` bugüne, `"auto"` kapasitesi uygun ilk güne koyar. Görev,
 * o haftayı kapsayan mevcut plana eklenir; yoksa küçük bir "Kitap görevleri"
 * planı açılır — mevcut plan silinmez/ezilmez. Aynı sayfalar zaten planlıysa
 * öneri listesinde bulunmaz, yani aynı görev ikinci kez oluşmaz.
 */
export async function addRecommendationToPlan(userId: number, input: { topicId: number; bookId: string; bookTitle: string; when: "today" | "auto" }) {
  const db = await requireDb();
  if (!(await userOwnsBook(userId, input.bookId))) throw new Error("Bu kitap kütüphanende bulunmuyor.");
  const recommendation = (await getWeakTopicBookRecommendations(userId)).find((rec) => rec.topicId === input.topicId && rec.bookId === input.bookId);
  if (!recommendation) throw new Error("Bu öneri artık geçerli değil (testler çözülmüş ya da zaten planlanmış olabilir).");

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  let date = isoDate(today);
  if (input.when === "auto") {
    const horizonEnd = new Date(today.getTime() + 7 * 86_400_000);
    const [profile] = await db.select({ daily: studentProfiles.dailyStudyDuration }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
    const sessions = await db.select({ sessionDate: studyPlanSessions.sessionDate, minutes: studyPlanSessions.plannedMinutes, sourceBookId: studyPlanSessions.sourceBookId }).from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), gte(studyPlanSessions.sessionDate, today), lte(studyPlanSessions.sessionDate, horizonEnd)));
    const picked = pickStudyDay({ today: date, minutes: recommendation.minutes, dailyCapacity: profile?.daily ?? 120, load: sessions.map((session) => ({ date: isoDate(new Date(session.sessionDate)), minutes: session.minutes, isBook: Boolean(session.sourceBookId) })) });
    if (!picked) throw new Error("Önümüzdeki 7 günde bu görev için yer yok — planın dolu. \"Bugün çalış\" ile yine de ekleyebilirsin.");
    date = picked;
  }

  const sessionDate = new Date(`${date}T12:00:00Z`);
  const [plan] = await db.select({ id: studyPlans.id }).from(studyPlans).where(and(eq(studyPlans.userId, userId), lte(studyPlans.weekStart, sessionDate), gte(studyPlans.weekEnd, sessionDate))).orderBy(studyPlans.createdAt).limit(1);
  let planId = plan?.id;
  if (!planId) {
    const weekStart = new Date(`${date}T00:00:00Z`);
    const weekEnd = new Date(weekStart.getTime() + 6 * 86_400_000 + 86_399_000);
    const result = await db.insert(studyPlans).values({ userId, title: "Kitap görevleri", weekStart, weekEnd, summary: "Zayıf konular için kitaplarından önerilen görevler.", source: "manual" });
    planId = Number(result[0].insertId);
  }

  const bookTitle = await resolveBookTitle(db, userId, input.bookId, input.bookTitle);
  const unitPart = recommendation.unitNumber !== null ? `Ünite ${recommendation.unitNumber}` : recommendation.unitTitle;
  const testPart = recommendation.testRange ? `Test ${recommendation.testRange}` : recommendation.labels.join(", ");
  const title = `${bookTitle} — ${unitPart} — ${testPart}`.slice(0, 180);
  const targetPages = recommendation.pageStart !== null ? `${recommendation.pageStart}-${recommendation.pageEnd ?? recommendation.pageStart}` : null;

  await db.insert(studyPlanSessions).values({
    planId,
    userId,
    sessionDate,
    title,
    subject: recommendation.subject,
    // Tam müfredat adı: tamamlanınca completeStudySession → upsertTopicProgress
    // aynı yks_topics satırını günceller, zayıflık mevcut sistemce yeniden hesaplanır.
    topic: recommendation.topic,
    kind: "Soru",
    plannedMinutes: recommendation.minutes,
    targetPages,
    targetTests: recommendation.testRange,
    sourceBookId: input.bookId,
  });
  return { date, title, minutes: recommendation.minutes };
}
