import { describe, expect, it } from "vitest";
import { resourceCatalogConfig } from "./config";
import { RuleBasedDifficultyClassifier } from "./difficulty/ruleBasedClassifier";
import { HybridDifficultyClassifier } from "./difficulty/hybridClassifier";
import type { DifficultyClassifierInterface } from "./difficulty/types";

const rule = new RuleBasedDifficultyClassifier();

describe("RuleBasedDifficultyClassifier", () => {
  it("'sıfırdan' / 'temel' gibi kolay sinyalleri düşük skora çevirir", async () => {
    const result = await rule.classify({ title: "Matematik 0 Sıfırdan Temel Konu Anlatımı" });
    expect(result.label).toBe("easy");
    expect(result.score).toBeLessThan(resourceCatalogConfig.difficulty.thresholds.easyMax + 1);
  });

  it("'ileri düzey' / 'zor' gibi zor sinyalleri yüksek skora çevirir", async () => {
    const result = await rule.classify({ title: "AYT Matematik İleri Düzey Zor Soru Bankası" });
    expect(result.label).toBe("hard");
  });

  it("'Zorunlu' kelimesi 'zor' sinyalini YANLIŞLIKLA tetiklemez (kelime sınırı koruması)", async () => {
    const result = await rule.classify({ title: "TYT Zorunlu Din Kültürü ve Ahlak Bilgisi Konu Özeti" });
    // "zorunlu" içinde "zor" geçse de token eşleşmesi kelime bazlı olduğundan tetiklenmemeli.
    expect(result.rationale).not.toContain("zor sinyalleri");
  });

  it("hiçbir anahtar kelime yoksa nötr skor ve düşük güven döner", async () => {
    const result = await rule.classify({ title: "TYT Türkçe Deneme Sınavı 12" });
    expect(result.score).toBe(50);
    expect(result.confidence).toBeLessThan(0.5);
  });

  it("book type kitabın zorluğunu tek başına belirlemez, sadece kaydırır", async () => {
    const topicExplanation = await rule.classify({ title: "Matematik Konu Anlatımı", bookType: "topic_explanation" });
    const questionBank = await rule.classify({ title: "Matematik Konu Anlatımı", bookType: "question_bank" });
    expect(topicExplanation.score).toBeLessThan(questionBank.score);
  });
});

class StubAiClassifier implements DifficultyClassifierInterface {
  readonly method = "ai" as const;
  constructor(private readonly result: Awaited<ReturnType<DifficultyClassifierInterface["classify"]>> | null = null) {}
  async classify() {
    return (
      this.result ?? {
        label: "hard" as const,
        score: 90,
        confidence: 0.9,
        rationale: "stub",
        model: "ai:stub",
        classifiedAt: new Date().toISOString(),
      }
    );
  }
}

class UnavailableAiClassifier implements DifficultyClassifierInterface {
  readonly method = "ai" as const;
  async classify() {
    return { label: "medium" as const, score: 50, confidence: 0, rationale: "unavailable", model: "ai:unavailable", classifiedAt: new Date().toISOString() };
  }
}

describe("HybridDifficultyClassifier", () => {
  it("--no-ai / AI kapalıyken sadece kural katmanına dayanır (sistem çalışmaya devam eder)", async () => {
    const hybrid = new HybridDifficultyClassifier(rule, new StubAiClassifier());
    const result = await hybrid.classify({ title: "Matematik 0 Sıfırdan Başlangıç" }, { useAi: false });
    expect(result.rationale).toContain("AI: kullanılmadı");
    expect(result.model).toBe("hybrid-v1");
  });

  it("AI sağlayıcı kullanılamıyorsa (confidence 0) sonucu görmezden gelip kural katmanına döner", async () => {
    const hybrid = new HybridDifficultyClassifier(rule, new UnavailableAiClassifier());
    const ruleOnly = await rule.classify({ title: "AYT Matematik İleri Düzey Soru Bankası" });
    const result = await hybrid.classify({ title: "AYT Matematik İleri Düzey Soru Bankası" }, { useAi: true });
    expect(result.score).toBe(ruleOnly.score);
  });

  it("kural + AI birleşiminde her katmanın kendi güveniyle ağırlıklandığı bir sonuç üretir", async () => {
    const hybrid = new HybridDifficultyClassifier(rule, new StubAiClassifier());
    const result = await hybrid.classify({ title: "TYT Türkçe Deneme Sınavı" }, { useAi: true });
    // Kural nötr (50, düşük güven), AI 90 skor + yüksek güven verdiği için sonuç AI'ya doğru kaymalı ama tek başına 90 olmamalı.
    expect(result.score).toBeGreaterThan(50);
    expect(result.score).toBeLessThan(90);
  });

  it("kaynak meta verisindeki eski seviye etiketini (Kolay/Orta/Zor) bir sinyal olarak kullanır", async () => {
    const hybrid = new HybridDifficultyClassifier(rule, new UnavailableAiClassifier());
    const withHint = await hybrid.classify({ title: "TYT Türkçe Deneme Sınavı" }, { useAi: false, metadata: { legacyLevel: "Zor" } });
    const withoutHint = await hybrid.classify({ title: "TYT Türkçe Deneme Sınavı" }, { useAi: false });
    expect(withHint.score).toBeGreaterThan(withoutHint.score);
  });

  it("düşük güvenli sonuçlar review-eşiğinin altında kalır (çağıran taraf needsReview işaretleyebilsin diye)", async () => {
    const hybrid = new HybridDifficultyClassifier(rule, new UnavailableAiClassifier());
    const result = await hybrid.classify({ title: "TYT Türkçe Deneme Sınavı" }, { useAi: false });
    expect(result.confidence).toBeLessThan(resourceCatalogConfig.difficulty.reviewConfidenceThreshold);
  });
});
