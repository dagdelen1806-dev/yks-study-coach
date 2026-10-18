import { describe, expect, it, vi } from "vitest";
import { atLeastMedium, chooseSolveTier, nextTier, tierOfTag, type ModelTier } from "../shared/solveRouting";
import { invokeLLMWithTier, LlmUnavailableError } from "./_core/llm";
import { solveWithRouting } from "./notes/questionSolver";

const card = { difficulty: null, subject: null, exam: null, lastResult: null } as const;

describe("chooseSolveTier", () => {
  it("sends easy verbal questions to the light model", () => {
    expect(chooseSolveTier({ ...card, difficulty: "easy", subject: "Tarih", exam: "TYT" })).toBe("light");
  });

  it("never sends a numeric question to the light model", () => {
    expect(chooseSolveTier({ ...card, difficulty: "easy", subject: "Matematik", exam: "TYT" })).toBe("medium");
    expect(chooseSolveTier({ ...card, difficulty: "easy", subject: "Geometri" })).toBe("medium");
  });

  it("uses the strong model for hard numeric and AYT numeric questions", () => {
    expect(chooseSolveTier({ ...card, difficulty: "hard", subject: "Fizik", exam: "TYT" })).toBe("strong");
    expect(chooseSolveTier({ ...card, difficulty: "medium", subject: "Matematik", exam: "AYT" })).toBe("strong");
    expect(chooseSolveTier({ ...card, difficulty: "medium", subject: "Kimya", exam: "TYT" })).toBe("medium");
  });

  it("moves up after a failed attempt and when the student asks for a stronger model", () => {
    expect(chooseSolveTier({ ...card, difficulty: "easy", subject: "Coğrafya", lastResult: "failed" })).toBe("medium");
    expect(chooseSolveTier({ ...card, difficulty: "hard", subject: "Edebiyat" })).toBe("medium");
    expect(chooseSolveTier({ ...card, difficulty: "hard", subject: "Edebiyat", lastResult: "failed" })).toBe("strong");
    expect(chooseSolveTier({ ...card, difficulty: "easy", subject: "Tarih", escalate: true })).toBe("strong");
  });

  it("treats a card without difficulty as medium", () => {
    expect(chooseSolveTier({ ...card, subject: "Felsefe" })).toBe("medium");
  });

  it("walks the tiers and reads stored tags", () => {
    expect([nextTier("light"), nextTier("medium"), nextTier("strong")]).toEqual(["medium", "strong", null]);
    expect(atLeastMedium("light")).toBe("medium");
    expect(atLeastMedium("strong")).toBe("strong");
    expect(tierOfTag("strong:gemini-pro↑")).toBe("strong");
    expect(tierOfTag(null)).toBeNull();
    expect(tierOfTag("garbage")).toBeNull();
  });
});

