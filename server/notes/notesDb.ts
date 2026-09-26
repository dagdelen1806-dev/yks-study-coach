import { and, desc, eq, gte, inArray, isNotNull, like, lt, lte, or, sql, type SQL } from "drizzle-orm";
import { bookInventory, catalogBooks, noteTags, notes, studyPlanSessions, userBookContents, userMockExams, userResourceBooks, yksTopics } from "../../drizzle/schema";
import { computeNoteStats, deriveNoteTitle, extractPlainText, isValidNoteDoc, normalizeTag, type NoteDoc, type NoteNode, type NoteStats } from "../../shared/noteContent";
import { getDb } from "../db";
import { insertPlanTask, pickDayForTask } from "../studyPlan/planTasks";
import { getAttachmentStorage } from "./attachmentStorage";
import { notesConfig } from "./config";

export class NoteError extends Error {}

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new NoteError("Veritabanı bağlantısı yok.");
  return db;
}

export type NoteLinks = { subject?: string | null; topicId?: number | null; bookId?: string | null; bookContentId?: number | null; studySessionId?: number | null; mockExamId?: number | null };

export type SaveNoteInput = NoteLinks & {
  clientId: string;
  title: string;
  content: unknown;
  noteDate: Date;
  tags: string[];
  isFavorite?: boolean;
  isPinned?: boolean;
  reviewAt?: Date | null;
  templateKey?: string | null;
};

/** İçerikteki ek kimlikleri (noteImage / voiceClip). */
export function referencedAttachmentIds(doc: NoteDoc | NoteNode): number[] {
  const ids = new Set<number>();
  const walk = (node: NoteNode) => {
    if ((node.type === "noteImage" || node.type === "voiceClip") && Number.isInteger(node.attrs?.attachmentId)) ids.add(Number(node.attrs!.attachmentId));
    for (const child of node.content ?? []) walk(child);
  };
  walk(doc);
  return Array.from(ids);
}

/**
 * Nottaki bağlantılar yalnızca öğrencinin KENDİ verisine işaret edebilir:
 * konu müfredatta olmalı; kitap rafında bulunmuş olmalı; kitap içeriği, çalışma
 * oturumu ve deneme onun olmalı. Konu seçilip ders boşsa ders konudan gelir.
 */
async function resolveLinks(db: Db, userId: number, links: NoteLinks): Promise<Required<NoteLinks>> {
  let subject = links.subject?.trim() || null;
  const topicId = links.topicId ?? null;
  if (topicId !== null) {
    const [topic] = await db.select({ subject: yksTopics.subject }).from(yksTopics).where(eq(yksTopics.id, topicId)).limit(1);
    if (!topic) throw new NoteError("Seçilen konu bulunamadı.");
    subject = subject ?? topic.subject;
  }
  const bookId = links.bookId?.trim() || null;
  if (bookId) {
    const [owned] = await db.select({ id: bookInventory.id }).from(bookInventory).where(and(eq(bookInventory.userId, userId), eq(bookInventory.bookId, bookId))).limit(1);
    if (!owned) throw new NoteError("Bu kitap kütüphanende bulunmuyor.");
  }
  const bookContentId = links.bookContentId ?? null;
  if (bookContentId !== null) {
    const [content] = await db.select({ bookId: userBookContents.bookId }).from(userBookContents).where(and(eq(userBookContents.id, bookContentId), eq(userBookContents.userId, userId))).limit(1);
    if (!content || (bookId && content.bookId !== bookId)) throw new NoteError("Seçilen kitap bölümü geçersiz.");
  }
  const studySessionId = links.studySessionId ?? null;
  if (studySessionId !== null) {
    const [session] = await db.select({ id: studyPlanSessions.id }).from(studyPlanSessions).where(and(eq(studyPlanSessions.id, studySessionId), eq(studyPlanSessions.userId, userId))).limit(1);
    if (!session) throw new NoteError("Çalışma oturumu bulunamadı.");
  }
  const mockExamId = links.mockExamId ?? null;
  if (mockExamId !== null) {
    const [exam] = await db.select({ id: userMockExams.id }).from(userMockExams).where(and(eq(userMockExams.id, mockExamId), eq(userMockExams.userId, userId))).limit(1);
    if (!exam) throw new NoteError("Deneme bulunamadı.");
  }
  return { subject: subject?.slice(0, 80) ?? null, topicId, bookId, bookContentId, studySessionId, mockExamId };
}

