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

// --- Excel'den toplu aktarım ------------------------------------------------

export type TopicImportRow = { line: number; id?: number | null; subject: string; unit: string; topic: string; hidden?: boolean | null };
export type TopicImportPlan = {
  add: Array<{ line: number; subject: string; unit: string; topic: string; hidden: boolean }>;
  update: Array<{ line: number; id: number; subject: string; from: { topic: string; unit: string; hidden: boolean }; to: { topic: string; unit: string; hidden: boolean } }>;
  unchanged: number;
  skipped: Array<{ line: number; reason: string; topic: string }>;
};

/**
 * Excel satırlarını mevcut kataloğa karşı planlar (yazmaz). Kimlik sütunu dolu satır o konuyu günceller (ad, ünite,
 * gizli); boşsa aynı derste aynı adlı konu varsa ona eşlenir, yoksa yeni konu olur. Ders değiştirilemez; aynı ad
 * dosyada ya da derste iki kez olamaz.
 */
export async function planTopicImport(exam: ExamKind, rows: TopicImportRow[]): Promise<TopicImportPlan> {
  const { subjects, topics } = await listTopicsForAdmin(exam);
  const plan: TopicImportPlan = { add: [], update: [], unchanged: 0, skipped: [] };
  const byId = new Map(topics.map((row) => [row.id, row]));
  // Ders başına sonuçta kullanılacak adlar (çakışma denetimi): mevcut adlar, güncellemeler ve eklemelerle değişir.
  const finalName = new Map(topics.map((row) => [row.id, row.topic]));
  const claimed = new Set<string>();
  const key = (subject: string, topic: string) => `${subject}\u0000${topic.trim().toLocaleLowerCase("tr")}`;
  const nameTaken = (subject: string, topic: string, exceptId?: number) => claimed.has(key(subject, topic)) || topics.some((row) => row.id !== exceptId && row.subject === subject && sameName(finalName.get(row.id) ?? row.topic, topic));

  for (const raw of rows) {
    const subject = raw.subject.trim();
    const unit = raw.unit.trim();
    const topic = raw.topic.trim();
    const skip = (reason: string) => plan.skipped.push({ line: raw.line, reason, topic: topic || "(boş)" });
    if (!subject || !unit || !topic) { skip("Ders, ünite ve konu dolu olmalı."); continue; }
    if (topic.length < 2 || topic.length > 180 || unit.length < 2 || unit.length > 120) { skip("Konu 2–180, ünite 2–120 karakter olmalı."); continue; }
    if (!subjects.includes(subject)) { skip(`"${subject}" bu sınavın dersi değil.`); continue; }
    const existing = raw.id ? byId.get(raw.id) : topics.find((row) => row.subject === subject && (sameName(row.topic, topic) || row.previousNames.some((name) => sameName(name, topic))));
    if (raw.id && !existing) { skip(`Kimlik ${raw.id} bu sınavda yok.`); continue; }
    if (existing) {
      if (existing.subject !== subject) { skip("Konunun dersi değiştirilemez; yeni satır olarak (kimliksiz) ekle."); continue; }
      const nextTopic = raw.id ? topic : existing.topic;
      const hidden = raw.hidden ?? existing.hidden;
      if (!sameName(nextTopic, existing.topic) && nameTaken(subject, nextTopic, existing.id)) { skip("Bu derste aynı adlı başka bir konu var."); continue; }
      if (claimed.has(key(subject, nextTopic))) { skip("Dosyada aynı konu iki kez geçiyor."); continue; }
      claimed.add(key(subject, nextTopic));
      if (nextTopic === existing.topic && unit === existing.unit && hidden === existing.hidden) { plan.unchanged += 1; continue; }
      finalName.set(existing.id, nextTopic);
      plan.update.push({ line: raw.line, id: existing.id, subject, from: { topic: existing.topic, unit: existing.unit, hidden: existing.hidden }, to: { topic: nextTopic, unit, hidden } });
      continue;
    }
    if (nameTaken(subject, topic)) { skip("Dosyada aynı konu iki kez geçiyor."); continue; }
    claimed.add(key(subject, topic));
    plan.add.push({ line: raw.line, subject, unit, topic, hidden: raw.hidden ?? false });
  }
  return plan;
}

/** Planı uygular (önce yeniden planlar: önizlemeden bu yana değişen katalogla çelişmesin). */
export async function applyTopicImport(exam: ExamKind, rows: TopicImportRow[]): Promise<TopicImportPlan> {
  const plan = await planTopicImport(exam, rows);
  for (const item of plan.update) {
    if (item.to.topic !== item.from.topic || item.to.unit !== item.from.unit) await updateTopic({ id: item.id, topic: item.to.topic, unit: item.to.unit });
    if (item.to.hidden !== item.from.hidden) await setTopicHidden(item.id, item.to.hidden);
  }
  for (const item of plan.add) {
    const id = await addTopic({ exam, subject: item.subject, unit: item.unit, topic: item.topic });
    if (item.hidden) await setTopicHidden(id, true);
  }
  return plan;
}

export async function setTopicHidden(id: number, hidden: boolean): Promise<void> {
  const db = await requireDb();
  const updated = await db.update(yksTopics).set({ hidden: hidden ? 1 : 0 }).where(eq(yksTopics.id, id)).returning({ id: yksTopics.id });
  if (!updated.length) throw new TopicAdminError("Konu bulunamadı.");
}
