import { and, desc, eq, ilike, inArray, isNull, lt, or, sql, type SQL } from "drizzle-orm";
import { wallPosts, yksTopics } from "../../drizzle/schema";
import { extractPlainText, isValidNoteDoc, normalizeTag, type NoteDoc } from "../../shared/noteContent";
import { getDb } from "../db";
import { getAttachmentStorage } from "../notes/attachmentStorage";
import { notesConfig } from "../notes/config";
import { referencedAttachmentIds } from "../notes/notesDb";

/**
 * Duvarım: öğrencinin kişisel, zaman sıralı akışı. Her sorgu `userId` ile kapsamlıdır —
 * başka öğrencinin kaydı ne listelenir ne açılır (görünürlük şimdilik yalnızca "private").
 * İçerik defterle aynı blok belge; fotoğraf/ses ekleri defterin ek deposundan (Supabase Storage).
 */

export class WallError extends Error {}
export const WALL_PAGE_SIZE = 20;
export const WALL_MAX_TAGS = 8;
export type WallKind = "note" | "link" | "quote";
export type WallFilter = "all" | "unread" | "pinned";

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;
async function requireDb(): Promise<Db> {
  const db = await getDb();
  if (!db) throw new WallError("Veritabanı bağlantısı yok.");
  return db;
}

export type WallPostInput = {
  kind: WallKind;
  title: string;
  content: NoteDoc;
  sourceUrl?: string | null;
  sourceTitle?: string | null;
  sourceDescription?: string | null;
  sourceSite?: string | null;
  tags: string[];
  topicId?: number | null;
  readLater: boolean;
};

const tagList = (tags: string) => tags.split(",").filter(Boolean);
const toPost = (row: typeof wallPosts.$inferSelect, topic: { topic: string; subject: string } | null) => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  content: JSON.parse(row.content) as NoteDoc,
  plainText: row.plainText,
  sourceUrl: row.sourceUrl,
  sourceTitle: row.sourceTitle,
  sourceDescription: row.sourceDescription,
  sourceSite: row.sourceSite,
  tags: tagList(row.tags),
  subject: row.subject,
  topicId: row.topicId,
  topic: topic?.topic ?? null,
  readLater: row.readLater === 1,
  readAt: row.readAt,
  isPinned: row.isPinned === 1,
  postedAt: row.postedAt,
  updatedAt: row.updatedAt,
});
export type WallPost = ReturnType<typeof toPost>;

/** Başlık boşsa: bağlantının başlığı, yoksa metnin ilk satırı, yoksa türüne göre bir ad. */
export function deriveWallTitle(input: Pick<WallPostInput, "kind" | "title" | "sourceTitle" | "sourceUrl">, plainText: string): string {
  const explicit = input.title.trim();
  if (explicit) return explicit.slice(0, 200);
  if (input.sourceTitle?.trim()) return input.sourceTitle.trim().slice(0, 200);
  const firstLine = plainText.split("\n").map((line) => line.trim()).find(Boolean);
  if (firstLine) return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine;
  if (input.sourceUrl) { try { return new URL(input.sourceUrl).hostname.replace(/^www\./, ""); } catch { /* aşağıya düş */ } }
  return input.kind === "quote" ? "Alıntı" : input.kind === "link" ? "Bağlantı" : "Yazı";
}