/**
 * Notu oluşturur ya da günceller (userId + clientId ile upsert). Çevrimdışıyken
 * biriken otomatik kayıtlar tekrar gönderilse bile aynı not ikinci kez oluşmaz.
 * Arama metni, başlık ve önizleme istatistikleri içerikten sunucuda üretilir.
 */
export async function saveNote(userId: number, input: SaveNoteInput) {
  const db = await requireDb();
  if (!isValidNoteDoc(input.content)) throw new NoteError("Not içeriği okunamadı.");
  const contentJson = JSON.stringify(input.content);
  if (Buffer.byteLength(contentJson) > notesConfig.content.maxContentBytes) throw new NoteError("Not çok büyük. Bazı çizim ya da görselleri ayrı bir nota taşır mısın?");
  const plainText = extractPlainText(input.content);
  const stats = computeNoteStats(input.content);
  const links = await resolveLinks(db, userId, input);
  const title = deriveNoteTitle(input.title, plainText, input.noteDate);
  const tags = Array.from(new Set(input.tags.map(normalizeTag).filter((tag): tag is string => Boolean(tag)))).slice(0, notesConfig.content.maxTagsPerNote);

  const values = {
    title,
    content: contentJson,
    plainText,
    stats: JSON.stringify(stats),
    noteDate: input.noteDate,
    subject: links.subject,
    topicId: links.topicId,
    bookId: links.bookId,
    bookContentId: links.bookContentId,
    studySessionId: links.studySessionId,
    mockExamId: links.mockExamId,
    reviewAt: input.reviewAt ?? null,
    templateKey: input.templateKey ?? null,
    ...(input.isFavorite !== undefined ? { isFavorite: input.isFavorite ? 1 : 0 } : {}),
    ...(input.isPinned !== undefined ? { isPinned: input.isPinned ? 1 : 0 } : {}),
  };

  await db
    .insert(notes)
    .values({ userId, clientId: input.clientId, ...values, isFavorite: input.isFavorite ? 1 : 0, isPinned: input.isPinned ? 1 : 0 })
    .onDuplicateKeyUpdate({ set: { ...values, version: sql`${notes.version} + 1` } });
  const [saved] = await db.select({ id: notes.id, version: notes.version, updatedAt: notes.updatedAt, title: notes.title }).from(notes).where(and(eq(notes.userId, userId), eq(notes.clientId, input.clientId))).limit(1);
  if (!saved) throw new NoteError("Not kaydedilemedi.");

  await db.delete(noteTags).where(and(eq(noteTags.userId, userId), eq(noteTags.noteId, saved.id)));
  if (tags.length) await db.insert(noteTags).values(tags.map((tag) => ({ noteId: saved.id, userId, tag })));
  await getAttachmentStorage().syncNoteLinks(userId, saved.id, referencedAttachmentIds(input.content));
  return { id: saved.id, clientId: input.clientId, version: saved.version, title: saved.title, updatedAt: saved.updatedAt };
}

async function describeLinks(db: Db, userId: number, rows: Array<{ topicId: number | null; bookId: string | null }>) {
  const topicIds = Array.from(new Set(rows.map((row) => row.topicId).filter((id): id is number => id !== null)));
  const bookIds = Array.from(new Set(rows.map((row) => row.bookId).filter((id): id is string => Boolean(id))));
  const numeric = bookIds.filter((id) => /^\d+$/.test(id)).map(Number);
  const [topics, custom, catalog] = await Promise.all([
    topicIds.length ? db.select({ id: yksTopics.id, topic: yksTopics.topic, unit: yksTopics.unit }).from(yksTopics).where(inArray(yksTopics.id, topicIds)) : Promise.resolve([]),
    bookIds.length ? db.select({ bookId: userResourceBooks.bookId, title: userResourceBooks.title }).from(userResourceBooks).where(and(eq(userResourceBooks.userId, userId), inArray(userResourceBooks.bookId, bookIds))) : Promise.resolve([]),
    numeric.length ? db.select({ id: catalogBooks.id, name: catalogBooks.name }).from(catalogBooks).where(inArray(catalogBooks.id, numeric)) : Promise.resolve([]),
  ]);
  const topicById = new Map(topics.map((row) => [row.id, row]));
  const bookTitle = new Map<string, string>([...custom.map((row) => [row.bookId, row.title] as [string, string]), ...catalog.map((row) => [String(row.id), row.name] as [string, string])]);
  return { topicById, bookTitle };
}

