import { describe, expect, it, vi } from "vitest";
import { parseSimilarQuestion } from "../shared/questionNotebook";
import { generateSimilarQuestion } from "./notes/similarQuestion";

const sample = {
  question: "4x + 3 = 27 ise x kaçtır?",
  options: ["A) 4", "B) 5", "C) 6", "D) 7", "E) 8"],
  answer: "C",
  steps: [{ work: "4x = 24", why: "Sabiti karşıya at." }, { work: "x = 6", why: "Katsayıya böl." }],
  hint: "Önce sabit terimi taşı.",
};

describe("parseSimilarQuestion", () => {
  it("strips option letters and keeps a valid 5-option question", () => {
    expect(parseSimilarQuestion(JSON.stringify(sample))).toEqual({ ...sample, options: ["4", "5", "6", "7", "8"] });
  });

  it("rejects questions without exactly five filled options or a valid answer letter", () => {
    expect(parseSimilarQuestion({ ...sample, options: sample.options.slice(0, 4) })).toBeNull();
    expect(parseSimilarQuestion({ ...sample, options: ["4", "", "6", "7", "8"] })).toBeNull();
    expect(parseSimilarQuestion({ ...sample, answer: "F" })).toBeNull();
    expect(parseSimilarQuestion({ ...sample, question: " " })).toBeNull();
    expect(parseSimilarQuestion("not json")).toBeNull();
  });

  it("accepts a lower-case answer letter", () => {
    expect(parseSimilarQuestion({ ...sample, answer: "c" })?.answer).toBe("C");
  });
});

describe("generateSimilarQuestion", () => {
  const base = { imageDataUrl: "data:image/jpeg;base64,AAAA", ocrText: "3x − 5 = 16 ise x kaçtır?", stuckPoint: "denklemi kuramadım", subject: "Matematik", topic: "Denklemler" };

  it("sends the photo, the saved method and the stuck point, and returns the parsed question", async () => {
    const invoke = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify(sample) } }] }));
    const result = await generateSimilarQuestion({ ...base, solution: { method: "Bilinmeyeni yalnız bırak", steps: [{ work: "3x = 21", why: "" }], answer: "7", check: "", hint: "" } }, invoke as never);
    expect(result.answer).toBe("C");
    const payload = JSON.stringify((invoke.mock.calls[0] as unknown as [unknown])[0]);
    expect(payload).toContain("data:image/jpeg;base64,AAAA");
    expect(payload).toContain("Bilinmeyeni yalnız bırak");
    expect(payload).toContain("denklemi kuramadım");
  });

  it("refuses without a question and fails clearly on an unusable answer", async () => {
    await expect(generateSimilarQuestion({ ...base, imageDataUrl: null, ocrText: null, solution: null }, vi.fn() as never)).rejects.toThrow(/fotoğrafı olmalı/);
    const invoke = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ ...sample, options: ["1"] }) } }] }));
    await expect(generateSimilarQuestion({ ...base, solution: null }, invoke as never)).rejects.toThrow(/okunamadı/);
  });
});