async function prepare(db: Db, input: WallPostInput) {
  if (!isValidNoteDoc(input.content)) throw new WallError("Kayıt içeriği okunamadı.");
  const contentJson = JSON.stringify(input.content);
  if (Buffer.byteLength(contentJson) > notesConfig.content.maxContentBytes) throw new WallError("Kayıt çok büyük. Bazı çizim ya da görselleri ayrı bir kayda taşır mısın?");
  const plainText = extractPlainText(input.content);
  if (input.kind === "link" && !input.sourceUrl) throw new WallError("Bağlantı kaydı için adres gerekli.");
  if (input.kind !== "link" && !plainText.trim() && !referencedAttachmentIds(input.content).length && !contentJson.includes('"formula"') && !contentJson.includes('"drawing"')) throw new WallError("Boş kayıt eklenemez.");
  let subject: string | null = null;
  if (input.topicId) {
    const [topic] = await db.select({ subject: yksTopics.subject }).from(yksTopics).where(eq(yksTopics.id, input.topicId)).limit(1);
    if (!topic) throw new WallError("Seçilen konu bulunamadı.");
    subject = topic.subject;
  }
  const tags = Array.from(new Set(input.tags.map(normalizeTag).filter((tag): tag is string => Boolean(tag) && !tag!.includes(",")))).slice(0, WALL_MAX_TAGS);
  return {
    kind: input.kind,
    title: deriveWallTitle(input, plainText),
    content: contentJson,
    plainText,
    sourceUrl: input.sourceUrl?.slice(0, 1000) || null,
    sourceTitle: input.sourceTitle?.trim().slice(0, 300) || null,
    sourceDescription: input.sourceDescription?.trim().slice(0, 500) || null,
    sourceSite: input.sourceSite?.trim().slice(0, 120) || null,
    tags: tags.join(",").slice(0, 300),
    subject,
    topicId: input.topicId ?? null,
    readLater: input.readLater ? 1 : 0,
  };
}

async function withTopics(db: Db, rows: Array<typeof wallPosts.$inferSelect>) {
  const ids = Array.from(new Set(rows.map((row) => row.topicId).filter((id): id is number => id !== null)));
  const topics = ids.length ? await db.select({ id: yksTopics.id, topic: yksTopics.topic, subject: yksTopics.subject }).from(yksTopics).where(inArray(yksTopics.id, ids)) : [];
  const byId = new Map(topics.map((row) => [row.id, row]));
  return rows.map((row) => toPost(row, row.topicId !== null ? byId.get(row.topicId) ?? null : null));
}

export async function createWallPost(userId: number, input: WallPostInput): Promise<WallPost> {
  const db = await requireDb();
  const values = await prepare(db, input);
  const [row] = await db.insert(wallPosts).values({ userId, ...values }).returning();
  await getAttachmentStorage().syncWallPostLinks(userId, row.id, referencedAttachmentIds(input.content));
  return (await withTopics(db, [row]))[0];
}

export async function updateWallPost(userId: number, id: number, input: WallPostInput): Promise<WallPost> {
  const db = await requireDb();
  const values = await prepare(db, input);
  // "Sonra oku" yeniden işaretlenirse okunmadı sayılır.
  const [row] = await db.update(wallPosts).set({ ...values, ...(values.readLater ? {} : { readAt: null }) }).where(and(eq(wallPosts.id, id), eq(wallPosts.userId, userId))).returning();
  if (!row) throw new WallError("Kayıt bulunamadı.");
  await getAttachmentStorage().syncWallPostLinks(userId, row.id, referencedAttachmentIds(input.content));
  return (await withTopics(db, [row]))[0];
}

export async function deleteWallPost(userId: number, id: number): Promise<boolean> {
  const db = await requireDb();
  const [row] = await db.delete(wallPosts).where(and(eq(wallPosts.id, id), eq(wallPosts.userId, userId))).returning({ id: wallPosts.id });
  if (!row) return false;
  await getAttachmentStorage().deleteForWallPost(userId, id);
  return true;
}

export async function setWallPostFlags(userId: number, id: number, flags: { read?: boolean; pinned?: boolean; readLater?: boolean }): Promise<boolean> {
  const db = await requireDb();
  const set: Partial<typeof wallPosts.$inferInsert> = {};
  if (flags.read !== undefined) set.readAt = flags.read ? new Date() : null;
  if (flags.pinned !== undefined) set.isPinned = flags.pinned ? 1 : 0;
  if (flags.readLater !== undefined) { set.readLater = flags.readLater ? 1 : 0; if (flags.readLater) set.readAt = null; }
  if (!Object.keys(set).length) return true;
  const rows = await db.update(wallPosts).set(set).where(and(eq(wallPosts.id, id), eq(wallPosts.userId, userId))).returning({ id: wallPosts.id });
  return rows.length > 0;
}

