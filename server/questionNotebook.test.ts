import { describe, expect, it, vi } from "vitest";
import { extractPlainText } from "../shared/noteContent";
import {
  REVIEW_INTERVALS_DAYS,
  buildErrorMap,
  buildQuestionDoc,
  describeErrorMapForPlan,
  firstReviewAt,
  isReviewDue,
  questionTitle,
  reviewTaskMinutes,
  scheduleAfterAttempt,
} from "../shared/questionNotebook";
import { referencedAttachmentIds } from "./notes/notesDb";
import { suggestQuestionDetails } from "./notes/questionAi";

const now = new Date(2026, 9, 17, 21, 30);
const daysLater = (date: Date | null) => (date ? Math.round((date.getTime() - new Date(2026, 9, 17, 6).getTime()) / 86_400_000) : null);

describe("review ladder", () => {
  it("schedules a new card for the next day", () => {
    expect(daysLater(firstReviewAt(now))).toBe(1);
  });

  it("climbs 1 → 3 → 7 → 14 → 30 days on solved attempts and then masters the card", () => {
    let state = { reviewStage: 0 };
    const gaps: Array<number | null> = [];
    for (let i = 0; i < REVIEW_INTERVALS_DAYS.length; i += 1) {
      const next = scheduleAfterAttempt(state, "solved", false, now);
      gaps.push(daysLater(next.nextReviewAt));
      state = next;
      if (next.status === "mastered") break;
    }
    expect(gaps).toEqual([3, 7, 14, 30, null]);
    expect(scheduleAfterAttempt({ reviewStage: 4 }, "solved", false, now)).toEqual({ reviewStage: 5, status: "mastered", nextReviewAt: null });
  });

  it("does not count a solve after peeking at the solution as solved", () => {
    const next = scheduleAfterAttempt({ reviewStage: 2 }, "solved", true, now);
    expect(next.reviewStage).toBe(2);
    expect(next.status).toBe("learning");
    expect(daysLater(next.nextReviewAt)).toBe(7);
  });

  it("keeps the stage on a partial attempt and resets to the first step on a failed one", () => {
    expect(scheduleAfterAttempt({ reviewStage: 3 }, "partial", false, now)).toMatchObject({ reviewStage: 3, status: "learning" });
    const failed = scheduleAfterAttempt({ reviewStage: 3 }, "failed", false, now);
    expect(failed).toMatchObject({ reviewStage: 0, status: "unsolved" });
    expect(daysLater(failed.nextReviewAt)).toBe(1);
  });

  it("treats anything up to the end of today as due", () => {
    expect(isReviewDue(new Date(2026, 9, 17, 23, 0), now)).toBe(true);
    expect(isReviewDue(new Date(2026, 9, 18, 6, 0), now)).toBe(false);
    expect(isReviewDue(null, now)).toBe(false);
  });

  it("sizes the review task at ~5 minutes per question within 10–60", () => {
    expect([reviewTaskMinutes(1), reviewTaskMinutes(4), reviewTaskMinutes(20)]).toEqual([10, 20, 60]);
  });
});

describe("error map", () => {
  const rows = [
    { subject: "Matematik", topic: "Problemler", topicId: 7, errorType: "method", status: "unsolved" as const },
    { subject: "Matematik", topic: "Problemler", topicId: 7, errorType: "method", status: "learning" as const },
    { subject: "Matematik", topic: "Problemler", topicId: 7, errorType: "calculation", status: "unsolved" as const },
    { subject: "Kimya", topic: "Mol", topicId: 9, errorType: "concept", status: "mastered" as const },
    { subject: "Fizik", topic: null, topicId: null, errorType: null, status: "unsolved" as const },
    { subject: "Fizik", topic: null, topicId: null, errorType: "bogus", status: "unsolved" as const },
  ];

  it("counts by topic, ranks by open questions and finds the most marked error type", () => {
    const map = buildErrorMap(rows);
    expect(map.total).toBe(6);
    expect(map.open).toBe(5);
    expect(map.topics.map((item) => [item.subject, item.topic, item.open])).toEqual([["Matematik", "Problemler", 3], ["Fizik", null, 2], ["Kimya", "Mol", 0]]);
    expect(map.topics[0].topErrorType).toBe("method");
    expect(map.errorTypes).toEqual([{ type: "method", count: 2 }, { type: "calculation", count: 1 }, { type: "concept", count: 1 }]);
  });

  it("describes only open topics for the plan prompt, in neutral language", () => {
    const text = describeErrorMapForPlan(buildErrorMap(rows))!;
    expect(text).toContain("Matematik / Problemler: 3 çözülemeyen soru (en sık işaretlenen hata türü: Formül / yöntem seçimi)");
    expect(text).not.toContain("Mol");
    expect(describeErrorMapForPlan(buildErrorMap([]))).toBeNull();
  });
});

