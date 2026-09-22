import { describe, expect, it } from "vitest";
import {
  calculateTopicResult,
  getNextStatus,
  getStatusFromProgress,
  initialExams,
  resourceBookCatalog,
  subjectOrder,
  topicCounts,
  topicSeeds,
  trackedTopics,
} from "../shared/yksData";

describe("YKS konu durumları", () => {
  it("ilerlemeyi zayıf, orta ve iyi seviyelere ayırır (%55 / %85 eşikleri)", () => {
    expect(getStatusFromProgress(20)).toBe("Zayıf");
    expect(getStatusFromProgress(54)).toBe("Zayıf");
    expect(getStatusFromProgress(55)).toBe("Orta");
    expect(getStatusFromProgress(70)).toBe("Orta");
    expect(getStatusFromProgress(84)).toBe("Orta");
    expect(getStatusFromProgress(85)).toBe("İyi");
    expect(getStatusFromProgress(95)).toBe("İyi");
  });

  it("konu durumunu kullanıcı etkileşimi için döngüsel ilerletir", () => {
    expect(getNextStatus("Zayıf")).toBe("Orta");
    expect(getNextStatus("Orta")).toBe("İyi");
    expect(getNextStatus("İyi")).toBe("Zayıf");
  });

  it("başlangıç kataloğunda her üç seviyeden konu bulunur", () => {
    expect(topicSeeds.length).toBeGreaterThan(5);
    expect(topicCounts.weak).toBeGreaterThan(0);
    expect(topicCounts.medium).toBeGreaterThan(0);
    expect(topicCounts.good).toBeGreaterThan(0);
  });

  it("başlangıç deneme trendi artış yönündedir", () => {
    expect(initialExams[0].net).toBeGreaterThan(initialExams[1].net);
    expect(initialExams[1].net).toBeGreaterThan(initialExams[2].net);
  });

  it("denemelerde ders süresi ve konu bazlı trend verisi bulunur", () => {
    expect(initialExams.every((exam) => subjectOrder.every((subject) => typeof exam.timeSpent?.[subject] === "number"))).toBe(true);
    expect(initialExams.every((exam) => trackedTopics.every(({ topic }) => typeof exam.topicNets?.[topic] === "number"))).toBe(true);

    const first = initialExams.at(-1)?.topicNets?.Problemler ?? 0;
    const latest = initialExams[0]?.topicNets?.Problemler ?? 0;
    expect(latest).toBeGreaterThan(first);
  });

  it("konu satırından doğruluk ve neti hesaplar", () => {
    expect(calculateTopicResult({ subject: "Matematik", topic: "Problemler", questionCount: 20, correct: 12, wrong: 4, blank: 4 })).toMatchObject({ accuracy: 60, net: 11, questionCount: 20 });
  });

  it("kaynak kataloğu ders ve seviye çeşitliliği sunar", () => {
    expect(resourceBookCatalog.length).toBeGreaterThan(10);
    expect(new Set(resourceBookCatalog.map((book) => book.subject))).toEqual(new Set(["Türkçe", "Matematik", "Fen", "Sosyal"]));
    expect(new Set(resourceBookCatalog.map((book) => book.level))).toEqual(new Set(["Kolay", "Orta", "Zor"]));
    expect(resourceBookCatalog.every((book) => book.sourceUrl.startsWith("https://"))).toBe(true);
  });
});
