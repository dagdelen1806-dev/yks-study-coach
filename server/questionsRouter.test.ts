import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

// questionsDb: her çağrının hangi kullanıcıyla yapıldığını kaydeden sahte.
const calls: Array<{ fn: string; userId: number; args: unknown[] }> = [];
const record = (fn: string, result: unknown) => vi.fn(async (userId: number, ...args: unknown[]) => { calls.push({ fn, userId, args }); return result; });
const card = { id: 3, noteId: 9, subject: "Matematik", topicId: 7, topic: "Problemler", questionImageId: 100, solutionImageId: null, voiceAttachmentId: null, voiceDuration: null, stuckPoint: "x", solutionText: null, errorType: null, errorTypeSource: null, difficulty: null, status: "unsolved", reviewStage: 0, nextReviewAt: new Date(), attemptCount: 0, lastResult: null, lastAttemptAt: null, createdAt: new Date(), attempts: [] };
vi.mock("./notes/questionsDb", () => ({
  createQuestion: record("createQuestion", card),
  updateQuestion: record("updateQuestion", card),
  deleteQuestion: record("deleteQuestion", undefined),
  getQuestion: vi.fn(async (userId: number, id: number) => (userId === 1 && id === 3 ? card : null)),
  getQuestionIdByNote: record("getQuestionIdByNote", 3),
  listQuestions: record("listQuestions", { items: [], nextCursor: null }),
  recordAttempt: record("recordAttempt", { reviewStage: 1, status: "learning", nextReviewAt: new Date() }),
  getErrorMap: record("getErrorMap", { total: 0, open: 0, topics: [], errorTypes: [] }),
  getReviewSummary: record("getReviewSummary", { due: 0, reviewCount: 0, minutes: 10, task: null, totals: { unsolved: 0, learning: 0, mastered: 0 } }),
  addReviewTask: record("addReviewTask", { created: true, task: null }),
  finishReviewSession: record("finishReviewSession", { taskCompleted: false }),
  getSubjectSummary: record("getSubjectSummary", []),
  moveNoteToSubject: record("moveNoteToSubject", { subject: "Matematik" }),
  getNotebookPlanSignal: vi.fn(async () => null),
}));

vi.mock("./bookContent/bookContentDb", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./bookContent/bookContentDb")>()),
  getMatchableTopics: vi.fn(async () => [{ id: 7, slug: "problemler", exam: "TYT", subject: "Matematik", unit: "Sayılar", topic: "Problemler" }]),
}));

// Ek deposu: kullanıcı 1'in fotoğrafı (id 100) — başka kullanıcı göremez.
vi.mock("./notes/attachmentStorage", async (importOriginal) => {
  const original = await importOriginal<typeof import("./notes/attachmentStorage")>();
  const storage = {
    get: vi.fn(async (userId: number, id: number) => (userId === 1 && id === 100 ? { mimeType: "image/jpeg", data: Buffer.from([0xff, 0xd8, 0xff]), kind: "image" as const, noteId: null } : null)),
    setOcrText: vi.fn(async () => undefined),
  };
  return { ...original, getAttachmentStorage: () => storage };
});

const aiInvoke = vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ ocrText: "Bir sayının 3 katı…", topicId: 7, difficulty: "medium", errorType: "method" }) } }] }));
vi.mock("./_core/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("./_core/llm")>()), invokeLLM: (...args: unknown[]) => (aiInvoke as (...a: unknown[]) => unknown)(...args) }));
vi.mock("./subscriptions/entitlementService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./subscriptions/entitlementService")>()),
  assertUsageAvailable: vi.fn(async () => undefined),
  recordFeatureUsage: vi.fn(async () => undefined),
}));

const { appRouter } = await import("./routers");
import type { TrpcContext } from "./_core/context";

const makeUser = (id: number): User => ({ id, openId: `u-${id}`, email: null, name: null, loginMethod: "dev_email", passwordHash: null, emailVerifiedAt: new Date(), emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }) as User;
const callerFor = (user: User | null) => appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);

beforeEach(() => { calls.length = 0; aiInvoke.mockClear(); });

