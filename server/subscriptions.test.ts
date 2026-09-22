import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Subscription, SubscriptionPlan } from "../drizzle/schema";

// In-memory fake for server/subscriptions/subscriptionDb.ts — consistent
// with the existing `dataIsolation.test.ts` pattern (mock the DB-access
// module, exercise the real business logic on top of it). Keeps these
// tests fast/deterministic and never touches the real dev database.
const plans = new Map<string, SubscriptionPlan>();
const subscriptionsByUser = new Map<number, Subscription>();
const events = new Map<string, { status: string }>();
const eventRowIdToKey = new Map<number, string>();
const auditLogs: Array<{ userId: number; adminId: number | null; action: string }> = [];
const usageLogs: Array<{ userId: number; featureKey: string; usedAt: Date }> = [];
let nextId = 1;

function seedPlan(plan: Partial<SubscriptionPlan> & { code: string; tier: "free" | "premium"; trialDays: number; billingPeriod: "none" | "monthly" | "yearly" }) {
  const row = { id: nextId++, name: plan.code, description: null, price: 0, currency: "TRY", storeProductId: null, provider: null, isActive: 1, metadata: null, createdAt: new Date(), updatedAt: new Date(), ...plan } as SubscriptionPlan;
  plans.set(plan.code, row);
  return row;
}

vi.mock("./subscriptions/subscriptionDb", () => ({
  getPlanByCode: vi.fn(async (code: string) => plans.get(code)),
  getPlanById: vi.fn(async (id: number) => Array.from(plans.values()).find((p) => p.id === id)),
  listActivePlans: vi.fn(async () => Array.from(plans.values())),
  upsertPlan: vi.fn(async () => undefined),
  getSubscriptionByUserId: vi.fn(async (userId: number) => subscriptionsByUser.get(userId)),
  ensureFreeSubscription: vi.fn(async (userId: number) => {
    const existing = subscriptionsByUser.get(userId);
    if (existing) return existing;
    const freePlan = plans.get("FREE")!;
    const row: Subscription = { id: nextId++, userId, planId: freePlan.id, status: "active", trialStartedAt: null, trialEndsAt: null, currentPeriodStart: null, currentPeriodEnd: null, canceledAt: null, cancelAtPeriodEnd: 0, gracePeriodEndsAt: null, provider: null, providerSubscriptionId: null, providerCustomerId: null, latestPaymentId: null, isManualOverride: 0, createdAt: new Date(), updatedAt: new Date() };
    subscriptionsByUser.set(userId, row);
    return row;
  }),
  updateSubscription: vi.fn(async (userId: number, patch: Partial<Subscription>) => {
    const existing = subscriptionsByUser.get(userId);
    if (!existing) throw new Error("not found");
    const updated = { ...existing, ...patch, updatedAt: new Date() };
    subscriptionsByUser.set(userId, updated);
    return updated;
  }),
  listAllSubscriptionsForAdmin: vi.fn(async () => Array.from(subscriptionsByUser.values())),
  createPayment: vi.fn(async () => nextId++),
  updatePaymentStatus: vi.fn(async () => undefined),
  listPaymentsForUser: vi.fn(async () => []),
  isDuplicateEvent: vi.fn(async (provider: string, eventId: string) => events.get(`${provider}:${eventId}`)?.status === "processed"),
  recordEventReceived: vi.fn(async (input: { provider: string; eventId: string }) => {
    const key = `${input.provider}:${input.eventId}`;
    events.set(key, { status: "received" });
    const id = nextId++;
    eventRowIdToKey.set(id, key);
    return id;
  }),
  markEventProcessed: vi.fn(async (id: number, status: string) => {
    const key = eventRowIdToKey.get(id);
    if (key) events.set(key, { status });
  }),
  writeAuditLog: vi.fn(async (input: { userId: number; adminId?: number | null; action: string }) => {
    auditLogs.push({ userId: input.userId, adminId: input.adminId ?? null, action: input.action });
  }),
  listAuditLogsForUser: vi.fn(async (userId: number) => auditLogs.filter((a) => a.userId === userId)),
  recordFeatureUsage: vi.fn(async (userId: number, featureKey: string) => {
    usageLogs.push({ userId, featureKey, usedAt: new Date() });
  }),
  countFeatureUsage: vi.fn(async (userId: number, featureKey: string) => usageLogs.filter((u) => u.userId === userId && u.featureKey === featureKey).length),
  listPendingUsers: vi.fn(async () => []),
  approveUser: vi.fn(async () => undefined),
  rejectUser: vi.fn(async () => undefined),
}));

