import { describe, expect, it } from "vitest";
import { normalizeAiPlan } from "./studyPlan/normalizeAiPlan";

const fallback = { summary: "Yedek özet", focus: [], days: [{ day: "Pazartesi", date: "", totalMinutes: 30, sessions: [] }], coachNote: "Yedek not" };

describe("normalizeAiPlan", () => {
  it("eksik özet/notu doldurur, boş sayfa aralığını null yapar, toplam dakikayı yeniden hesaplar", () => {
    const plan = normalizeAiPlan({
      days: [{ day: "Pazartesi", date: "2026-10-19", totalMinutes: 999, sessions: [
        { title: "Türev soru", subject: "Matematik", topic: "Türev", minutes: 40, kind: "Soru", rationale: "zayıf", targetPages: "", targetTests: "3-4" },
        { subject: "Fizik", topic: "Kuvvet", minutes: "30", kind: "Bilinmeyen" },
      ] }],
    }, fallback);
    expect(plan.summary).toBe("Yedek özet");
    expect(plan.coachNote).toBe("Yedek not");
    expect(plan.days[0].totalMinutes).toBe(70);
    expect(plan.days[0].sessions[0]).toMatchObject({ targetPages: null, targetTests: "3-4" });
    expect(plan.days[0].sessions[1]).toMatchObject({ title: "Fizik · Kuvvet", minutes: 30, kind: "Soru" });
  });

  it("geçersiz oturumları atar; hiç kullanılabilir gün yoksa yedek planı döner", () => {
    expect(normalizeAiPlan({ summary: "x", days: [{ sessions: [{ subject: "", topic: "Türev", minutes: 40 }] }] }, fallback)).toBe(fallback);
    expect(normalizeAiPlan(null, fallback)).toBe(fallback);
    expect(normalizeAiPlan({ plan: { days: [] } }, fallback)).toBe(fallback);
  });

  it("geçerli yanıtı korur ve en fazla 7 gün alır", () => {
    const day = { day: "Gün", date: "", totalMinutes: 40, sessions: [{ title: "t", subject: "Kimya", topic: "Mol", minutes: 40, kind: "Tekrar", rationale: "r" }] };
    const plan = normalizeAiPlan({ summary: "Özet", focus: [{ topic: "Mol", subject: "Kimya", reason: "zayıf" }], days: Array(9).fill(day), coachNote: "Not" }, fallback);
    expect(plan.summary).toBe("Özet");
    expect(plan.days).toHaveLength(7);
    expect(plan.focus).toEqual([{ topic: "Mol", subject: "Kimya", reason: "zayıf" }]);
  });
});
