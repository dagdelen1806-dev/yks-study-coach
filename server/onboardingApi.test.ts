import { beforeEach, describe, expect, it, vi } from "vitest";
import type { StudentProfilePatch, StudentProfileView } from "./db";

const defaultView: StudentProfileView = {
  onboardingCompleted: false,
  onboardingStep: 0,
  preferredName: null,
  gradeLevel: null,
  examYear: null,
  targetScoreType: null,
  currentTytNet: null,
  currentAytNet: null,
  mockExamFrequency: null,
  strongSubjects: [],
  weakSubjects: [],
  hasPriorStudyPlan: null,
  targetUniversity: null,
  targetDepartment: null,
  targetRanking: null,
  mainGoal: null,
  shortTermGoal: null,
  longTermGoal: null,
  dailyStudyDuration: null,
  availableStudyDays: [],
  preferredStudyTimes: [],
  preferredStudyMethods: [],
  studyObstacles: null,
  coachingExpectations: [],
  notificationPreference: null,
  coachingStyle: null,
  additionalNotes: null,
  updatedAt: null,
};

const store = new Map<number, StudentProfileView>();

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getStudentProfile: vi.fn(async (userId: number) => store.get(userId) ?? { ...defaultView }),
    upsertStudentProfileStep: vi.fn(async (userId: number, step: number, patch: StudentProfilePatch) => {
      const existing = store.get(userId) ?? { ...defaultView };
      const next: StudentProfileView = { ...existing, ...patch, onboardingStep: Math.max(step + 1, existing.onboardingStep) } as StudentProfileView;
      store.set(userId, next);
      return next;
    }),
    completeOnboarding: vi.fn(async (userId: number) => {
      const existing = store.get(userId) ?? { ...defaultView };
      const next = { ...existing, onboardingCompleted: true };
      store.set(userId, next);
      return next;
    }),
  };
});

import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function callerFor(userId: number) {
  const ctx = {
    user: { id: userId, openId: `user-${userId}`, email: null, name: null, loginMethod: null, role: "user" as const, approvalStatus: "approved" as const, approvedAt: null, approvedBy: null, rejectedAt: null, rejectionReason: null, accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: () => undefined } as unknown as TrpcContext["res"],
  } as TrpcContext;
  return appRouter.createCaller(ctx);
}

function anonymousCaller() {
  const ctx = { user: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: {} as TrpcContext["res"] } as TrpcContext;
  return appRouter.createCaller(ctx);
}

describe("onboarding router", () => {
  beforeEach(() => store.clear());

  it("giriş yapmamış kullanıcı onboarding verisine erişemez", async () => {
    await expect(anonymousCaller().onboarding.get()).rejects.toBeDefined();
    await expect(anonymousCaller().onboarding.saveStep({ step: 0, data: {} })).rejects.toBeDefined();
  });

  it("yeni kullanıcı için varsayılan (tamamlanmamış, adım 0) profil döner", async () => {
    const result = await callerFor(1).onboarding.get();
    expect(result.onboardingCompleted).toBe(false);
    expect(result.onboardingStep).toBe(0);
  });

  it("zorunlu alan eksikken adım 0 sunucu tarafında reddedilir", async () => {
    await expect(callerFor(1).onboarding.saveStep({ step: 0, data: { preferredName: "Ece" } })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("geçerli adım 0 verisi kaydedilir ve adım ilerler (kaldığı yerden devam)", async () => {
    const caller = callerFor(1);
    const result = await caller.onboarding.saveStep({
      step: 0,
      data: { preferredName: "Ece", gradeLevel: "12", examYear: String(new Date().getFullYear() + 1), targetScoreType: "SAY" },
    });
    expect(result.preferredName).toBe("Ece");
    expect(result.onboardingStep).toBe(1);

    const resumed = await caller.onboarding.get();
    expect(resumed.onboardingStep).toBe(1);
    expect(resumed.preferredName).toBe("Ece");
  });

  it("isteğe bağlı adımlar boş bırakılarak ilerletilebilir", async () => {
    const caller = callerFor(1);
    await caller.onboarding.saveStep({ step: 0, data: { preferredName: "Ece", gradeLevel: "12", examYear: "2027", targetScoreType: "SAY" } });
    const result = await caller.onboarding.saveStep({ step: 1, data: {} });
    expect(result.onboardingStep).toBe(2);
  });

  it("aynı adımın tekrar gönderilmesi (çift tıklama) adımı geri saramaz", async () => {
    const caller = callerFor(1);
    await caller.onboarding.saveStep({ step: 0, data: { preferredName: "Ece", gradeLevel: "12", examYear: "2027", targetScoreType: "SAY" } });
    await caller.onboarding.saveStep({ step: 2, data: {} });
    const result = await caller.onboarding.saveStep({ step: 0, data: { preferredName: "Ece 2", gradeLevel: "12", examYear: "2027", targetScoreType: "SAY" } });
    expect(result.onboardingStep).toBeGreaterThanOrEqual(3);
  });

  it("son adımda complete=true ile onboarding tamamlanır", async () => {
    const caller = callerFor(1);
    const result = await caller.onboarding.saveStep({ step: 4, data: { coachingStyle: "dengeli" }, complete: true });
    expect(result.onboardingCompleted).toBe(true);
  });

  it("bir kullanıcının onboarding verisi başka bir kullanıcıya sızmaz", async () => {
    await callerFor(1).onboarding.saveStep({ step: 0, data: { preferredName: "Kullanıcı Bir", gradeLevel: "11", examYear: "2027", targetScoreType: "EA" } });
    const userTwo = await callerFor(2).onboarding.get();
    expect(userTwo.preferredName).toBeNull();
    expect(userTwo.onboardingStep).toBe(0);
  });
});
