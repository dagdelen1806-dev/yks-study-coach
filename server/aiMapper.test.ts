import { describe, expect, it, vi } from "vitest";
import { CURRICULUM } from "../shared/curriculum";
import { suggestTopicsWithAi } from "./bookContent/aiMapper";
import { bookContentConfig } from "./bookContent/config";

const candidates = CURRICULUM.filter((def) => def.subject === "Türkçe").map((def, index) => ({ id: index + 1, ...def }));
const idOf = (topic: string) => candidates.find((item) => item.topic === topic)!.id;
const llmReturning = (answers: unknown) => vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ answers }) } }] })) as never;

describe("suggestTopicsWithAi — AI output is never trusted blindly", () => {
  const titles = [{ key: 0, text: "Metnin Bütününden Çıkarım", unitTitle: "YORUM" }, { key: 1, text: "Karma Tekrar", unitTitle: "" }];

  it("accepts only candidate ids and caps confidence below the auto threshold", async () => {
    const invoke = llmReturning([
      { key: 0, candidateTopicId: idOf("Paragrafta Anlam ve Yorum"), confidence: 0.99, reason: "Çıkarım soruları paragrafta anlam ve yorum kapsamında." },
      { key: 1, candidateTopicId: 99_999, confidence: 0.95, reason: "uydurma id" },
    ]);
    const result = await suggestTopicsWithAi(titles, candidates, invoke);
    expect(result).toEqual([{ key: 0, topicId: idOf("Paragrafta Anlam ve Yorum"), confidence: bookContentConfig.aiMapping.maxConfidence, reason: expect.any(String) }]);
    expect(result[0].confidence).toBeLessThan(bookContentConfig.mapping.autoSuggestMin);
  });

  it("drops null answers, unknown keys and low-confidence guesses", async () => {
    const invoke = llmReturning([
      { key: 0, candidateTopicId: null, confidence: 0.9, reason: "uyan yok" },
      { key: 1, candidateTopicId: idOf("Cümlede Anlam"), confidence: 0.3, reason: "emin değilim" },
      { key: 7, candidateTopicId: idOf("Cümlede Anlam"), confidence: 0.8, reason: "olmayan başlık" },
    ]);
    expect(await suggestTopicsWithAi(titles, candidates, invoke)).toEqual([]);
  });

  it("fails soft: a provider error yields no suggestions instead of breaking the scan", async () => {
    const invoke = vi.fn(async () => { throw new Error("timeout"); }) as never;
    expect(await suggestTopicsWithAi(titles, candidates, invoke)).toEqual([]);
  });

  it("does not call the provider when there is nothing ambiguous", async () => {
    const invoke = llmReturning([]);
    await suggestTopicsWithAi([], candidates, invoke);
    expect(invoke).not.toHaveBeenCalled();
  });
});
