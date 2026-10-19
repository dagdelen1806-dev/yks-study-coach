import { describe, expect, it } from "vitest";
import { buildWeeklyDigest, weeklyDigestWindow, type DigestLog, type DigestSession } from "../shared/weeklyDigest";
import { buildWeeklyDigestEmail } from "./_core/emails/weeklyDigestEmail";

const start = new Date(2026, 9, 12, 0, 0);
const end = new Date(2026, 9, 19, 0, 0);
const day = (offset: number, hour = 17) => new Date(2026, 9, 12 + offset, hour, 0);
const session = (offset: number, status: DigestSession["status"]): DigestSession => ({ sessionDate: day(offset), status, plannedMinutes: 40 });
const log = (offset: number, subject: string, minutes: number, questions = 0, correct = 0): DigestLog => ({ studyDate: day(offset), subject, minutes, questions, correct });

describe("buildWeeklyDigest", () => {
  it("counts only the week's sessions and logs, ignoring skipped sessions", () => {
    const digest = buildWeeklyDigest({
      sessions: [session(0, "completed"), session(1, "completed"), session(2, "planned"), session(3, "skipped"), session(8, "completed")],
      logs: [log(0, "Matematik", 40, 20, 15), log(1, "Matematik", 30, 10, 5), log(1, "Fizik", 20), log(-1, "Kimya", 99)],
      weakTopics: [],
      dueReviews: 0,
      start,
      end,
    });
    expect(digest.plannedSessions).toBe(3);
    expect(digest.completedSessions).toBe(2);
    expect(digest.completionRate).toBe(67);
    expect(digest.minutes).toBe(90);
    expect(digest.questions).toBe(30);
    expect(digest.accuracy).toBe(67);
    expect(digest.activeDays).toBe(2);
    expect(digest.topSubject).toEqual({ subject: "Matematik", minutes: 70 });
  });

  it("nudges an idle student to restart small", () => {
    const digest = buildWeeklyDigest({ sessions: [session(0, "planned")], logs: [], weakTopics: [{ subject: "Matematik", topic: "Türev", progress: 30 }], dueReviews: 4, start, end });
    expect(digest.headline).toContain("kayıtlı bir çalışman yok");
    expect(digest.suggestion).toContain("Küçük başla");
    expect(digest.accuracy).toBeNull();
  });

  it("suggests lightening a plan when under half was done", () => {
    const digest = buildWeeklyDigest({ sessions: [session(0, "completed"), session(1, "planned"), session(2, "planned"), session(3, "planned")], logs: [log(0, "Türkçe", 40)], weakTopics: [], dueReviews: 0, start, end });
    expect(digest.suggestion).toContain("Planı hafiflet");
  });

  it("does not call the plan heavy when the student studied most days off-plan", () => {
    const logs = [0, 1, 2, 3, 4].map((offset) => log(offset, "Matematik", 60));
    const digest = buildWeeklyDigest({ sessions: [session(0, "completed"), session(1, "planned"), session(2, "planned"), session(3, "planned")], logs, weakTopics: [{ subject: "Kimya", topic: "Gazlar", progress: 34 }], dueReviews: 0, start, end });
    expect(digest.suggestion).toContain("Gazlar (Kimya)");
  });

  it("points at the weakest topic, then due reviews", () => {
    const base = { sessions: [session(0, "completed")], logs: [log(0, "Türkçe", 40)], start, end };
    expect(buildWeeklyDigest({ ...base, weakTopics: [{ subject: "Fizik", topic: "Elektrik", progress: 40 }], dueReviews: 3 }).suggestion).toContain("Elektrik (Fizik)");
    expect(buildWeeklyDigest({ ...base, weakTopics: [], dueReviews: 3 }).suggestion).toContain("3 soru");
  });

  it("aligns the window to seven Istanbul calendar days ending now", () => {
    // Pazar 18 Ekim 2026, 18:00 İstanbul = 15:00 UTC (cron saati).
    const now = new Date(Date.UTC(2026, 9, 18, 15, 0));
    const { start, end } = weeklyDigestWindow(now);
    expect(start.toISOString()).toBe("2026-10-11T21:00:00.000Z"); // Pazartesi 12 Ekim 00:00 İstanbul
    expect(end).toBe(now);
  });

  it("celebrates a week with most of the plan done", () => {
    const digest = buildWeeklyDigest({ sessions: [session(0, "completed"), session(1, "completed"), session(2, "completed"), session(3, "completed"), session(4, "planned")], logs: [log(0, "Türkçe", 40)], weakTopics: [], dueReviews: 0, start, end });
    expect(digest.headline).toContain("%80");
  });
});

describe("buildWeeklyDigestEmail", () => {
  const digest = buildWeeklyDigest({ sessions: [session(0, "completed")], logs: [log(0, "Matematik", 40, 10, 8)], weakTopics: [{ subject: "Fizik", topic: "<Elektrik & Manyetizma>", progress: 28 }], dueReviews: 2, start, end });
  const mail = buildWeeklyDigestEmail({ to: "ece@ornek.com", name: "Ece", digest, start, end, appUrl: "https://pusula.example", unsubscribeUrl: "https://pusula.example/api/email/weekly-digest/unsubscribe?token=a.b.c" });

  it("escapes topic names in the HTML and keeps them readable in the text part", () => {
    expect(mail.html).toContain("&lt;Elektrik &amp; Manyetizma&gt;");
    expect(mail.html).not.toContain("<Elektrik");
    expect(mail.text).toContain("<Elektrik & Manyetizma> (Fizik) · %28");
  });

  it("carries the unsubscribe link and the week range in both parts", () => {
    expect(mail.html).toContain("weekly-digest/unsubscribe?token=a.b.c");
    expect(mail.text).toContain("weekly-digest/unsubscribe?token=a.b.c");
    expect(mail.subject).toBe("Haftalık özetin · 12 – 18 Ekim");
  });
});
