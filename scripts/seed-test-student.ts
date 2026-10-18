/**
 * Deneme (test) hesabına gerçekçi örnek veri yazar: profil hedefi, TYT/AYT denemeleri,
 * konu ilerlemesi, son 7 günün çalışma kayıtları ve bugünün planı.
 * Yalnızca @ornek.com / @test.local hesaplarında çalışır; önce o hesabın bu tablolardaki
 * verisini siler (yeniden çalıştırılabilir).
 *
 * Kullanım (repo kökünden): npx tsx --env-file=.env scripts/seed-test-student.ts ece.ay@ornek.com
 */
import { and, eq, inArray } from "drizzle-orm";
import { addTopicStudyLog, addUserMockExams, completeOnboarding, completeStudySession, getDb, getStudyCalendar, getTopicCatalog, saveStudyPlan, upsertStudentProfileStep, upsertTopicProgress } from "../server/db";
import { studyPlanSessions, studyPlans, topicProgress, topicStudyLogs, userMockExams, users, coachAlerts } from "../drizzle/schema";

const email = process.argv[2];
if (!email || !/@(ornek\.com|test\.local)$/.test(email)) throw new Error("Yalnızca @ornek.com / @test.local deneme hesapları");

const at = (daysFromToday: number, hour = 12, minute = 0) => { const date = new Date(); date.setDate(date.getDate() + daysFromToday); date.setHours(hour, minute, 0, 0); return date; };

