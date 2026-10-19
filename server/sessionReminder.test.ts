import { describe, expect, it } from "vitest";
import { NOTEBOOK_REVIEW_TASK_KIND } from "../shared/questionNotebook";
import { buildReminderMessage, isReminderDue } from "../shared/sessionReminder";

const now = new Date(Date.UTC(2026, 9, 19, 14, 0));
const inMinutes = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe("isReminderDue", () => {
  it("fires between 2 and 20 minutes before the session", () => {
    expect(isReminderDue(inMinutes(10), now)).toBe(true);
    expect(isReminderDue(inMinutes(2), now)).toBe(true);
    expect(isReminderDue(inMinutes(20), now)).toBe(true);
  });

  it("stays quiet for sessions too far away, about to start or already started", () => {
    expect(isReminderDue(inMinutes(21), now)).toBe(false);
    expect(isReminderDue(inMinutes(1), now)).toBe(false);
    expect(isReminderDue(inMinutes(-5), now)).toBe(false);
  });
});

describe("buildReminderMessage", () => {
  const session = { id: 42, sessionDate: inMinutes(12), subject: "Türkçe", topic: "Paragraf", kind: "Konu çalışması", plannedMinutes: 40 };

  it("tells the real time left and deep-links to the session's focus screen", () => {
    const message = buildReminderMessage(session, now);
    expect(message.title).toBe("12 dk sonra: Paragraf");
    expect(message.body).toContain("Türkçe · 40 dk");
    expect(message.url).toBe("/?odak=42");
    expect(message.tag).toBe("session-42");
  });

  it("uses review wording for notebook review tasks", () => {
    expect(buildReminderMessage({ ...session, kind: NOTEBOOK_REVIEW_TASK_KIND }, now).title).toBe("12 dk sonra: soru defteri tekrarı");
  });
});
