import { describe, expect, it } from "vitest";
import { buildSessionCompletion, rescheduleOverdueSessions } from "../shared/calendarLogic";

describe("rescheduleOverdueSessions", () => {
  const today = new Date("2026-09-18T00:00:00Z");
  const tomorrow = new Date("2026-09-19T00:00:00Z");
  const now = new Date("2026-09-18T09:00:00Z");

  it("moves only sessions dated before today, exactly once", () => {
    const sessions = [
      { id: 1, sessionDate: new Date("2026-09-16T12:00:00Z") },
      { id: 2, sessionDate: new Date("2026-09-18T12:00:00Z") },
      { id: 3, sessionDate: new Date("2026-09-20T12:00:00Z") },
    ];
    const result = rescheduleOverdueSessions(sessions, today, tomorrow, now);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({ id: 1, sessionDate: tomorrow, rescheduledFrom: sessions[0].sessionDate });
  });

  it("is idempotent: re-running against the already-rescheduled state produces no further moves", () => {
    const sessions = [{ id: 1, sessionDate: new Date("2026-09-16T12:00:00Z") }];
    const firstPass = rescheduleOverdueSessions(sessions, today, tomorrow, now);
    expect(firstPass).toHaveLength(1);

    const afterMove = [{ id: 1, sessionDate: firstPass[0].sessionDate }];
    const secondPass = rescheduleOverdueSessions(afterMove, today, tomorrow, now);
    expect(secondPass).toHaveLength(0);
  });

  it("does not duplicate sessions, only moves them", () => {
    const sessions = [{ id: 7, sessionDate: new Date("2026-09-10T12:00:00Z") }];
    const result = rescheduleOverdueSessions(sessions, today, tomorrow, now);
    expect(result).toHaveLength(1);
    expect(result.map((item) => item.id)).toEqual([7]);
  });
});

describe("buildSessionCompletion", () => {
  it("tamamlanan oturumdan hem oturum güncellemesini hem konu günlüğü kaydını üretir", () => {
    const session = { id: 42, subject: "Matematik", topic: "Problemler" };
    const completedAt = new Date("2026-09-18T10:00:00Z");
    const plan = buildSessionCompletion(session, { actualMinutes: 35, actualQuestions: 20, correct: 14, wrong: 4, blank: 2, note: "iyi gitti" }, completedAt);

    expect(plan.sessionUpdate).toMatchObject({ status: "completed", completedAt, actualMinutes: 35, actualQuestions: 20, correct: 14, wrong: 4, blank: 2 });
    expect(plan.topicLog).toMatchObject({ sessionId: 42, subject: "Matematik", topic: "Problemler", studyDate: completedAt, actualMinutes: 35, actualQuestions: 20, correct: 14, note: "iyi gitti" });
  });
});