async function main() {
  const db = await getDb();
  if (!db) throw new Error("DB yok");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) throw new Error(`Kullanıcı yok: ${email}`);
  const userId = user.id;

  // Temizlik (yalnızca bu hesabın satırları).
  const plans = await db.select({ id: studyPlans.id }).from(studyPlans).where(eq(studyPlans.userId, userId));
  if (plans.length) await db.delete(studyPlanSessions).where(and(eq(studyPlanSessions.userId, userId), inArray(studyPlanSessions.planId, plans.map((plan) => plan.id))));
  await db.delete(studyPlans).where(eq(studyPlans.userId, userId));
  await db.delete(userMockExams).where(eq(userMockExams.userId, userId));
  await db.delete(topicProgress).where(eq(topicProgress.userId, userId));
  await db.delete(topicStudyLogs).where(eq(topicStudyLogs.userId, userId));
  await db.delete(coachAlerts).where(eq(coachAlerts.userId, userId));

  // Profil: hedef ve günlük süre.
  await upsertStudentProfileStep(userId, 1, { preferredName: "Ece", examYear: 2027, targetScoreType: "SAY", targetUniversity: "Hacettepe Üniversitesi", targetDepartment: "Bilgisayar Mühendisliği", targetRanking: "25000", dailyStudyDuration: 120, preferredStudyStartTime: "17:00", mainGoal: "Bilgisayar mühendisi olmak" });
  await completeOnboarding(userId);

  // Denemeler: 6 TYT, 3 AYT; yavaş ama gerçekçi bir yükseliş.
  const tyt = [
    { t: 30.5, m: 10.25, f: 5.5, s: 7.5 }, { t: 31.75, m: 12.5, f: 6.25, s: 8 }, { t: 30.25, m: 14.75, f: 7, s: 8.75 },
    { t: 32.5, m: 16.25, f: 7.75, s: 9.25 }, { t: 33.25, m: 18.5, f: 8.5, s: 9.5 }, { t: 34.5, m: 19.25, f: 9.25, s: 10.25 },
  ];
  const lastDetails = [
    { subject: "Türkçe", topic: "Paragraf", questionCount: 26, correct: 21, wrong: 4, blank: 1 },
    { subject: "Türkçe", topic: "Sözcükte Anlam", questionCount: 8, correct: 7, wrong: 1, blank: 0 },
    { subject: "Türkçe", topic: "Dil Bilgisi", questionCount: 6, correct: 4, wrong: 1, blank: 1 },
    { subject: "Matematik", topic: "Problemler", questionCount: 16, correct: 7, wrong: 6, blank: 3 },
    { subject: "Matematik", topic: "Temel Kavramlar", questionCount: 14, correct: 9, wrong: 2, blank: 3 },
    { subject: "Matematik", topic: "Geometri", questionCount: 10, correct: 5, wrong: 2, blank: 3 },
    { subject: "Fen", topic: "Fizik", questionCount: 7, correct: 4, wrong: 2, blank: 1 },
    { subject: "Fen", topic: "Kimya", questionCount: 7, correct: 4, wrong: 1, blank: 2 },
    { subject: "Fen", topic: "Biyoloji", questionCount: 6, correct: 3, wrong: 1, blank: 2 },
    { subject: "Sosyal", topic: "Tarih", questionCount: 5, correct: 4, wrong: 1, blank: 0 },
    { subject: "Sosyal", topic: "Coğrafya", questionCount: 5, correct: 3, wrong: 1, blank: 1 },
    { subject: "Sosyal", topic: "Felsefe", questionCount: 5, correct: 3, wrong: 0, blank: 2 },
    { subject: "Sosyal", topic: "Din Kültürü", questionCount: 5, correct: 3, wrong: 1, blank: 1 },
  ].map((row) => ({ ...row, accuracy: Math.round((row.correct / row.questionCount) * 100), net: row.correct - row.wrong / 4 }));
  let previousNet = 0;
  await addUserMockExams(userId, tyt.map((row, index) => {
    const net = row.t + row.m + row.f + row.s;
    const delta = index ? net - previousNet : 0;
    previousNet = net;
    return { title: `TYT Deneme ${index + 1}`, exam: "TYT" as const, examDate: at(-7 * (tyt.length - 1 - index) - 2), net, delta, subjects: { Türkçe: row.t, Matematik: row.m, Fen: row.f, Sosyal: row.s }, timeSpent: {}, topicNets: {}, topicDetails: index === tyt.length - 1 ? lastDetails : [], importedFrom: "manual" as const };
  }));
  const ayt = [{ m: 14.5, f: 13.75 }, { m: 16.25, f: 15.5 }, { m: 18.75, f: 17 }];
  previousNet = 0;
  await addUserMockExams(userId, ayt.map((row, index) => {
    const net = row.m + row.f;
    const delta = index ? net - previousNet : 0;
    previousNet = net;
    return { title: `AYT Deneme ${index + 1}`, exam: "AYT" as const, examDate: at(-14 * (ayt.length - 1 - index) - 5), net, delta, subjects: { Matematik: row.m, Fen: row.f }, timeSpent: {}, topicNets: {}, topicDetails: [], importedFrom: "manual" as const };
  }));

  // Konu ilerlemesi: katalogdaki gerçek konulardan, ders başına birkaç tane.
  const catalog = await getTopicCatalog();
  const accuracyBySubject: Record<string, number[]> = { Türkçe: [82, 76, 64], Matematik: [44, 58, 71, 38], Geometri: [52, 47], Fizik: [36, 49], Kimya: [55, 42], Biyoloji: [61, 57], Tarih: [68, 74], Coğrafya: [59], Felsefe: [63] };
  let progressCount = 0;
  for (const exam of ["TYT", "AYT"] as const) {
    for (const [subject, accuracies] of Object.entries(accuracyBySubject)) {
      const picks = catalog.filter((topic) => topic.exam === exam && topic.subject === subject).slice(0, exam === "TYT" ? accuracies.length : Math.min(2, accuracies.length));
      for (const [index, topic] of picks.entries()) {
        await upsertTopicProgress(userId, { exam, subject, topic: topic.topic, accuracy: accuracies[index] - (exam === "AYT" ? 8 : 0), questionCount: 40, studyDate: at(-index - 1) });
        progressCount++;
      }
    }
  }

  // Son 7 günün çalışma kayıtları (bugün hariç; bugünkü süre planın tamamlanan görevinden gelir).
  const logs: Array<[number, string, string, number, number, number]> = [
    [-6, "Matematik", "Problemler", 70, 30, 19], [-6, "Türkçe", "Paragraf", 40, 25, 21],
    [-5, "Fizik", "Elektrik", 55, 20, 11], [-4, "Matematik", "Temel Kavramlar", 80, 35, 27],
    [-4, "Kimya", "Mol Kavramı", 35, 15, 9], [-3, "Türkçe", "Dil Bilgisi", 45, 20, 14],
    [-2, "Matematik", "Problemler", 90, 40, 26], [-2, "Biyoloji", "Hücre", 30, 15, 10],
    [-1, "Geometri", "Üçgenler", 60, 25, 15], [-1, "Tarih", "Osmanlı Kuruluş", 35, 20, 16],
  ];
  for (const [day, subject, topic, minutes, questions, correct] of logs) {
    await addTopicStudyLog(userId, { subject, topic, studyDate: at(day, 18), minutes, questions, correct, wrong: questions - correct - 1, blank: 1, note: null, sessionId: null });
  }

  // Bugünün ve yarının planı; ilk görev tamamlanmış.
  await saveStudyPlan(userId, {
    title: "Haftalık çalışma planı", weekStart: at(0, 0), weekEnd: at(6, 23), summary: "Problemler ve paragraf ağırlıklı hafta.", source: "manual",
    sessions: [
      { sessionDate: at(0, 16, 0), title: "Problemler tekrar", subject: "Matematik", topic: "Problemler", kind: "Tekrar", plannedMinutes: 45, targetQuestions: 25 },
      { sessionDate: at(0, 17, 0), title: "Paragraf soru çözümü", subject: "Türkçe", topic: "Paragraf", kind: "Soru çözümü", plannedMinutes: 40, targetQuestions: 20 },
      { sessionDate: at(0, 18, 0), title: "Elektrik konu tekrarı", subject: "Fizik", topic: "Elektrik", kind: "Konu tekrarı", plannedMinutes: 35, targetQuestions: 15 },
      { sessionDate: at(1, 17, 0), title: "Üçgenler", subject: "Geometri", topic: "Üçgenler", kind: "Soru çözümü", plannedMinutes: 45, targetQuestions: 20 },
      { sessionDate: at(1, 18, 0), title: "Hücre bölünmesi", subject: "Biyoloji", topic: "Hücre", kind: "Konu tekrarı", plannedMinutes: 30 },
    ],
  });
  const calendar = await getStudyCalendar(userId);
  const first = calendar.sessions.find((session) => session.topic === "Problemler" && session.status === "planned");
  if (first) await completeStudySession(userId, { sessionId: first.id, actualMinutes: 45, actualQuestions: 25, correct: 18, wrong: 5, blank: 2 });

  // Bildirim örneği (koç uyarısı).
  await db.insert(coachAlerts).values([
    { userId, level: "warning", ruleKey: "seed_problemler", title: "Problemlerde hata oranı yüksek", message: "Son denemede Problemler sorularının %38'i yanlış ya da boş. Bu hafta iki tekrar oturumu önerilir." },
    { userId, level: "success", ruleKey: "seed_streak", title: "6 gündür kesintisiz çalışıyorsun", message: "Ritmini koru; bugünkü planın hazır." },
  ]);

  console.log(JSON.stringify({ userId, exams: tyt.length + ayt.length, topicProgress: progressCount, logs: logs.length, plannedSessions: 5 }));
  process.exit(0);
}

main().catch((error) => { console.error(error); process.exit(1); });
