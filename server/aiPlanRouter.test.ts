import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../drizzle/schema";

// AI planı: sağlayıcı başarısızsa herkese aynı hazır planı göstermek yerine dürüst hata; hak düşmez.
const recordFeatureUsage = vi.fn(async () => undefined);
vi.mock("./subscriptions/entitlementService", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./subscriptions/entitlementService")>()),
  assertUsageAvailable: vi.fn(async () => undefined),
  recordFeatureUsage: (...args: unknown[]) => (recordFeatureUsage as (...a: unknown[]) => unknown)(...args),
}));
vi.mock("./notes/questionsDb", async (importOriginal) => ({ ...(await importOriginal<typeof import("./notes/questionsDb")>()), getNotebookPlanSignal: vi.fn(async () => null) }));
vi.mock("./schedule/classScheduleDb", async (importOriginal) => ({ ...(await importOriginal<typeof import("./schedule/classScheduleDb")>()), getPlanScheduleContext: vi.fn(async () => null) }));
const aiInvoke = vi.fn();
vi.mock("./_core/llm", async (importOriginal) => ({ ...(await importOriginal<typeof import("./_core/llm")>()), invokeLLM: (...args: unknown[]) => aiInvoke(...args) }));

const { appRouter } = await import("./routers");
const { LlmUnavailableError } = await import("./_core/llm");
import type { TrpcContext } from "./_core/context";

const user = { id: 9, openId: "u-9", email: null, name: null, loginMethod: "dev_email", passwordHash: null, emailVerifiedAt: new Date(), emailVerificationSentAt: null, role: "user", approvalStatus: "approved", approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() } as User;
const caller = appRouter.createCaller({ user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext);
const input = { topics: [{ topic: "Türev", subject: "Matematik", exam: "AYT" as const, progress: 20, status: "Zayıf" as const }], exams: [], books: [], startDate: "2026-10-17" };

beforeEach(() => { aiInvoke.mockReset(); recordFeatureUsage.mockClear(); });

describe("aiPlan.generate", () => {
  it("returns the model's plan (normalized) and counts one use", async () => {
    aiInvoke.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ weeklyGoal: "Türevi bitir", days: [{ dayName: "Cumartesi", date: "2026-10-17", activities: [{ subject: "Matematik", topic: "Türev", duration: 40, type: "Soru" }] }], coachNotes: "Süre tut." }) } }] });
    const plan = await caller.aiPlan.generate(input);
    expect(plan.summary).toBe("Türevi bitir");
    expect(plan.days[0].sessions[0]).toMatchObject({ topic: "Türev", minutes: 40 });
    expect(recordFeatureUsage).toHaveBeenCalledTimes(1);
    expect(String(aiInvoke.mock.calls[0][0].messages[1].content)).toContain("Cumartesi 2026-10-17");
  });

  it("tells the student when the provider quota is exhausted, without using up their plan quota", async () => {
    aiInvoke.mockRejectedValueOnce(new LlmUnavailableError("quota", "429", 429));
    await expect(caller.aiPlan.generate(input)).rejects.toThrow(/kotası şu an dolu/);
    expect(recordFeatureUsage).not.toHaveBeenCalled();
  });

  it("never passes off a canned plan as the AI's when the response is unusable", async () => {
    aiInvoke.mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ foo: 1 }) } }] });
    await expect(caller.aiPlan.generate(input)).rejects.toThrow(/okunamadı/);
    expect(recordFeatureUsage).not.toHaveBeenCalled();
  });
});
