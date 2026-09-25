import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subscription, SubscriptionPlan } from "../drizzle/schema";

// Aynı in-memory fake yaklaşımı (bkz. server/subscriptions.test.ts) — bu
// dosya router/middleware seviyesindeki güvenlik davranışını test eder
// (spec §35 AUTH/SECURITY): anonim/onaysız/free/admin-olmayan bir isteğin
// gerçekten reddedildiğini appRouter.createCaller üzerinden doğrular.
const plans = new Map<string, SubscriptionPlan>();
const subscriptionsByUser = new Map<number, Subscription>();
let nextId = 1;

function seedPlan(plan: Partial<SubscriptionPlan> & { code: string; tier: "free" | "premium"; trialDays: number }) {
  const row = { id: nextId++, name: plan.code, description: null, billingPeriod: "none", price: 0, currency: "TRY", storeProductId: null, provider: null, isActive: 1, metadata: null, createdAt: new Date(), updatedAt: new Date(), ...plan } as SubscriptionPlan;
  plans.set(plan.code, row);
  return row;
}

vi.mock("./subscriptions/subscriptionDb", () => ({
  getPlanByCode: vi.fn(async (code: string) => plans.get(code)),
  getPlanById: vi.fn(async (id: number) => Array.from(plans.values()).find((p) => p.id === id)),
  listActivePlans: vi.fn(async () => Array.from(plans.values())),
  getSubscriptionByUserId: vi.fn(async (userId: number) => subscriptionsByUser.get(userId)),
  ensureFreeSubscription: vi.fn(async (userId: number) => {
    const existing = subscriptionsByUser.get(userId);
    if (existing) return existing;
    const freePlan = plans.get("FREE")!;
    const row = { id: nextId++, userId, planId: freePlan.id, status: "active", trialStartedAt: null, trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, canceledAt: null, cancelAtPeriodEnd: 0, gracePeriodEndsAt: null, provider: null, providerSubscriptionId: null, providerCustomerId: null, latestPaymentId: null, isManualOverride: 0, createdAt: new Date(), updatedAt: new Date() } as Subscription;
    subscriptionsByUser.set(userId, row);
    return row;
  }),
  updateSubscription: vi.fn(async (userId: number, patch: Partial<Subscription>) => {
    const existing = subscriptionsByUser.get(userId)!;
    const updated = { ...existing, ...patch };
    subscriptionsByUser.set(userId, updated);
    return updated;
  }),
  listAllSubscriptionsForAdmin: vi.fn(async () => []),
  recordFeatureUsage: vi.fn(async () => undefined),
  countFeatureUsage: vi.fn(async () => 0),
  writeAuditLog: vi.fn(async () => undefined),
  listAuditLogsForUser: vi.fn(async () => []),
  listPaymentsForUser: vi.fn(async () => []),
  listPendingUsers: vi.fn(async () => []),
  approveUser: vi.fn(async () => undefined),
  rejectUser: vi.fn(async () => undefined),
}));

// `examDocument.extract`in gerçek başarısızlık yolunu (LLM çağrısı patlarsa
// throw eder, aiPlan.generate'in aksine sessiz bir fallback'e düşmez) test
// etmek için — spec §50/§51: "LLM çağrısı başarısız olursa usage yanlışlıkla
// artırılmamalı" iddiasını gerçek router zinciri üzerinden doğrular.
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(async () => { throw new Error("LLM geçici olarak kullanılamıyor"); }) }));

const { appRouter } = await import("./routers");
const { MockPaymentProvider } = await import("./subscriptions/paymentProviders/mockProvider");
const subscriptionDbMock = await import("./subscriptions/subscriptionDb");
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    openId: "user-1",
    email: null,
    name: null,
    loginMethod: null,
    passwordHash: null,
    role: "user",
    approvalStatus: "approved",
    approvedAt: null,
    approvedBy: null,
    rejectedAt: null,
    rejectionReason: null,
    accountStatus: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
    ...overrides,
  } as User;
}

