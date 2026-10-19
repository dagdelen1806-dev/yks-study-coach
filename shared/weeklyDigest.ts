/**
 * Haftalık ilerleme e-postasının içeriği: son 7 günün oturum ve çalışma kayıtlarından
 * birkaç sayı + tek bir öneri. Veritabanından bağımsız (server/digest/weeklyDigest.ts doldurur).
 */
import { formatMinutes } from "./yksData";

export type DigestSession = { sessionDate: Date; status: "planned" | "completed" | "skipped"; plannedMinutes: number };
export type DigestLog = { studyDate: Date; subject: string; minutes: number; questions: number; correct: number };
export type DigestWeakTopic = { subject: string; topic: string; progress: number };

export type WeeklyDigest = {
  plannedSessions: number;
  completedSessions: number;
  completionRate: number | null;
  minutes: number;
  questions: number;
  accuracy: number | null;
  activeDays: number;
  topSubject: { subject: string; minutes: number } | null;
  weakTopics: DigestWeakTopic[];
  dueReviews: number;
  headline: string;
  suggestion: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
// Türkiye 2016'dan beri yaz/kış saati uygulamıyor: sabit UTC+3. Sunucu (Vercel) UTC'de çalışır;
// gün sınırları öğrencinin gününe göre hesaplanır.
const ISTANBUL_OFFSET_MS = 3 * 60 * 60 * 1000;
const dayKey = (date: Date) => Math.floor((date.getTime() + ISTANBUL_OFFSET_MS) / DAY_MS);

/** Özet penceresi: bugünü de içeren son 7 takvim günü (İstanbul), başlangıcı gece yarısı. */
export function weeklyDigestWindow(now: Date) {
  const startOfToday = dayKey(now) * DAY_MS - ISTANBUL_OFFSET_MS;
  return { start: new Date(startOfToday - 6 * DAY_MS), end: now };
}
const inWindow = (date: Date, start: Date, end: Date) => date >= start && date < end;

export function buildWeeklyDigest(input: { sessions: DigestSession[]; logs: DigestLog[]; weakTopics: DigestWeakTopic[]; dueReviews: number; start: Date; end: Date }): WeeklyDigest {
  const sessions = input.sessions.filter((session) => inWindow(session.sessionDate, input.start, input.end) && session.status !== "skipped");
  const logs = input.logs.filter((log) => inWindow(log.studyDate, input.start, input.end));
  const plannedSessions = sessions.length;
  const completedSessions = sessions.filter((session) => session.status === "completed").length;
  const completionRate = plannedSessions ? Math.round((completedSessions / plannedSessions) * 100) : null;
  const minutes = logs.reduce((sum, log) => sum + log.minutes, 0);
  const questions = logs.reduce((sum, log) => sum + log.questions, 0);
  const correct = logs.reduce((sum, log) => sum + log.correct, 0);
  const accuracy = questions ? Math.round((correct / questions) * 100) : null;
  const activeDays = new Set(logs.filter((log) => log.minutes > 0).map((log) => dayKey(log.studyDate))).size;
  const bySubject = new Map<string, number>();
  for (const log of logs) bySubject.set(log.subject, (bySubject.get(log.subject) ?? 0) + log.minutes);
  const top = Array.from(bySubject).sort((a, b) => b[1] - a[1])[0];
  const topSubject = top && top[1] > 0 ? { subject: top[0], minutes: top[1] } : null;
  const weakTopics = input.weakTopics.slice(0, 3);
  const idle = minutes === 0 && completedSessions === 0;

  const headline = idle
    ? "Bu hafta Pusula'da kayıtlı bir çalışman yok."
    : completionRate !== null && completionRate >= 80
      ? `Harika bir hafta: planının %${completionRate}'ini tamamladın.`
      : `Bu hafta ${activeDays} gün çalıştın, toplam ${formatMinutes(minutes)}.`;

  const suggestion = idle
    ? "Küçük başla: AI Planım'dan haftalık planını oluştur ve her gün tek bir kısa odak oturumu tamamla."
    // Plan dışında da çok çalışan öğrenciye "plan ağır" denmez; bu öneri az çalışılan hafta içindir.
    : plannedSessions >= 3 && completionRate !== null && completionRate < 50 && activeDays <= 3
      ? "Planın bu hafta ağır gelmiş olabilir. Takvim'deki \"Planı hafiflet\" ile oturumları kısalt; düzenli küçük adımlar daha çok kazandırır."
      : weakTopics[0]
        ? `${weakTopics[0].topic} (${weakTopics[0].subject}) için en az iki kısa oturum ayır.`
        : input.dueReviews > 0
          ? `Tekrar listende ${input.dueReviews} soru bekliyor; haftaya onlarla başla.`
          : "Aynı ritmi koru ve haftada bir deneme çözüp sonucunu ekle.";

  return { plannedSessions, completedSessions, completionRate, minutes, questions, accuracy, activeDays, topSubject, weakTopics, dueReviews: input.dueReviews, headline, suggestion };
}