const { getCurrentSubscription, getEntitlements, hasEntitlement, isPremium, assertUsageAvailable, recordFeatureUsage, PremiumRequiredError, UsageLimitExceededError } = await import("./subscriptions/entitlementService");
const { processWebhookEvent } = await import("./subscriptions/webhookProcessor");

// Prod akışında `metredFeatureProcedure` (server/_core/trpc.ts) bunu iki adımda
// yapar: önce kota kontrolü, GERÇEK işlem başarılı olursa kayıt (spec §50/§51 —
// başarısız çağrı kotayı yanlışlıkla tüketmesin diye). Testler aynı iki adımı simüle eder.
async function simulateSuccessfulUsage(userId: number, feature: Parameters<typeof assertUsageAvailable>[1]) {
  await assertUsageAvailable(userId, feature);
  await recordFeatureUsage(userId, feature);
}

beforeEach(() => {
  plans.clear();
  subscriptionsByUser.clear();
  events.clear();
  eventRowIdToKey.clear();
  auditLogs.length = 0;
  usageLogs.length = 0;
  seedPlan({ code: "FREE", tier: "free", billingPeriod: "none", trialDays: 0 });
  seedPlan({ code: "PREMIUM_MONTHLY", tier: "premium", billingPeriod: "monthly", trialDays: 10, price: 14900 });
});