function callerFor(user: User | null) {
  const ctx = { user, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: () => undefined } as unknown as TrpcContext["res"] } as TrpcContext;
  return appRouter.createCaller(ctx);
}

beforeEach(() => {
  plans.clear();
  subscriptionsByUser.clear();
  seedPlan({ code: "FREE", tier: "free", trialDays: 0 });
  seedPlan({ code: "PREMIUM_MONTHLY", tier: "premium", trialDays: 10, price: 14900 });
});

describe("AUTH — anonim erişim", () => {
  it("giriş yapmamış kullanıcı aiPlan.generate çağıramaz", async () => {
    const caller = callerFor(null);
    await expect(caller.aiPlan.generate({ topics: [], exams: [], books: [], goal: "test", availableMinutes: 100 } as never)).rejects.toThrow(/login/i);
  });

  it("giriş yapmamış kullanıcı admin.subscriptions.list çağıramaz", async () => {
    const caller = callerFor(null);
    await expect(caller.admin.subscriptions.list()).rejects.toThrow();
  });
});

describe("APPROVAL GATE — onay bekleyen hesap", () => {
  it("onay bekleyen kullanıcı normal bir protectedProcedure'u çağıramaz", async () => {
    const caller = callerFor(makeUser({ approvalStatus: "pending" }));
    await expect(caller.resources.snapshot()).rejects.toThrow(/approval/i);
  });

  it("onay bekleyen kullanıcı yine de auth.me çağırabilir (allowlist)", async () => {
    const caller = callerFor(makeUser({ approvalStatus: "pending" }));
    const me = await caller.auth.me();
    expect(me?.approvalStatus).toBe("pending");
  });

  it("reddedilmiş kullanıcı da protectedProcedure'a erişemez", async () => {
    const caller = callerFor(makeUser({ approvalStatus: "rejected" }));
    await expect(caller.resources.snapshot()).rejects.toThrow(/rejected/i);
  });

  it("onaylı kullanıcı normal şekilde erişebilir", async () => {
    const caller = callerFor(makeUser({ approvalStatus: "approved" }));
    await expect(caller.resources.snapshot()).resolves.toBeDefined();
  });
});

describe("EMAIL VERIFICATION GATE", () => {
  const unverified = { loginMethod: "dev_email", email: "ece@ornek.com", emailVerifiedAt: null } as Partial<User>;

  it("doğrulanmamış e-posta hesabı korumalı uçlara erişemez (onaylı olsa bile)", async () => {
    const caller = callerFor(makeUser({ ...unverified, approvalStatus: "approved" }));
    await expect(caller.resources.snapshot()).rejects.toThrow(/verification/i);
  });

  it("doğrulanmış e-posta hesabı erişebilir", async () => {
    const caller = callerFor(makeUser({ ...unverified, emailVerifiedAt: new Date() }));
    await expect(caller.resources.snapshot()).resolves.toBeDefined();
  });

  it("doğrulanmamış hesap auth.me ve tekrar gönder uçlarına erişebilir", async () => {
    const caller = callerFor(makeUser(unverified));
    expect((await caller.auth.me())?.emailVerifiedAt).toBeNull();
    // Kapıdan geçer; testte DB olmadığı için gönderim aşamasında düşer — FORBIDDEN değil.
    await expect(caller.auth.resendVerificationEmail()).rejects.toThrow(/gönderilemedi/);
  });

  it("telefon ve eski hesaplar e-posta doğrulamasına takılmaz", async () => {
    await expect(callerFor(makeUser({ loginMethod: "dev_phone" })).resources.snapshot()).resolves.toBeDefined();
    await expect(callerFor(makeUser({ loginMethod: "dev" })).resources.snapshot()).resolves.toBeDefined();
  });

  it("admin rolü olsa bile doğrulanmamış e-posta hesabı admin uçlarına erişemez", async () => {
    const caller = callerFor(makeUser({ ...unverified, role: "admin" }));
    await expect(caller.admin.subscriptions.list()).rejects.toThrow(/permission/i);
  });
});

