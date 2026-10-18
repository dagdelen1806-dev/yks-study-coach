import { describe, expect, it } from "vitest";
import { buildSessionCompletion } from "../shared/calendarLogic";
import { topicLogRow } from "./db";

describe("topicLogRow", () => {
  it("writes the completed session's minutes and questions into the log columns", () => {
    const completedAt = new Date("2026-10-18T14:00:00Z");
    const plan = buildSessionCompletion({ id: 42, subject: "Matematik", topic: "Problemler" } as never, { actualMinutes: 45, actualQuestions: 25, correct: 18, wrong: 5, blank: 2, actualPages: 12, note: "iyi" }, completedAt);
    expect(topicLogRow(7, plan.topicLog)).toEqual({ userId: 7, sessionId: 42, subject: "Matematik", topic: "Problemler", studyDate: completedAt, minutes: 45, questions: 25, correct: 18, wrong: 5, blank: 2, note: "iyi" });
  });
});