const parseStats = (value: string): NoteStats => { try { return JSON.parse(value) as NoteStats; } catch { return computeNoteStats({ type: "doc", content: [] }); } };

export async function getNote(userId: number, id: number) {
  const db = await requireDb();
  const [row] = await db.select().from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).limit(1);
  if (!row) return null;
  const [tags, links] = await Promise.all([
    db.select({ tag: noteTags.tag }).from(noteTags).where(and(eq(noteTags.userId, userId), eq(noteTags.noteId, id))),
    describeLinks(db, userId, [row]),
  ]);
  return {
    ...row,
    content: JSON.parse(row.content) as NoteDoc,
    stats: parseStats(row.stats),
    isFavorite: row.isFavorite === 1,
    isPinned: row.isPinned === 1,
    tags: tags.map((item) => item.tag),
    topic: row.topicId !== null ? links.topicById.get(row.topicId) ?? null : null,
    bookTitle: row.bookId ? links.bookTitle.get(row.bookId) ?? null : null,
  };
}

export type ListFilters = {
  from?: Date | null;
  to?: Date | null;
  subject?: string | null;
  topicId?: number | null;
  bookId?: string | null;
  tag?: string | null;
  kind?: "text" | "voice" | "image" | "formula" | "drawing" | null;
  q?: string | null;
  favorite?: boolean;
  pinned?: boolean;
  studySessionId?: number | null;
  reviewDue?: boolean;
  cursor?: string | null;
  limit?: number;
};

const escapeLike = (value: string) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

/**
 * Anahtar kelime araması: başlık, düz metin (yazı + formül LaTeX'i + fotoğraf
 * metni), etiketler, ders, konu adı ve kitap adı. Semantik arama ileride bu
 * fonksiyonun yerine/yanına eklenebilir (bkz. NoteSearchProvider).
 */
async function keywordCondition(db: Db, userId: number, q: string): Promise<SQL> {
  const term = `%${escapeLike(q.trim().slice(0, 100))}%`;
  const [topics, books] = await Promise.all([
    db.select({ id: yksTopics.id }).from(yksTopics).where(like(yksTopics.topic, term)).limit(50),
    db.select({ bookId: userResourceBooks.bookId }).from(userResourceBooks).where(and(eq(userResourceBooks.userId, userId), like(userResourceBooks.title, term))).limit(50),
  ]);
  const conditions: SQL[] = [
    like(notes.title, term),
    like(notes.plainText, term),
    like(notes.subject, term),
    sql`EXISTS (SELECT 1 FROM ${noteTags} WHERE ${noteTags.noteId} = ${notes.id} AND ${noteTags.tag} LIKE ${term})`,
  ];
  if (topics.length) conditions.push(inArray(notes.topicId, topics.map((row) => row.id)));
  if (books.length) conditions.push(inArray(notes.bookId, books.map((row) => row.bookId)));
  return or(...conditions)!;
}

/** Semantik arama için genişleme noktası (MVP'de yok; anahtar kelime araması kullanılır). */
export interface NoteSearchProvider { search(userId: number, query: string): Promise<number[]> }
export const semanticSearchProvider: NoteSearchProvider | null = null;

