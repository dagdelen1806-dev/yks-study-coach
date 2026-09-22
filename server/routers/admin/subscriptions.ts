import { z } from "zod";
import { adminProcedure, router } from "../../_core/trpc";
import { assertValidSubscriptionTransition, type SubscriptionStatus } from "../../../shared/subscriptionStateMachine";
import {
  getPlanByCode,
  getSubscriptionByUserId,
  listAllSubscriptionsForAdmin,
  listAuditLogsForUser,
  listPaymentsForUser,
  updateSubscription,
  writeAuditLog,
} from "../../subscriptions/subscriptionDb";

export const adminSubscriptionsRouter = router({
  list: adminProcedure.query(() => listAllSubscriptionsForAdmin()),

  get: adminProcedure.input(z.object({ userId: z.number().int() })).query(async ({ input }) => {
    const [subscription, payments, auditLogs] = await Promise.all([getSubscriptionByUserId(input.userId), listPaymentsForUser(input.userId), listAuditLogsForUser(input.userId)]);
    return { subscription, payments, auditLogs };
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
    const existing = await getSubscriptionByUserId(input.userId);
    const now = new Date();
    const periodEnd = new Date(now.getTime() + input.days * 24 * 60 * 60 * 1000);
    if (existing) assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "active");

    await updateSubscription(input.userId, { planId: plan.id, status: "active", currentPeriodStart: now, currentPeriodEnd: periodEnd, cancelAtPeriodEnd: 0, canceledAt: null, isManualOverride: 1, provider: null, providerSubscriptionId: null, providerCustomerId: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_grant", oldState: existing ? { status: existing.status } : null, newState: { status: "active", planCode: plan.code, until: periodEnd.toISOString() }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),

  revoke: adminProcedure.input(z.object({ userId: z.number().int(), reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamadı");
    const freePlan = await getPlanByCode("FREE");
    if (!freePlan) throw new Error("FREE planı bulunamadı");
    assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");

    await updateSubscription(input.userId, { planId: freePlan.id, status: "canceled", cancelAtPeriodEnd: 0, canceledAt: new Date(), isManualOverride: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "manual_revoke", oldState: { status: existing.status }, newState: { status: "canceled", planCode: "FREE" }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),

  cancel: adminProcedure.input(z.object({ userId: z.number().int(), reason: z.string().max(500).optional() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamadı");
    assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "canceled");
    await updateSubscription(input.userId, { status: "canceled", canceledAt: new Date(), cancelAtPeriodEnd: 0 });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_canceled", oldState: { status: existing.status }, newState: { status: "canceled" }, reason: input.reason });
    return getSubscriptionByUserId(input.userId);
  }),

  resume: adminProcedure.input(z.object({ userId: z.number().int() })).mutation(async ({ ctx, input }) => {
    const existing = await getSubscriptionByUserId(input.userId);
    if (!existing) throw new Error("Abonelik bulunamadı");
    assertValidSubscriptionTransition(existing.status as SubscriptionStatus, "active");
    await updateSubscription(input.userId, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: input.userId, adminId: ctx.user.id, action: "admin_resumed", oldState: { status: existing.status }, newState: { status: "active" } });
    return getSubscriptionByUserId(input.userId);
  }),
});