describe("solveWithRouting", () => {
  const input = { imageDataUrl: null, ocrText: "3x − 5 = 16 ise x kaçtır?", stuckPoint: null, subject: "Matematik", topic: "Denklemler" };
  const models: Record<ModelTier, string> = { light: "m-light", medium: "m-medium", strong: "m-strong" };
  const pick = (tier: ModelTier) => models[tier];
  const reply = (solution: Record<string, unknown>) => ({ choices: [{ message: { content: JSON.stringify({ method: "Denklem", steps: [{ work: "3x = 21", why: "" }], answer: "x = 7", check: "3·7−5=16", hint: "", verified: true, ...solution }) } }] });
  const modelsCalled = (invoke: ReturnType<typeof vi.fn>) => invoke.mock.calls.map((call) => (call[0] as { model?: string }).model);

  it("keeps a confident answer from the chosen tier", async () => {
    const invoke = vi.fn(async () => reply({}));
    const result = await solveWithRouting(input, "medium", invoke as never, pick);
    expect(result).toMatchObject({ tier: "medium", model: "m-medium", escalated: false });
    expect(modelsCalled(invoke)).toEqual(["m-medium"]);
  });

  it("re-solves with the next tier when the model is unsure or the answer is empty", async () => {
    const invoke = vi.fn().mockResolvedValueOnce(reply({ verified: false })).mockResolvedValueOnce(reply({ answer: "x = 7" }));
    const result = await solveWithRouting(input, "light", invoke as never, pick);
    expect(result).toMatchObject({ tier: "medium", escalated: true });
    expect(modelsCalled(invoke)).toEqual(["m-light", "m-medium"]);

    const empty = vi.fn().mockResolvedValueOnce(reply({ answer: "" })).mockResolvedValueOnce(reply({}));
    expect((await solveWithRouting(input, "medium", empty as never, pick)).tier).toBe("strong");
  });

  it("moves to the next model when this model's quota is used up", async () => {
    const invoke = vi.fn().mockRejectedValueOnce(new LlmUnavailableError("quota", "429", 429)).mockResolvedValueOnce(reply({}));
    const result = await solveWithRouting(input, "medium", invoke as never, pick);
    expect(result).toMatchObject({ tier: "strong", model: "m-strong", escalated: true });
  });

  it("does not retry on a provider-wide failure, at the top tier, or when the next tier is the same model", async () => {
    const auth = vi.fn().mockRejectedValue(new LlmUnavailableError("auth", "401", 401));
    await expect(solveWithRouting(input, "light", auth as never, pick)).rejects.toThrow();
    expect(auth).toHaveBeenCalledTimes(1);

    const unsure = vi.fn(async () => reply({ verified: false }));
    expect((await solveWithRouting(input, "strong", unsure as never, pick)).escalated).toBe(false);
    expect(unsure).toHaveBeenCalledTimes(1);

    const same = vi.fn(async () => reply({ verified: false }));
    await solveWithRouting(input, "medium", same as never, () => "only-model");
    expect(same).toHaveBeenCalledTimes(1);
  });

  it("falls back to the medium model when the strong model is missing or out of quota", async () => {
    const invoke = vi.fn().mockRejectedValueOnce(new LlmUnavailableError("provider", "404", 404)).mockResolvedValueOnce(reply({}));
    const result = await solveWithRouting(input, "strong", invoke as never, pick);
    expect(result).toMatchObject({ tier: "medium", model: "m-medium" });
    expect(modelsCalled(invoke)).toEqual(["m-strong", "m-medium"]);
  });

  it("falls back to the first readable answer when the upper tier fails", async () => {
    const invoke = vi.fn().mockResolvedValueOnce(reply({ verified: false })).mockRejectedValueOnce(new Error("boom"));
    const result = await solveWithRouting(input, "medium", invoke as never, pick);
    expect(result).toMatchObject({ tier: "medium", escalated: false });
    expect(result.solution.answer).toBe("x = 7");
  });
});

describe("invokeLLMWithTier (book photo reading)", () => {
  const pick = (tier: ModelTier) => ({ light: "m-light", medium: "m-medium", strong: "m-strong" })[tier];
  const ok = { id: "1", created: 0, model: "x", choices: [] };
  const params = { messages: [{ role: "user" as const, content: "kapak" }] };

  it("reads with the strong model", async () => {
    const invoke = vi.fn(async () => ok);
    await invokeLLMWithTier(params, "strong", invoke as never, pick);
    expect(invoke.mock.calls.map((call) => (call as unknown as [{ model?: string }])[0].model)).toEqual(["m-strong"]);
  });

  it("falls back to the default model only when the strong model is out of quota or missing", async () => {
    const quota = vi.fn().mockRejectedValueOnce(new LlmUnavailableError("quota", "429", 429)).mockResolvedValueOnce(ok);
    await invokeLLMWithTier(params, "strong", quota as never, pick);
    expect(quota.mock.calls.map((call) => (call[0] as { model?: string }).model)).toEqual(["m-strong", "m-medium"]);

    const auth = vi.fn().mockRejectedValue(new LlmUnavailableError("auth", "401", 401));
    await expect(invokeLLMWithTier(params, "strong", auth as never, pick)).rejects.toThrow();
    expect(auth).toHaveBeenCalledTimes(1);
  });
});