describe("ENTITLEMENT — free/trial/premium", () => {
  it("yeni kullanıcı otomatik FREE planına sahip olur, premium değildir", async () => {
    const snapshot = await getEntitlements(1);
    expect(snapshot.tier).toBe("free");
    expect(snapshot.isPremium).toBe(false);
    expect(snapshot.entitlements).toEqual([]);
  });

  it("checkout.completed sonrası kullanıcı trialing olur ve premium erişim kazanır", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "evt-1", eventType: "checkout.completed", payload: { userId: 2, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const snapshot = await getEntitlements(2);
    expect(snapshot.status).toBe("trialing");
    expect(snapshot.isPremium).toBe(true);
    expect(snapshot.isTrial).toBe(true);
    expect(snapshot.entitlements).toContain("AI_STUDY_PLAN");
  });

  it("trial süresi dolduğunda otomatik olarak expired'a döner ve premium erişim kesilir", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "evt-2", eventType: "checkout.completed", payload: { userId: 3, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const sub = subscriptionsByUser.get(3)!;
    subscriptionsByUser.set(3, { ...sub, trialEndsAt: new Date(Date.now() - 1000) }); // geçmişte bitmiş gibi ayarla
    const snapshot = await getEntitlements(3);
    expect(snapshot.status).toBe("expired");
    expect(snapshot.isPremium).toBe(false);
  });

  it("aynı kullanıcı trial'ı ikinci kez başlatamaz (trialStartedAt zaten dolu)", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "evt-3a", eventType: "checkout.completed", payload: { userId: 4, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const afterFirst = await getCurrentSubscription(4);
    await processWebhookEvent({ provider: "mock", eventId: "evt-3b", eventType: "checkout.completed", payload: { userId: 4, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const afterSecond = await getEntitlements(4);
    // İkinci "satın alma" trial DEĞİL, doğrudan active olmalı (aynı trialStartedAt korunur).
    expect(afterSecond.status).toBe("active");
    expect(afterSecond.isTrial).toBe(false);
    expect(afterFirst.trialStartedAt).not.toBeNull();
  });

  it("grace_period içinde premium erişim devam eder, past_due'da etmez", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "evt-4", eventType: "checkout.completed", payload: { userId: 5, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    await processWebhookEvent({ provider: "mock", eventId: "evt-5", eventType: "subscription.renewed", payload: { userId: 5, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    await processWebhookEvent({ provider: "mock", eventId: "evt-6", eventType: "subscription.payment_failed", payload: { userId: 5 }, rawPayloadForAudit: {} });
    expect((await getEntitlements(5)).isPremium).toBe(false); // past_due

    await processWebhookEvent({ provider: "mock", eventId: "evt-7", eventType: "subscription.grace_period_started", payload: { userId: 5, gracePeriodDays: 3 }, rawPayloadForAudit: {} });
    expect((await getEntitlements(5)).isPremium).toBe(true); // grace_period
  });

  it("cancelAtPeriodEnd sonrası dönem bitene kadar premium devam eder", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "evt-8", eventType: "checkout.completed", payload: { userId: 6, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    await processWebhookEvent({ provider: "mock", eventId: "evt-9", eventType: "subscription.renewed", payload: { userId: 6, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    await processWebhookEvent({ provider: "mock", eventId: "evt-10", eventType: "subscription.canceled", payload: { userId: 6, immediate: false }, rawPayloadForAudit: {} });
    expect((await getEntitlements(6)).isPremium).toBe(true);

    const sub = subscriptionsByUser.get(6)!;
    subscriptionsByUser.set(6, { ...sub, currentPeriodEnd: new Date(Date.now() - 1000) });
    expect((await getEntitlements(6)).isPremium).toBe(false);
    expect((await getEntitlements(6)).status).toBe("expired");
  });
});

describe("WEBHOOK — idempotency", () => {
  it("aynı (provider, eventId) ikinci kez gelirse durum İKİNCİ KEZ değiştirilmez", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "dup-1", eventType: "checkout.completed", payload: { userId: 7, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const first = await getEntitlements(7);
    const auditCountAfterFirst = auditLogs.filter((a) => a.userId === 7).length;

    const secondResult = await processWebhookEvent({ provider: "mock", eventId: "dup-1", eventType: "checkout.completed", payload: { userId: 7, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const second = await getEntitlements(7);

    expect(secondResult.status).toBe("ignored");
    expect(second).toEqual(first);
    expect(auditLogs.filter((a) => a.userId === 7).length).toBe(auditCountAfterFirst);
  });

  it("bilinmeyen event tipi 'failed' olarak işaretlenir, state değişmez", async () => {
    const before = await getEntitlements(8);
    const result = await processWebhookEvent({ provider: "mock", eventId: "unknown-1", eventType: "not.a.real.event", payload: { userId: 8 }, rawPayloadForAudit: {} });
    const after = await getEntitlements(8);
    expect(result.status).toBe("failed");
    expect(after).toEqual(before);
  });

  it("userId eksik payload 'failed' döner", async () => {
    const result = await processWebhookEvent({ provider: "mock", eventId: "malformed-1", eventType: "checkout.completed", payload: {}, rawPayloadForAudit: {} });
    expect(result.status).toBe("failed");
  });
});

describe("PAYMENT — refund", () => {
  it("refund geldiğinde abonelik canceled'a düşer", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "pay-1", eventType: "checkout.completed", payload: { userId: 9, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    await processWebhookEvent({ provider: "mock", eventId: "pay-2", eventType: "subscription.renewed", payload: { userId: 9, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    await processWebhookEvent({ provider: "mock", eventId: "pay-3", eventType: "payment.refunded", payload: { userId: 9 }, rawPayloadForAudit: {} });
    const snapshot = await getEntitlements(9);
    expect(snapshot.status).toBe("canceled");
    expect(snapshot.isPremium).toBe(false);
  });
});

describe("USAGE LIMITS — free vs premium kotası", () => {
  it("free kullanıcı kota aşınca UsageLimitExceededError alır", async () => {
    for (let i = 0; i < 3; i++) await simulateSuccessfulUsage(10, "AI_STUDY_PLAN"); // FREE_TIER_LIMITS.AI_STUDY_PLAN.maxUses = 3
    await expect(assertUsageAvailable(10, "AI_STUDY_PLAN")).rejects.toThrow(UsageLimitExceededError);
  });

  it("premium kullanıcı çok daha yüksek bir kotaya tabidir (free kotasından fazla kullanabilir)", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "usage-1", eventType: "checkout.completed", payload: { userId: 11, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    for (let i = 0; i < 3; i++) await simulateSuccessfulUsage(11, "AI_STUDY_PLAN");
    await expect(assertUsageAvailable(11, "AI_STUDY_PLAN")).resolves.toBeDefined(); // free limiti (3) aşıldı ama premium'da sorun yok
  });

  it("free kullanıcı premium-exclusive bir özelliği (limiti tanımsız) kullanamaz", async () => {
    await expect(assertUsageAvailable(12, "ADVANCED_ANALYTICS" as never)).rejects.toThrow(PremiumRequiredError);
  });
});

describe("SECURITY — cross-user izolasyon", () => {
  it("bir kullanıcının abonelik durumu başka bir userId ile karışmaz", async () => {
    await processWebhookEvent({ provider: "mock", eventId: "iso-1", eventType: "checkout.completed", payload: { userId: 20, planCode: "PREMIUM_MONTHLY" }, rawPayloadForAudit: {} });
    const userA = await getEntitlements(20);
    const userB = await getEntitlements(21);
    expect(userA.isPremium).toBe(true);
    expect(userB.isPremium).toBe(false);
    expect(await hasEntitlement(21, "AI_STUDY_PLAN")).toBe(false);
  });

  it("isPremium(userId) her zaman DB'den taze okur, çağıranın verdiği bir bayrağa güvenmez", async () => {
    // Bu testin asıl amacı: fonksiyon imzasında "istemciden gelen isPremium"
    // diye bir parametre YOK — yalnızca userId alıyor, dönüş değeri her
    // zaman subscriptionDb'den geliyor.
    expect(await isPremium(999)).toBe(false);
  });
});