export async function listNotes(userId: number, filters: ListFilters) {
  const db = await requireDb();
  const limit = Math.min(Math.max(filters.limit ?? notesConfig.list.pageSize, 1), 100);
  const conditions: SQL[] = [eq(notes.userId, userId), eq(notes.status, "active")];
  if (filters.from) conditions.push(gte(notes.noteDate, filters.from));
  if (filters.to) conditions.push(lte(notes.noteDate, filters.to));
  if (filters.subject) conditions.push(eq(notes.subject, filters.subject));
  if (filters.topicId) conditions.push(eq(notes.topicId, filters.topicId));
  if (filters.bookId) conditions.push(eq(notes.bookId, filters.bookId));
  if (filters.studySessionId) conditions.push(eq(notes.studySessionId, filters.studySessionId));
  if (filters.favorite) conditions.push(eq(notes.isFavorite, 1));
  if (filters.pinned) conditions.push(eq(notes.isPinned, 1));
  if (filters.reviewDue) conditions.push(and(isNotNull(notes.reviewAt), lte(notes.reviewAt, endOfToday()))!);
  if (filters.tag) {
    const tag = normalizeTag(filters.tag);
    if (tag) conditions.push(sql`EXISTS (SELECT 1 FROM ${noteTags} WHERE ${noteTags.noteId} = ${notes.id} AND ${noteTags.tag} = ${tag})`);
  }
  if (filters.kind) {
    const statKey = { voice: "voice", image: "images", formula: "formulas", drawing: "drawings" } as const;
    if (filters.kind === "text") conditions.push(sql`CHAR_LENGTH(${notes.plainText}) > 0`);
    else conditions.push(sql`CAST(JSON_UNQUOTE(JSON_EXTRACT(${notes.stats}, ${`$.${statKey[filters.kind]}`})) AS UNSIGNED) > 0`);
  }
  if (filters.q?.trim()) conditions.push(await keywordCondition(db, userId, filters.q));
  if (filters.cursor) {
    const [time, id] = filters.cursor.split("_").map(Number);
    if (Number.isFinite(time) && Number.isFinite(id)) conditions.push(or(lt(notes.noteDate, new Date(time)), and(eq(notes.noteDate, new Date(time)), lt(notes.id, id)))!);
  }

  const rows = await db
    .select({ id: notes.id, clientId: notes.clientId, title: notes.title, plainText: notes.plainText, stats: notes.stats, noteDate: notes.noteDate, subject: notes.subject, topicId: notes.topicId, bookId: notes.bookId, studySessionId: notes.studySessionId, isFavorite: notes.isFavorite, isPinned: notes.isPinned, reviewAt: notes.reviewAt, updatedAt: notes.updatedAt })
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.noteDate), desc(notes.id))
    .limit(limit + 1);
  const page = rows.slice(0, limit);
  const ids = page.map((row) => row.id);
  const [tags, links] = await Promise.all([
    ids.length ? db.select({ noteId: noteTags.noteId, tag: noteTags.tag }).from(noteTags).where(and(eq(noteTags.userId, userId), inArray(noteTags.noteId, ids))) : Promise.resolve([]),
    describeLinks(db, userId, page),
  ]);
  const last = page[page.length - 1];
  return {
    items: page.map(({ plainText, stats, ...row }) => ({
      ...row,
      snippet: plainText.replace(/\s+/g, " ").slice(0, notesConfig.list.snippetLength),
      stats: parseStats(stats),
      isFavorite: row.isFavorite === 1,
      isPinned: row.isPinned === 1,
      tags: tags.filter((item) => item.noteId === row.id).map((item) => item.tag),
      topic: row.topicId !== null ? links.topicById.get(row.topicId)?.topic ?? null : null,
      bookTitle: row.bookId ? links.bookTitle.get(row.bookId) ?? null : null,
    })),
    nextCursor: rows.length > limit && last ? `${new Date(last.noteDate).getTime()}_${last.id}` : null,
  };
}

const endOfToday = () => { const date = new Date(); date.setHours(23, 59, 59, 999); return date; };