/**
 * Akış: en yeni üstte; sayfalama `postedAt`+`id` imleciyle. Süzgeç: okunacaklar (sonra oku,
 * okunmamış), sabitlenenler; etiket, konu ve metin araması birlikte kullanılabilir.
 */
export async function listWallPosts(userId: number, options: { filter?: WallFilter; tag?: string | null; topicId?: number | null; q?: string | null; cursor?: { postedAt: Date; id: number } | null; limit?: number } = {}) {
  const db = await requireDb();
  const limit = Math.min(50, options.limit ?? WALL_PAGE_SIZE);
  const conditions: Array<SQL | undefined> = [eq(wallPosts.userId, userId)];
  if (options.filter === "unread") conditions.push(eq(wallPosts.readLater, 1), isNull(wallPosts.readAt));
  if (options.filter === "pinned") conditions.push(eq(wallPosts.isPinned, 1));
  const tag = options.tag ? normalizeTag(options.tag) : null;
  if (tag) conditions.push(sql`(',' || ${wallPosts.tags} || ',') LIKE ${`%,${tag.replace(/[%_]/g, "")},%`}`);
  if (options.topicId) conditions.push(eq(wallPosts.topicId, options.topicId));
  const q = options.q?.trim().replace(/[%_\\]/g, "").slice(0, 100);
  if (q) conditions.push(or(ilike(wallPosts.title, `%${q}%`), ilike(wallPosts.plainText, `%${q}%`), ilike(wallPosts.sourceTitle, `%${q}%`), ilike(wallPosts.sourceUrl, `%${q}%`)));
  if (options.cursor) conditions.push(or(lt(wallPosts.postedAt, options.cursor.postedAt), and(eq(wallPosts.postedAt, options.cursor.postedAt), lt(wallPosts.id, options.cursor.id))));
  const rows = await db.select().from(wallPosts).where(and(...conditions)).orderBy(desc(wallPosts.postedAt), desc(wallPosts.id)).limit(limit + 1);
  const page = rows.slice(0, limit);
  const last = page.at(-1);
  return { posts: await withTopics(db, page), nextCursor: rows.length > limit && last ? { postedAt: last.postedAt, id: last.id } : null };
}

export async function getWallPost(userId: number, id: number): Promise<WallPost | null> {
  const db = await requireDb();
  const [row] = await db.select().from(wallPosts).where(and(eq(wallPosts.id, id), eq(wallPosts.userId, userId))).limit(1);
  return row ? (await withTopics(db, [row]))[0] : null;
}

/** Üst bilgi: okunacak sayısı, toplam, en çok kullanılan etiketler. */
export async function wallSummary(userId: number) {
  const db = await requireDb();
  const [counts] = await db.select({
    total: sql<string>`COUNT(*)`,
    unread: sql<string>`COUNT(*) FILTER (WHERE ${wallPosts.readLater} = 1 AND ${wallPosts.readAt} IS NULL)`,
    pinned: sql<string>`COUNT(*) FILTER (WHERE ${wallPosts.isPinned} = 1)`,
  }).from(wallPosts).where(eq(wallPosts.userId, userId));
  const tagRows = await db.select({ tags: wallPosts.tags }).from(wallPosts).where(and(eq(wallPosts.userId, userId), sql`${wallPosts.tags} <> ''`)).orderBy(desc(wallPosts.postedAt)).limit(300);
  const tagCounts = new Map<string, number>();
  for (const row of tagRows) for (const tag of tagList(row.tags)) tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
  return {
    total: Number(counts?.total ?? 0),
    unread: Number(counts?.unread ?? 0),
    pinned: Number(counts?.pinned ?? 0),
    tags: Array.from(tagCounts, ([tag, count]) => ({ tag, count })).sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, "tr")).slice(0, 20),
  };
}