describe("questions router — authorization and student isolation", () => {
  it("rejects anonymous callers", async () => {
    await expect(callerFor(null).questions.list({})).rejects.toThrow(/login/i);
    await expect(callerFor(null).questions.create({ clientId: "q_abcdefgh", stuckPoint: "x" })).rejects.toThrow(/login/i);
    await expect(callerFor(null).questions.suggest({ attachmentId: 100 })).rejects.toThrow(/login/i);
  });

  it("always scopes data access to the signed-in student", async () => {
    const caller = callerFor(makeUser(2));
    await caller.questions.list({ due: true });
    await caller.questions.create({ clientId: "q_abcdefgh", questionImageId: 100, stuckPoint: "ikinci adımda takıldım", errorType: "method", difficulty: "hard" });
    await caller.questions.update({ id: 3, solutionText: "önce payda" });
    await caller.questions.attempt({ id: 3, result: "solved", sawSolution: false });
    await caller.questions.delete({ id: 3 });
    await caller.questions.errorMap({ days: 30 });
    await caller.questions.addReviewTask();
    await caller.questions.finishReview({ minutes: 12, solved: 2, partial: 1, failed: 0 });
    expect(calls.map((call) => [call.fn, call.userId])).toEqual([["listQuestions", 2], ["createQuestion", 2], ["updateQuestion", 2], ["recordAttempt", 2], ["deleteQuestion", 2], ["getErrorMap", 2], ["addReviewTask", 2], ["finishReviewSession", 2]]);
  });

  it("scopes subject notebooks to the student and keeps 'all' and 'Genel' apart", async () => {
    const caller = callerFor(makeUser(4));
    await caller.questions.subjectSummary();
    await caller.questions.moveToSubject({ noteId: 9, subject: "Matematik" });
    await caller.questions.moveToSubject({ noteId: 9, subject: null });
    await caller.questions.summary();
    await caller.questions.summary({ subject: null });
    await caller.questions.errorMap({ days: null, subject: "Fizik" });
    expect(calls.map((call) => [call.fn, call.userId, ...call.args])).toEqual([
      ["getSubjectSummary", 4],
      ["moveNoteToSubject", 4, 9, "Matematik"],
      ["moveNoteToSubject", 4, 9, null],
      ["getReviewSummary", 4, undefined],
      ["getReviewSummary", 4, null],
      ["getErrorMap", 4, null, "Fizik"],
    ]);
    await expect(caller.questions.moveToSubject({ noteId: 9, subject: "   " })).rejects.toThrow();
  });

  it("another student's card is simply not found", async () => {
    await expect(callerFor(makeUser(2)).questions.get({ id: 3 })).rejects.toThrow(/bulunamadı/);
  });

  it("only accepts the fixed error types and attempt results", async () => {
    await expect(callerFor(makeUser(1)).questions.create({ clientId: "q_abcdefgh", stuckPoint: "x", errorType: "tembellik" as never })).rejects.toThrow();
    await expect(callerFor(makeUser(1)).questions.attempt({ id: 3, result: "maybe" as never, sawSolution: false })).rejects.toThrow();
  });
});

describe("questions router — ✨ suggestion", () => {
  it("reads the student's own photo and returns a curriculum topic", async () => {
    const result = await callerFor(makeUser(1)).questions.suggest({ attachmentId: 100, stuckPoint: "hangi formül" });
    expect(result).toEqual({ ocrText: "Bir sayının 3 katı…", topicId: 7, subject: "Matematik", difficulty: "medium", errorType: "method" });
    expect(aiInvoke).toHaveBeenCalledTimes(1);
  });

  it("never sends another student's photo to the AI", async () => {
    await expect(callerFor(makeUser(2)).questions.suggest({ attachmentId: 100 })).rejects.toThrow(/Fotoğraf bulunamadı/);
    expect(aiInvoke).not.toHaveBeenCalled();
  });

  it("turns an AI failure into a friendly message", async () => {
    aiInvoke.mockRejectedValueOnce(new Error("boom"));
    await expect(callerFor(makeUser(1)).questions.suggest({ attachmentId: 100 })).rejects.toThrow(/kendin seçebilirsin|AI/);
  });
});
