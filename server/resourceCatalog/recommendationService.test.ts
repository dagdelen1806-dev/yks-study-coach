import { describe, expect, it } from "vitest";
import { recommendBooksForTopic, recommendForStudent, type RecommendationCandidateBook, type StudentTopicPerformance } from "./recommendationService";

const easyBook: RecommendationCandidateBook = {
  id: 1,
  name: "Matematik 0 Sıfırdan Temel",
  subject: "Matematik",
  examScope: "TYT",
  bookType: "topic_explanation",
  difficultyLabel: "easy",
  difficultyScore: 20,
  difficultyConfidence: 0.8,
  active: true,
  mappedTopicNames: ["Problemler"],
};

const mediumBook: RecommendationCandidateBook = {
  id: 2,
  name: "TYT Matematik Soru Bankası",
  subject: "Matematik",
  examScope: "TYT",
  bookType: "question_bank",
  difficultyLabel: "medium",
  difficultyScore: 50,
  difficultyConfidence: 0.8,
  active: true,
  mappedTopicNames: ["Problemler"],
};

const hardBook: RecommendationCandidateBook = {
  id: 3,
  name: "TYT Matematik İleri Düzey Soru Bankası",
  subject: "Matematik",
  examScope: "TYT",
  bookType: "question_bank",
  difficultyLabel: "hard",
  difficultyScore: 85,
  difficultyConfidence: 0.8,
  active: true,
  mappedTopicNames: ["Problemler"],
};

const offTopicBook: RecommendationCandidateBook = {
  id: 4,
  name: "TYT Türkçe Paragraf",
  subject: "Türkçe",
  examScope: "TYT",
  bookType: "question_bank",
  difficultyLabel: "medium",
  difficultyScore: 50,
  difficultyConfidence: 0.8,
  active: true,
};

const books = [easyBook, mediumBook, hardBook, offTopicBook];

const weakTopic: StudentTopicPerformance = { subject: "Matematik", topic: "Problemler", exam: "TYT", accuracy: 30, status: "Zayıf" };
const strongTopic: StudentTopicPerformance = { subject: "Matematik", topic: "Problemler", exam: "TYT", accuracy: 92, status: "İyi" };

describe("ResourceRecommendationService", () => {
  it("zayıf konu için kolay kaynağı öne çıkarır", () => {
    const recs = recommendBooksForTopic(weakTopic, books);
    expect(recs[0].bookId).toBe(easyBook.id);
    expect(recs[0].label).toBe("Seviyene uygun");
  });

  it("iyi seviyedeki konu için zor kaynağı öne çıkarır", () => {
    const recs = recommendBooksForTopic(strongTopic, books);
    expect(recs[0].bookId).toBe(hardBook.id);
  });

  it("dersi tutmayan kaynağı listelemez (konu eşleşmesi + ders eşleşmesi olmayan)", () => {
    const recs = recommendBooksForTopic(weakTopic, books);
    expect(recs.some((r) => r.bookId === offTopicBook.id)).toBe(false);
  });

  it("düşük confidence'lı zorluk sınıflandırmasını açıkça belirtir (gerçekmiş gibi göstermez)", () => {
    const lowConfidenceBook: RecommendationCandidateBook = { ...easyBook, id: 5, difficultyConfidence: 0.2 };
    const recs = recommendBooksForTopic(weakTopic, [lowConfidenceBook]);
    expect(recs[0].reason).toContain("düşük güven");
  });

  it("kesin ticari yönlendirme ifadesi kullanmaz (yalnızca açıklayıcı etiketler)", () => {
    const recs = recommendBooksForTopic(weakTopic, books);
    for (const rec of recs) {
      expect(rec.label).not.toMatch(/kesinlikle|mutlaka al/i);
    }
  });

  it("zayıf konuları önceliklendirir (recommendForStudent)", () => {
    const topics: StudentTopicPerformance[] = [strongTopic, weakTopic];
    const recs = recommendForStudent(topics, books, { limitPerTopic: 1, overallLimit: 2 });
    expect(recs[0].status).toBe("Zayıf");
  });

  it("skor 0-100 aralığındadır", () => {
    const recs = recommendBooksForTopic(weakTopic, books);
    for (const rec of recs) {
      expect(rec.score).toBeGreaterThanOrEqual(0);
      expect(rec.score).toBeLessThanOrEqual(100);
    }
  });
});
