import { and, eq, inArray, sql } from "drizzle-orm";
import { topicProgress, yksTopics } from "../../drizzle/schema";
import { ADMIN_TOPIC_SLUG_PREFIX, CURRICULUM, isAdminTopicSlug } from "../../shared/curriculum";
import { subjectNamesOf, type ExamKind } from "../../shared/exams";
import { ensureTopicCatalogSeeded, getDb } from "../db";

/** Yönetim Paneli → Konular: sınav > ders > ünite > konu kataloğunun düzenlenmesi. Silme yok, gizleme var. */
export class TopicAdminError extends Error {}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new Error("Veritabanına ulaşılamadı.");
  return db;
}

const slugify = (value: string) =>
  value.toLocaleLowerCase("tr").replace(/ı/g, "i").replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase("tr") === b.trim().toLocaleLowerCase("tr");
const parseNames = (json: string): string[] => { try { const value = JSON.parse(json); return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; } catch { return []; } };
const CURRICULUM_RANK = new Map(CURRICULUM.map((def, index) => [def.slug, index]));

export type AdminTopicRow = { id: number; slug: string; subject: string; unit: string; topic: string; hidden: boolean; origin: "curriculum" | "admin" | "other"; previousNames: string[]; studentCount: number };

/** Sınavın tüm konuları (gizliler dahil), müfredat sırasıyla; dersler sınav tanımındaki sırayla. */
export async function listTopicsForAdmin(exam: ExamKind): Promise<{ subjects: string[]; topics: AdminTopicRow[] }> {
  await ensureTopicCatalogSeeded();
  const db = await requireDb();
  const rows = await db.select().from(yksTopics).where(eq(yksTopics.exam, exam));
  const counts = rows.length ? await db.select({ topicId: topicProgress.topicId, count: sql<number>`COUNT(DISTINCT ${topicProgress.userId})::int` }).from(topicProgress).where(inArray(topicProgress.topicId, rows.map((row) => row.id))).groupBy(topicProgress.topicId) : [];
  const countById = new Map(counts.map((row) => [row.topicId, Number(row.count)]));
  const order = subjectNamesOf(exam);
  const subjects = Array.from(new Set([...order, ...rows.map((row) => row.subject)]));
  const rank = (slug: string, id: number) => CURRICULUM_RANK.get(slug) ?? 1_000_000 + id;
  const topics = rows
    .sort((a, b) => subjects.indexOf(a.subject) - subjects.indexOf(b.subject) || rank(a.slug, a.id) - rank(b.slug, b.id))
    .map((row) => ({ id: row.id, slug: row.slug, subject: row.subject, unit: row.unit, topic: row.topic, hidden: row.hidden === 1, origin: CURRICULUM_RANK.has(row.slug) ? "curriculum" as const : isAdminTopicSlug(row.slug) ? "admin" as const : "other" as const, previousNames: parseNames(row.previousNames), studentCount: countById.get(row.id) ?? 0 }));
  return { subjects, topics };
}

async function findDuplicate(exam: ExamKind, subject: string, topic: string, exceptId?: number) {
  const db = await requireDb();
  const rows = await db.select({ id: yksTopics.id, topic: yksTopics.topic, hidden: yksTopics.hidden }).from(yksTopics).where(and(eq(yksTopics.exam, exam), eq(yksTopics.subject, subject)));
  return rows.find((row) => row.id !== exceptId && sameName(row.topic, topic)) ?? null;
}

export async function addTopic(input: { exam: ExamKind; subject: string; unit: string; topic: string }): Promise<number> {
  const db = await requireDb();
  const { subjects } = await listTopicsForAdmin(input.exam);
  if (!subjects.includes(input.subject)) throw new TopicAdminError("Bu ders bu sınavda yok.");
  const duplicate = await findDuplicate(input.exam, input.subject, input.topic);
  if (duplicate) throw new TopicAdminError(duplicate.hidden ? "Bu konu zaten var ama gizli; listede 'Göster' ile geri açabilirsin." : "Bu derste aynı adlı bir konu zaten var.");
  const base = `${ADMIN_TOPIC_SLUG_PREFIX}${input.exam.toLowerCase()}-${slugify(input.subject)}-${slugify(input.topic)}`.slice(0, 110);
  const taken = new Set((await db.select({ slug: yksTopics.slug }).from(yksTopics).where(sql`${yksTopics.slug} LIKE ${`${base}%`}`)).map((row) => row.slug));
  let slug = base;
  for (let n = 2; taken.has(slug); n += 1) slug = `${base}-${n}`;
  const [row] = await db.insert(yksTopics).values({ slug, exam: input.exam, subject: input.subject, unit: input.unit, topic: input.topic }).returning({ id: yksTopics.id });
  return row.id;
}

/** Konu adı / ünitesi değişir; eski ad `previousNames`e girer ki eski adla gelen veri aynı konuya bağlansın. */
export async function updateTopic(input: { id: number; topic: string; unit: string }): Promise<{ exam: ExamKind; from: string }> {
  const db = await requireDb();
  const [row] = await db.select().from(yksTopics).where(eq(yksTopics.id, input.id)).limit(1);
  if (!row) throw new TopicAdminError("Konu bulunamadı.");
  if (await findDuplicate(row.exam, row.subject, input.topic, row.id)) throw new TopicAdminError("Bu derste aynı adlı bir konu zaten var.");
  const names = parseNames(row.previousNames);
  if (!sameName(row.topic, input.topic) && !names.includes(row.topic)) names.push(row.topic);
  await db.update(yksTopics).set({ topic: input.topic, unit: input.unit, previousNames: JSON.stringify(names.filter((name) => !sameName(name, input.topic))) }).where(eq(yksTopics.id, row.id));
  return { exam: row.exam, from: row.topic };
}

/** Bir ünitenin adını dersteki tüm konularında değiştirir. */
export async function renameUnit(input: { exam: ExamKind; subject: string; from: string; to: string }): Promise<number> {
  const db = await requireDb();
  const updated = await db.update(yksTopics).set({ unit: input.to }).where(and(eq(yksTopics.exam, input.exam), eq(yksTopics.subject, input.subject), eq(yksTopics.unit, input.from))).returning({ id: yksTopics.id });
  if (!updated.length) throw new TopicAdminError("Ünite bulunamadı.");
  return updated.length;
}

export async function setTopicHidden(id: number, hidden: boolean): Promise<void> {
  const db = await requireDb();
  const updated = await db.update(yksTopics).set({ hidden: hidden ? 1 : 0 }).where(eq(yksTopics.id, id)).returning({ id: yksTopics.id });
  if (!updated.length) throw new TopicAdminError("Konu bulunamadı.");
}