describe("question note content", () => {
  it("keeps photos and the voice clip referenced so attachments stay linked to the note", () => {
    const doc = buildQuestionDoc({ questionImageId: 11, questionOcrText: "f(g(2)) kaçtır?", stuckPoint: "f ve g sırasını karıştırıyorum", voiceAttachmentId: 12, voiceDuration: 9, solutionImageId: 13, solutionText: "Önce içteki fonksiyon" });
    expect(referencedAttachmentIds(doc).sort()).toEqual([11, 12, 13]);
    const text = extractPlainText(doc);
    expect(text).toContain("f(g(2)) kaçtır?");
    expect(text).toContain("f ve g sırasını karıştırıyorum");
    expect(text).toContain("Önce içteki fonksiyon");
  });

  it("titles the card by subject and topic", () => {
    expect(questionTitle("Matematik", "Fonksiyonlar", now)).toBe("❓ Matematik · Fonksiyonlar");
    expect(questionTitle(null, null, now)).toMatch(/^❓ Soru · 17 Ekim/);
  });
});

describe("question suggestion (AI)", () => {
  const topics = [
    { id: 7, subject: "Matematik", unit: "Sayılar", topic: "Problemler" },
    { id: 8, subject: "Matematik", unit: "Fonksiyonlar", topic: "Bileşke fonksiyon" },
  ];
  const reply = (body: object) => vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify(body) } }] })) as never;

  it("accepts only topics from the curriculum list and maps the subject from it", async () => {
    const result = await suggestQuestionDetails({ imageDataUrl: "data:image/png;base64,AAAA", stuckPoint: "hangi formülü kullanacağımı bilemedim", topics }, reply({ ocrText: " f(g(x)) ", topicId: 8, difficulty: "medium", errorType: "method" }));
    expect(result).toEqual({ ocrText: "f(g(x))", topicId: 8, subject: "Matematik", difficulty: "medium", errorType: "method" });
  });

  it("drops an invented topic id and an unknown error type instead of guessing", async () => {
    const result = await suggestQuestionDetails({ imageDataUrl: null, stuckPoint: "anlamadım", topics }, reply({ ocrText: "", topicId: 999, difficulty: "weird", errorType: "none" }));
    expect(result).toEqual({ ocrText: "", topicId: null, subject: null, difficulty: null, errorType: null });
  });

  it("sends the photo only as an image part and lists the curriculum in the instructions", async () => {
    const invoke = reply({ ocrText: "", topicId: 0, difficulty: "easy", errorType: "none" });
    await suggestQuestionDetails({ imageDataUrl: "data:image/png;base64,AAAA", stuckPoint: null, topics }, invoke);
    const messages = (invoke as unknown as { mock: { calls: Array<[{ messages: Array<{ content: unknown }> }]> } }).mock.calls[0][0].messages;
    expect(String(messages[0].content)).toContain("8|Matematik|Fonksiyonlar|Bileşke fonksiyon");
    expect(messages[1].content).toEqual([{ type: "text", text: "Öğrenci takıldığı yeri yazmadı." }, { type: "image_url", image_url: { url: "data:image/png;base64,AAAA", detail: "high" } }]);
  });

  it("refuses to run with neither a photo nor a description", async () => {
    await expect(suggestQuestionDetails({ imageDataUrl: null, stuckPoint: "  ", topics }, reply({}))).rejects.toThrow(/fotoğraf/);
  });
});