describe("SECURITY — admin-only uçlar", () => {
  it("normal kullanıcı admin.subscriptions.list çağıramaz", async () => {
    const caller = callerFor(makeUser({ role: "user" }));
    await expect(caller.admin.subscriptions.list()).rejects.toThrow(/permission/i);
  });

  it("normal kullanıcı admin.users.listPending çağıramaz", async () => {
    const caller = callerFor(makeUser({ role: "user" }));
    await expect(caller.admin.users.listPending()).rejects.toThrow(/permission/i);
  });

  it("admin rolündeki kullanıcı admin.subscriptions.list çağırabilir", async () => {
    const caller = callerFor(makeUser({ role: "admin" }));
    await expect(caller.admin.subscriptions.list()).resolves.toBeDefined();
  });

  it("admin rolündeki kullanıcı admin.analytics.overview çağırabilir", async () => {
    const caller = callerFor(makeUser({ role: "admin" }));
    await expect(caller.admin.analytics.overview()).resolves.toBeDefined();
  });

  it("normal kullanıcı admin.analytics.overview çağıramaz", async () => {
    const caller = callerFor(makeUser({ role: "user" }));
    await expect(caller.admin.analytics.overview()).rejects.toThrow(/permission/i);
  });
});

describe("SECURITY — premium bypass client payload ile mümkün değil", () => {
  it("free kullanıcı subscription.getCurrent'te isPremium=false görür (input'tan bağımsız, DB'den gelir)", async () => {
    const caller = callerFor(makeUser({ id: 42 }));
    const snapshot = await caller.subscription.getCurrent();
    expect(snapshot.isPremium).toBe(false);
    expect(snapshot.tier).toBe("free");
  });
});

describe("USAGE — başarısız işlem kotayı tüketmez (spec §50/§51)", () => {
  it("examDocument.extract LLM hatasıyla başarısız olursa recordFeatureUsage HİÇ çağrılmaz", async () => {
    const caller = callerFor(makeUser({ id: 77 }));
    const recordSpy = vi.mocked(subscriptionDbMock.recordFeatureUsage);
    const callsBefore = recordSpy.mock.calls.length;

    // "%PDF-" magic byte'larıyla başlayan geçerli bir data URL (fileValidation'ı geçer), ama invokeLLM mock'u her zaman throw eder.
    const dataUrl = `data:application/pdf;base64,${Buffer.from("%PDF-1.4 test").toString("base64")}`;
    await expect(caller.examDocument.extract({ dataUrl, mimeType: "application/pdf" })).rejects.toThrow();

    expect(recordSpy.mock.calls.length).toBe(callsBefore);
  });
});

describe("MockPaymentProvider — webhook imza doğrulaması", () => {
  it("geçerli imzalı payload kabul edilir", async () => {
    const provider = new MockPaymentProvider();
    const payload = JSON.stringify({ eventId: "e1", eventType: "checkout.completed", userId: 1 });
    const signature = provider.signTestPayload(payload);
    const result = await provider.handleWebhook({ rawBody: payload, headers: { "x-mock-signature": signature } });
    expect(result.valid).toBe(true);
    expect(result.eventId).toBe("e1");
  });

  it("geçersiz imza reddedilir", async () => {
    const provider = new MockPaymentProvider();
    const payload = JSON.stringify({ eventId: "e2", eventType: "checkout.completed", userId: 1 });
    const result = await provider.handleWebhook({ rawBody: payload, headers: { "x-mock-signature": "deadbeef".repeat(8) } });
    expect(result.valid).toBe(false);
  });

  it("imza başlığı hiç yoksa reddedilir", async () => {
    const provider = new MockPaymentProvider();
    const result = await provider.handleWebhook({ rawBody: "{}", headers: {} });
    expect(result.valid).toBe(false);
  });
});
