import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { assertValidSubscriptionTransition, type SubscriptionStatus } from "../../../shared/subscriptionStateMachine";
import { EXAM_TRACKS } from "../../../shared/exams";
import {
  ensureFreeSubscription,
  getPlanByCode,
  getSubscriptionByUserId,
  listAllPlans,
  listSubscriptionsForUser,
  updatePlanPricing,
  listAllSubscriptionsForAdmin,
  listAuditLogsForUser,
  listPaymentsForUser,
  updateSubscription,
  writeAuditLog,
} from "../../subscriptions/subscriptionDb";

// Her sınavın ayrı aboneliği var: işlemler (userId, track) için. Eski istemci sınav göndermezse YKS.
const trackField = z.enum(EXAM_TRACKS).default("YKS");

export const adminSubscriptionsRouter = router({
  list: adminProcedure.query(() => listAllSubscriptionsForAdmin()),

  get: adminProcedure.input(z.object({ userId: z.number().int() })).query(async ({ input }) => {
    const [subscriptions, payments, auditLogs] = await Promise.all([listSubscriptionsForUser(input.userId), listPaymentsForUser(input.userId), listAuditLogsForUser(input.userId)]);
    // `subscription`: geriye dönük uyumluluk için YKS (yoksa ilk) satırı.
    const subscription = subscriptions.find((row) => row.track === "YKS") ?? subscriptions[0];
    return { subscription, subscriptions, payments, auditLogs };
  }),

  /**
   * Elle erişim verme — spec §24/§9/§28/§29: "Manual entitlement ile
   * provider subscription birbirinden ayrı tutulmalı". `isManualOverride=1`
   * ile işaretlenir, `provider`/`providerSubscriptionId` alanları BOŞ
   * bırakılır (gerçek bir satın alma değil) — admin bunu geri aldığında
   * (revoke) hiçbir gerçek sağlayıcı çağrısı tetiklenmez, çünkü zaten hiç
   * yoktu. (Not: ayrı bir `manual_entitlements` tablosu yerine mevcut
   * `subscriptions.isManualOverride` bayrağı kullanıldı — spec §58 "mevcut
   * schema'yı yeniden tasarlama, duplicate logic oluşturma" ile tutarlı;
   * bkz. docs/admin/ADMIN-COMMAND-CENTER.md "Known limitations".)
   */
  grant: adminProcedure.input(z.object({ userId: z.number().int(), planCode: z.string().min(1), days: z.number().int().min(1).max(3650), reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const plan = await getPlanByCode(input.planCode);
    if (!plan) throw new Error(`Plan bulunamadı: ${input.planCode}`);
    // Plan bir sınava aitse onun aboneliği; satır yoksa önce ücretsiz satır açılır.
    const track = plan.track ?? "YKS";
    const existing = await getSubscriptionByUserId(input.userId, track);
    await ensureFreeSubscription(input.userId, track);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
    if (existing) assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "active");

    await updateSubscription(input.userId, track, { planId: plan.id, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: 0, canceledAt: null, isManualOverride: 1, provider: null, providerSubscriptionId: null, providerCustomerId: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_grant", oldState: existing ? { status: existing.status } : null, newState: { status: "active", planCode: plan.code, track, until: periodEnd.toISOString() }, reason: input.reason });
    return getSubscriptionByUserId(input.userId, track);
  }),

  revoke: adminProcedure.input(z.object({ userId: z.number().int(), track: trackField, reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId, input.track);
    if (!existing) throw new Error("Abonelik bulunamadı");
    const freePlan = await getPlanByCode("FREE");
    if (!freePlan) throw new Error("FREE planı bulunamadı");
    assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");

    await updateSubscription(input.userId, input.track, { planId: freePlan.id, status: "canceled", cancelAtPeriodEnd: 0, canceledAt: new Date(), isManualOverride: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_revoke", oldState: { status: existing.status }, newState: { status: "canceled", planCode: "FREE", track: input.track }, reason: input.reason });
    return getSubscriptionByUserId(input.userId, input.track);
  }),

  cancel: adminProcedure.input(z.object({ userId: z.number().int(), track: trackField, reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId, input.track);
    if (!existing) throw new Error("Abonelik bulunamadı");
    assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");
    await updateSubscription(input.userId, input.track, { status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_canceled", oldState: { status: existing.status }, newState: { status: "canceled", track: input.track }, reason: input.reason });
    return getSubscriptionByUserId(input.userId, input.track);
  }),

  resume: adminProcedure.input(z.object({ userId: z.number().int(), track: trackField })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId, input.track);
    if (!existing) throw new Error("Abonelik bulunamadı");
    assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "active");
    await updateSubscription(input.userId, input.track, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_resumed", oldState: { status: existing.status }, newState: { status: "active", track: input.track } });
    return getSubscriptionByUserId(input.userId, input.track);
  }),

  // Fiyatlar: her sınavın planları (satışta olmayanlar dahil) ve fiyat/deneme/satış durumu düzenleme.
  plans: adminProcedure.query(() => listAllPlans()),
  updatePlan: adminProcedure
    .input(z.object({ planId: z.number().int().positive(), price: z.number().int().min(0).max(100_000_000).optional(), trialDays: z.number().int().min(0).max(60).optional(), isActive: z.boolean().optional() }))
    .mutation(async ({ ctx, input }) => {
      const plan = await updatePlanPricing(input.planId, { price: input.price, trialDays: input.trialDays, isActive: input.isActive });
      if (!plan) throw new Error("Plan bulunamadı");
      await writeAuditLog({ userId: ctx.user.id, adminId: ctx.user.id, action: "plan_pricing_updated", newState: { planCode: plan.code, price: plan.price, trialDays: plan.trialDays, isActive: plan.isActive } });
      return plan;
    }),
});
