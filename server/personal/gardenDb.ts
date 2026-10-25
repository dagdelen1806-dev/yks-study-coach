import { and, eq, sql } from "drizzle-orm";
import { gardenProgress, readingBooks, studyPlanSessions, topicStudyLogs } from "../../drizzle/schema";
import { computeGarden, stageThresholds, type GardenInputs } from "../../shared/effortGarden";
import { getDb, getStudentProfile } from "../db";

/** Gece okuması ve paragraf pratiği rutinlerinin `kind` değerleri (bkz. Home.tsx RoutineHabitCard → calendar.logRoutine). */
export const READING_ROUTINE_KIND = "Kitap Okuma";
export const PARAGRAPH_ROUTINE_KIND = "Paragraf";
const DAY = sql<string>`to_char((${topicStudyLogs.studyDate} AT TIME ZONE 'Europe/Istanbul'), 'YYYY-MM-DD')`;

/** Emek Bahçem'in girdileri: yalnızca mevcut kayıtlardan okunur, hiçbir kayıt yeniden oluşturulmaz. */
export async function loadGardenInputs(userId: number): Promise<GardenInputs> {
  const db = await getDb();
  if (!db) return { readingPages: 0, readingSessions: 0, finishedBooks: 0, paragraphSessions: 0, paragraphQuestions: 0, dailyMinutes: [], activeDaysLast7: 0 };
  const [routines, paragraphQuestions, finished, days] = await Promise.all([
    db.select({ kind: studyPlanSessions.kind, sessions: sql<number>`COUNT(*)::int`, pages: sql<number>`COALESCE(SUM(${studyPlanSessions.actualPages}), 0)::int` })
      .from(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "completed"), sql`${studyPlanSessions.kind} IN (${READING_ROUTINE_KIND}, ${PARAGRAPH_ROUTINE_KIND})`)).groupBy(studyPlanSessions.kind),
    // Paragraf konularında çözülen sorular (odak oturumu, plan görevi, deneme dışı konu kaydı).
    db.select({ questions: sql<number>`COALESCE(SUM(${topicStudyLogs.questions}), 0)::int` }).from(topicStudyLogs).where(and(eq(topicStudyLogs.userId, userId), sql`lower(${topicStudyLogs.topic}) LIKE '%paragraf%'`)),
    db.select({ count: sql<number>`COUNT(*)::int` }).from(readingBooks).where(and(eq(readingBooks.userId, userId), eq(readingBooks.status, "finished"))),
    // Her konu çalışma kaydı (oturum tamamlama, odak kaydı, rutin) günün çalışma süresine eklenir.
    db.select({ day: DAY, minutes: sql<number>`COALESCE(SUM(${topicStudyLogs.minutes}), 0)::int` }).from(topicStudyLogs).where(eq(topicStudyLogs.userId, userId)).groupBy(DAY),
  ]);
  const reading = routines.find((row) => row.kind === READING_ROUTINE_KIND);
  const paragraph = routines.find((row) => row.kind === PARAGRAPH_ROUTINE_KIND);
  const studyDays = days.filter((row) => Number(row.minutes) > 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString("sv-SE", { timeZone: "Europe/Istanbul" });
  return {
    readingPages: Number(reading?.pages ?? 0),
    readingSessions: Number(reading?.sessions ?? 0),
    finishedBooks: Number(finished[0]?.count ?? 0),
    paragraphSessions: Number(paragraph?.sessions ?? 0),
    paragraphQuestions: Number(paragraphQuestions[0]?.questions ?? 0),
    dailyMinutes: studyDays.map((row) => Number(row.minutes)),
    activeDaysLast7: studyDays.filter((row) => row.day > weekAgo).length,
  };
}

/** Bahçenin bugünkü hâli. Hesaplanan aşama saklanandan yüksekse kaydedilir; düşükse saklanan kullanılır (bahçe geri gitmez). */
export async function getEffortGarden(userId: number) {
  const [inputs, profile] = await Promise.all([loadGardenInputs(userId), getStudentProfile(userId)]);
  const db = await getDb();
  const [stored] = db ? await db.select().from(gardenProgress).where(eq(gardenProgress.userId, userId)).limit(1) : [];
  const gardenProfile = { examTrack: profile.examTrack, dailyStudyDuration: profile.dailyStudyDuration };
  const garden = computeGarden(inputs, gardenProfile, stored?.highestStage ?? 1);
  let reached: Record<string, string> = {};
  try { reached = JSON.parse(stored?.stageReachedJson ?? "{}"); } catch { reached = {}; }
  let newlyReached: number | null = null;
  if (db && garden.stage > (stored?.highestStage ?? 1)) {
    for (let stage = (stored?.highestStage ?? 1) + 1; stage <= garden.stage; stage += 1) reached[String(stage)] = new Date().toISOString();
    newlyReached = garden.stage;
    const values = { highestStage: garden.stage, stageReachedJson: JSON.stringify(reached) };
    await db.insert(gardenProgress).values({ userId, ...values }).onConflictDoUpdate({ target: gardenProgress.userId, set: { highestStage: sql`GREATEST(${gardenProgress.highestStage}, ${garden.stage})`, stageReachedJson: values.stageReachedJson } });
  }
  return { ...garden, inputs, thresholds: stageThresholds(gardenProfile), stageReachedAt: reached, newlyReached, dailyGoalMinutes: profile.dailyStudyDuration };
}
