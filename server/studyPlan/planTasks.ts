import { and, eq, gte, lte } from "drizzle-orm";
import { studentProfiles, studyPlanSessions, studyPlans } from "../../drizzle/schema";
import { pickStudyDay } from "../bookContent/bookStudyAllocation";
import { getDb } from "../db";

// Plana tek bir görev ekleme — kitap önerileri ve Akıllı Defter ("Çalışma
// Planına Ekle") aynı yolu kullanır. Mevcut planı silmez/ezmez: görev o haftayı
// kapsayan plana eklenir, yoksa küçük bir plan açılır; "auto" günü öğrencinin
// günlük kapasitesine göre seçer.

export class PlanTaskError extends Error {}

const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export async function pickDayForTask(userId: number, minutes: number, when: "today" | "auto"): Promise<string> {
  const db = await getDb();
  if (!db) throw new PlanTaskError("Veritabanı bağlantısı yok.");
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (when === "today") return isoDate(today);
  const horizonEnd = new Date(today.getTime() + 7 * 86_400_000);
  const [profile] = await db.select({ daily: studentProfiles.dailyStudyDuration }).from(studentProfiles).where(eq(studentProfiles.userId, userId)).limit(1);
  const sessions = await db
    .select({ sessionDate: studyPlanSessions.sessionDate, minutes: studyPlanSessions.plannedMinutes, sourceBookId: studyPlanSessions.sourceBookId })
    .from(studyPlanSessions)
    .where(and(eq(studyPlanSessions.userId, userId), eq(studyPlanSessions.status, "planned"), gte(studyPlanSessions.sessionDate, today), lte(studyPlanSessions.sessionDate, horizonEnd)));
  const picked = pickStudyDay({ today: isoDate(today), minutes, dailyCapacity: profile?.daily ?? 120, load: sessions.map((session) => ({ date: isoDate(new Date(session.sessionDate)), minutes: session.minutes, isBook: Boolean(session.sourceBookId) })) });
  if (!picked) throw new PlanTaskError("Önümüzdeki 7 günde bu görev için yer yok — planın dolu. \"Bugün çalış\" ile yine de ekleyebilirsin.");
  return picked;
}

export async function insertPlanTask(
  userId: number,
  input: { date: string; title: string; subject: string; topic: string; kind: string; minutes: number; targetPages?: string | null; targetTests?: string | null; sourceBookId?: string | null; planTitle: string; planSummary: string }
): Promise<{ sessionId: number; date: string }> {
  const db = await getDb();
  if (!db) throw new PlanTaskError("Veritabanı bağlantısı yok.");
  // Başka günlere öğlen; BUGÜNE eklenen görev şimdiden birkaç dakika sonrasına konur —
  // öğlen geçtiyse görev eklendiği anda "Gecikti" görünmesin.
  const noon = new Date(`${input.date}T12:00:00Z`);
  const sessionDate = input.date === isoDate(new Date()) ? new Date(Math.max(noon.getTime(), Date.now() + 5 * 60_000)) : noon;
  const [plan] = await db.select({ id: studyPlans.id }).from(studyPlans).where(and(eq(studyPlans.userId, userId), lte(studyPlans.weekStart, sessionDate), gte(studyPlans.weekEnd, sessionDate))).orderBy(studyPlans.createdAt).limit(1);
  let planId = plan?.id;
  if (!planId) {
    const weekStart = new Date(`${input.date}T00:00:00Z`);
    const weekEnd = new Date(weekStart.getTime() + 6 * 86_400_000 + 86_399_000);
    const result = await db.insert(studyPlans).values({ userId, title: input.planTitle, weekStart, weekEnd, summary: input.planSummary, source: "manual" });
    planId = Number(result[0].insertId);
  }
  const result = await db.insert(studyPlanSessions).values({
    planId,
    userId,
    sessionDate,
    title: input.title.slice(0, 180),
    subject: input.subject,
    // Tam konu adı: tamamlanınca completeStudySession → upsertTopicProgress aynı
    // konu satırını günceller; zayıflık mevcut sistem tarafından yeniden hesaplanır.
    topic: input.topic,
    kind: input.kind,
    plannedMinutes: input.minutes,
    targetPages: input.targetPages ?? null,
    targetTests: input.targetTests ?? null,
    sourceBookId: input.sourceBookId ?? null,
  });
  return { sessionId: Number(result[0].insertId), date: input.date };
}
