import { and, desc, eq, sql } from "drizzle-orm";
import { intentionAffirmations, intentionGrains, intentionJars } from "../../drizzle/schema";
import { toLocalDateKey } from "../../shared/dates";
import { AFFIRMATION_MAX, AFFIRMATION_MIN, PRESET_AFFIRMATIONS, jarView, matchesAffirmation } from "../../shared/intentionJar";
import { getDb } from "../db";

/** Niyet Kavanozum veritabanı katmanı. Her sorgu `userId` ile kapsamlı; başka hiçbir rol bu tablolara erişmez. */
export class IntentionJarError extends Error {}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new IntentionJarError("Veritabanına ulaşılamadı.");
  return db;
}

export async function getIntentionJar(userId: number) {
  const db = await requireDb();
  const todayKey = toLocalDateKey(new Date());
  const [affirmations, jar, recent] = await Promise.all([
    db.select({ id: intentionAffirmations.id, text: intentionAffirmations.text, presetKey: intentionAffirmations.presetKey, isActive: intentionAffirmations.isActive, createdAt: intentionAffirmations.createdAt, archivedAt: intentionAffirmations.archivedAt })
      .from(intentionAffirmations).where(eq(intentionAffirmations.userId, userId)).orderBy(desc(intentionAffirmations.createdAt)).limit(20),
    db.select().from(intentionJars).where(eq(intentionJars.userId, userId)).limit(1),
    db.select({ dayKey: intentionGrains.dayKey }).from(intentionGrains).where(eq(intentionGrains.userId, userId)).orderBy(desc(intentionGrains.dayKey)).limit(31),
  ]);
  const active = affirmations.find((row) => row.isActive === 1) ?? null;
  const total = jar[0]?.totalGrains ?? 0;
  return {
    active: active ? { id: active.id, text: active.text, presetKey: active.presetKey, since: active.createdAt } : null,
    previous: affirmations.filter((row) => row.isActive !== 1).map((row) => ({ id: row.id, text: row.text, createdAt: row.createdAt, archivedAt: row.archivedAt })),
    todayKey,
    doneToday: recent.some((row) => row.dayKey === todayKey),
    recentDays: recent.map((row) => row.dayKey),
    firstGrainAt: jar[0]?.firstGrainAt ?? null,
    ...jarView(total),
  };
}

/** Aktif sözü belirler: eskisi arşivlenir (silinmez, tanelerdeki kopyası da durur). Hazır söz seçildiyse metin sunucudaki listeden gelir. */
export async function setAffirmation(userId: number, input: { text?: string | null; presetKey?: string | null }) {
  const preset = input.presetKey ? PRESET_AFFIRMATIONS.find((item) => item.key === input.presetKey) : null;
  if (input.presetKey && !preset) throw new IntentionJarError("Bu hazır söz bulunamadı.");
  const text = (preset?.text ?? input.text ?? "").replace(/\s+/g, " ").trim();
  if (text.length < AFFIRMATION_MIN) throw new IntentionJarError(`Sözün en az ${AFFIRMATION_MIN} karakter olsun.`);
  if (text.length > AFFIRMATION_MAX) throw new IntentionJarError(`Sözün en fazla ${AFFIRMATION_MAX} karakter olabilir.`);
  const db = await requireDb();
  try {
    await db.transaction(async (tx) => {
      const [current] = await tx.select({ id: intentionAffirmations.id, text: intentionAffirmations.text }).from(intentionAffirmations).where(and(eq(intentionAffirmations.userId, userId), eq(intentionAffirmations.isActive, 1))).limit(1);
      if (current?.text === text) return;
      if (current) await tx.update(intentionAffirmations).set({ isActive: 0, archivedAt: new Date() }).where(eq(intentionAffirmations.id, current.id));
      await tx.insert(intentionAffirmations).values({ userId, text, presetKey: preset?.key ?? null, isActive: 1 });
    });
  } catch (error) {
    // Aynı anda iki değişiklik: tek aktif söz kısıtı ikincisini reddeder.
    if (/intention_affirmations_one_active|duplicate key/i.test(String((error as Error)?.message ?? error))) throw new IntentionJarError("Sözün az önce değişti; sayfayı yenileyip tekrar dener misin?");
    throw error;
  }
  return getIntentionJar(userId);
}

/**
 * Akşam ritüeli: öğrenci aktif sözünü yeniden yazar; eşleşirse bugünün tanesi kavanoza düşer. Günde en fazla
 * bir tane: (userId, dayKey) tekil indeksi ve ON CONFLICT DO NOTHING eşzamanlı istekleri de tek kayda indirir;
 * sayaç yalnızca tane gerçekten eklendiği işlemde artar.
 */
export async function performRitual(userId: number, typed: string) {
  const db = await requireDb();
  const [active] = await db.select({ id: intentionAffirmations.id, text: intentionAffirmations.text }).from(intentionAffirmations).where(and(eq(intentionAffirmations.userId, userId), eq(intentionAffirmations.isActive, 1))).limit(1);
  if (!active) throw new IntentionJarError("Önce kendine bir söz seç ya da yaz.");
  if (!matchesAffirmation(typed, active.text)) throw new IntentionJarError("Yazdığın cümle sözünle aynı değil; bir kez daha dener misin?");
  const dayKey = toLocalDateKey(new Date());
  const now = new Date();
  const added = await db.transaction(async (tx) => {
    const inserted = await tx.insert(intentionGrains).values({ userId, dayKey, affirmationId: active.id, affirmationText: active.text }).onConflictDoNothing({ target: [intentionGrains.userId, intentionGrains.dayKey] }).returning({ id: intentionGrains.id });
    if (!inserted.length) return false;
    await tx.insert(intentionJars).values({ userId, totalGrains: 1, firstGrainAt: now, lastGrainAt: now })
      .onConflictDoUpdate({ target: intentionJars.userId, set: { totalGrains: sql`${intentionJars.totalGrains} + 1`, lastGrainAt: now } });
    return true;
  });
  return { added, jar: await getIntentionJar(userId) };
}
