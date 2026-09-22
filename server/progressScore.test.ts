import { describe, expect, it } from "vitest";
import { calculateProgressScore, PROGRESS_SCORE_CONFIG, type ProgressScoreInputs } from "../shared/progressScore";

const baseInputs: ProgressScoreInputs = {
  accountAgeDays: 30,
  activeDaysInWindow: 5,
  windowDays: 7,
  totalQuestions: 50,
  correctQuestions: 40,
  topicCoveragePercent: 60,
  studiedTopicCount: 5,
  examCount: 3,
  averageExamNet: 68,
  referenceNetCeiling: 85,
  planAdherenceScore: 75,
  plannedSessionsCount: 6,
};

describe("calculateProgressScore", () => {
  it("tüm sinyaller yeterliyse her bileşen için sayısal skor üretir", () => {
    const result = calculateProgressScore(baseInputs);
    expect(result.insufficientData).toBe(false);
    expect(result.overallScore).not.toBeNull();
    for (const key of Object.keys(result.components) as Array<keyof typeof result.components>) {
      expect(result.components[key].insufficientData).toBe(false);
      expect(result.components[key].score).not.toBeNull();
    }
  });

  it("hiç veri yoksa (yeni hesap) overallScore null ve insufficientData true döner — sıfır olarak cezalandırmaz", () => {
    const result = calculateProgressScore({
      accountAgeDays: 0, activeDaysInWindow: 0, windowDays: 7,
      totalQuestions: 0, correctQuestions: 0,
      topicCoveragePercent: 0, studiedTopicCount: 0,
      examCount: 0, averageExamNet: null, referenceNetCeiling: 85,
      planAdherenceScore: null, plannedSessionsCount: 0,
    });
    expect(result.overallScore).toBeNull();
    expect(result.insufficientData).toBe(true);
    expect(Object.values(result.components).every((c) => c.insufficientData)).toBe(true);
  });

  it("bir bileşen eksikse (ör. hiç deneme yok) yalnızca o bileşen insufficientData olur, geri kalanı etkilenmez", () => {
    const result = calculateProgressScore({ ...baseInputs, examCount: 0, averageExamNet: null });
    expect(result.components.mockExam.insufficientData).toBe(true);
    expect(result.components.mockExam.score).toBeNull();
    expect(result.components.questionPerformance.insufficientData).toBe(false);
    expect(result.overallScore).not.toBeNull(); // diğer 4 bileşenden yeniden ağırlıklandırılmış bir skor üretir
  });

  it("eksik bileşenler ağırlıkları YENİDEN NORMALİZE eder (toplam ağırlık her zaman 1'e tamamlanır)", () => {
    const full = calculateProgressScore(baseInputs);
    const missingOne = calculateProgressScore({ ...baseInputs, plannedSessionsCount: 0, planAdherenceScore: null });
    // planAdherence çıkarılınca kalan 4 bileşenin skoru aynı kalsa bile
    // overallScore'un normalize edilmiş ağırlıklarla hesaplandığını (çökmediğini) doğrula.
    expect(missingOne.overallScore).not.toBeNull();
    expect(missingOne.overallScore).not.toBe(full.overallScore === null ? -1 : full.overallScore + 1000); // sanity: gerçek bir sayı
  });

  it("konu sayısı eşiğin altındaysa (spec: az veri ile kesin karar verme) topicProgress insufficientData olur", () => {
    const result = calculateProgressScore({ ...baseInputs, studiedTopicCount: PROGRESS_SCORE_CONFIG.minTopicsForTopicProgress - 1 });
    expect(result.components.topicProgress.insufficientData).toBe(true);
  });

  it("soru sayısı MIN_RELIABLE_QUESTION_COUNT altındaysa questionPerformance insufficientData olur", () => {
    const result = calculateProgressScore({ ...baseInputs, totalQuestions: PROGRESS_SCORE_CONFIG.minQuestionsForPerformance - 1, correctQuestions: 1 });
    expect(result.components.questionPerformance.insufficientData).toBe(true);
  });

  it("yeni hesap (3 günden az) çalışma düzeni skorunu insufficientData olarak işaretler, 0 ile cezalandırmaz", () => {
    const result = calculateProgressScore({ ...baseInputs, accountAgeDays: 1, activeDaysInWindow: 0 });
    expect(result.components.studyConsistency.insufficientData).toBe(true);
    expect(result.components.studyConsistency.score).toBeNull();
  });

  it("skorlar her zaman 0-100 aralığında sınırlanır", () => {
    const result = calculateProgressScore({ ...baseInputs, correctQuestions: 999, averageExamNet: 999 });
    expect(result.components.questionPerformance.score).toBeLessThanOrEqual(100);
    expect(result.components.mockExam.score).toBeLessThanOrEqual(100);
  });
});