export async function updateNoteFlags(userId: number, id: number, flags: { isFavorite?: boolean; isPinned?: boolean; reviewAt?: Date | null; archived?: boolean }) {
  const db = await requireDb();
  const set = {
    ...(flags.isFavorite !== undefined ? { isFavorite: flags.isFavorite ? 1 : 0 } : {}),
    ...(flags.isPinned !== undefined ? { isPinned: flags.isPinned ? 1 : 0 } : {}),
    ...(flags.reviewAt !== undefined ? { reviewAt: flags.reviewAt } : {}),
    ...(flags.archived !== undefined ? { status: flags.archived ? ("archived" as const) : ("active" as const) } : {}),
  };
  // Varlık ayrıca kontrol edilir: MySQL, değer değişmeyen UPDATE'te etkilenen satırı 0 döndürür.
  const [row] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).limit(1);
  if (!row) throw new NoteError("Not bulunamadı.");
  if (Object.keys(set).length === 0) return;
  await db.update(notes).set(set).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function deleteNote(userId: number, id: number) {
  const db = await requireDb();
  const [row] = await db.select({ id: notes.id }).from(notes).where(and(eq(notes.id, id), eq(notes.userId, userId))).limit(1);
  if (!row) throw new NoteError("Not bulunamadı.");
  await getAttachmentStorage().deleteForNote(userId, id);
  await db.delete(noteTags).where(and(eq(noteTags.userId, userId), eq(noteTags.noteId, id)));
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

/** Takvim: gün başına not sayısı ve tekrar zamanı gelen not sayısı. */
export async function getNoteCalendar(userId: number, from: Date, to: Date) {
  const db = await requireDb();
  const [written, reviews] = await Promise.all([
    db.select({ noteDate: notes.noteDate }).from(notes).where(and(eq(notes.userId, userId), eq(notes.status, "active"), gte(notes.noteDate, from), lte(notes.noteDate, to))),
    db.select({ reviewAt: notes.reviewAt }).from(notes).where(and(eq(notes.userId, userId), eq(notes.status, "active"), gte(notes.reviewAt, from), lte(notes.reviewAt, to))),
  ]);
  return { notes: written.map((row) => row.noteDate), reviews: reviews.map((row) => row.reviewAt).filter((value): value is Date => value !== null) };
}

export async function listTags(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ tag: noteTags.tag, count: sql<number>`COUNT(*)` }).from(noteTags).where(eq(noteTags.userId, userId)).groupBy(noteTags.tag).orderBy(desc(sql`COUNT(*)`)).limit(50);
  return rows.map((row) => ({ tag: row.tag, count: Number(row.count) }));
}

/** Admin paneli: içerik DEĞİL, yalnızca sayılar (not içeriği öğrenciye özeldir). */
export async function getNoteStatsForAdmin(userId: number) {
  const db = await requireDb();
  const rows = await db.select({ stats: notes.stats, updatedAt: notes.updatedAt }).from(notes).where(eq(notes.userId, userId));
  const parsed = rows.map((row) => parseStats(row.stats));
  return {
    notes: rows.length,
    voiceNotes: parsed.filter((stats) => stats.voice > 0).length,
    imageNotes: parsed.filter((stats) => stats.images > 0).length,
    lastActivity: rows.reduce<Date | null>((latest, row) => (!latest || row.updatedAt > latest ? row.updatedAt : latest), null),
  };
}

/**
 * "Çalışma Planına Ekle": notun konusu (ya da seçilen konu) için mevcut plan
 * motoruyla görev oluşturur. Konu şart — plan görevleri konu bazlı ilerler ve
 * tamamlanınca o konunun ilerlemesini günceller.
 */
export async function createTaskFromNote(userId: number, noteId: number, input: { topicId?: number | null; minutes?: number; when: "today" | "auto" }) {
  const db = await requireDb();
  const [note] = await db.select({ id: notes.id, title: notes.title, topicId: notes.topicId }).from(notes).where(and(eq(notes.id, noteId), eq(notes.userId, userId))).limit(1);
  if (!note) throw new NoteError("Not bulunamadı.");
  const topicId = input.topicId ?? note.topicId;
  if (!topicId) throw new NoteError("Görev oluşturmak için önce notu bir konuya bağla.");
  const [topic] = await db.select({ topic: yksTopics.topic, subject: yksTopics.subject }).from(yksTopics).where(eq(yksTopics.id, topicId)).limit(1);
  if (!topic) throw new NoteError("Seçilen konu bulunamadı.");
  const minutes = Math.min(Math.max(input.minutes ?? notesConfig.task.defaultMinutes, 10), 240);
  const date = await pickDayForTask(userId, minutes, input.when);
  const title = `${topic.subject} · ${topic.topic} (nottan: ${note.title})`;
  // Kitap görevi değil (sayfa/test yok): kitap ilerlemesine yanlış kayıt düşmesin diye sourceBookId verilmez.
  await insertPlanTask(userId, { date, title, subject: topic.subject, topic: topic.topic, kind: "Tekrar", minutes, planTitle: "Defter görevleri", planSummary: "Akıllı Defter'deki notlardan oluşturulan çalışma görevleri." });
  return { date, title: title.slice(0, 180), minutes };
}
