import { asc, eq } from "drizzle-orm";
import { classScheduleBlocks, studentProfiles } from "../../drizzle/schema";
import { DEFAULT_SCHOOL_PERIODS, describeWeekForPlan, isValidTime, validateSchedule, type ClassBlock, type ClassPeriod, type ClassSchedule } from "../../shared/classSchedule";
import { getDb } from "../db";

// Ders programım veri katmanı. Her sorgu userId ile kapsamlıdır.

export class ScheduleError extends Error {}

function parsePeriods(raw: string | null | undefined): ClassPeriod[] {
  if (!raw) return DEFAULT_SCHOOL_PERIODS;
  try {
    const value = JSON.parse(raw);
    if (!Array.isArray(value)) return DEFAULT_SCHOOL_PERIODS;
    return value.filter((item) => typeof item?.start === "string" && typeof item?.end === "string").map((item) => ({ start: item.start, end: item.end }));
  } catch {
    return DEFAULT_SCHOOL_PERIODS;
  }
}

export async function getClassSchedule(userId: number): Promise<ClassSchedule> {
  const db = await getDb();
  if (!db) return { periods: DEFAULT_SCHOOL_PERIODS, blocks: [] };
  const [profile] = await db.select({ schoolPeriodsJson: studentProfiles.schoolPeriodsJson }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const rows = await db
    .select({ source: classScheduleBlocks.source, dayOfWeek: classScheduleBlocks.dayOfWeek, startTime: classScheduleBlocks.startTime, endTime: classScheduleBlocks.endTime, subject: classScheduleBlocks.subject, label: classScheduleBlocks.label })
    .from(classScheduleBlocks)
    .where(eq(classScheduleBlocks.userId, userId))
    .orderBy(asc(classScheduleBlocks.dayOfWeek), asc(classScheduleBlocks.startTime));
  return { periods: parsePeriods(profile?.schoolPeriodsJson), blocks: rows };
}

/**
 * AI haftalık plan için planın başladığı günden (bugün, öğrencinin yerel tarihi) itibaren 7 günün
 * boş zamanı ve okulda işlenen YKS dersleri. Programı olmayan öğrenci için null (prompt değişmez).
 */
export async function getPlanScheduleContext(userId: number, startDate: Date): Promise<string | null> {
  const db = await getDb();
  if (!db) return null;
  const [profile] = await db.select({ start: studentProfiles.preferredStudyStartTime }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const { blocks } = await getClassSchedule(userId);
  return describeWeekForPlan(blocks, startDate, profile?.start && isValidTime(profile.start) ? profile.start : "16:00");
}

/** Tüm programı tek seferde değiştirir (tek haftalık program küçük; parça parça güncellemeye gerek yok). */
export async function saveClassSchedule(userId: number, schedule: ClassSchedule): Promise<ClassSchedule> {
  const problem = validateSchedule(schedule);
  if (problem) throw new ScheduleError(problem);
  const db = await getDb();
  if (!db) throw new ScheduleError("Veritabanı bağlantısı yok.");
  const blocks: ClassBlock[] = schedule.blocks.map((block) => ({ ...block, label: block.label.trim() || block.subject || "Ders" }));
  const periodsJson = JSON.stringify(schedule.periods);
  await db.transaction(async (tx) => {
    await tx.delete(classScheduleBlocks).where(eq(classScheduleBlocks.userId, userId));
    if (blocks.length) await tx.insert(classScheduleBlocks).values(blocks.map((block) => ({ ...block, userId })));
    await tx.insert(studentProfiles).values({ userId, schoolPeriodsJson: periodsJson }).onConflictDoUpdate({ target: studentProfiles.userId, set: { schoolPeriodsJson: periodsJson } });
  });
  return getClassSchedule(userId);
}
