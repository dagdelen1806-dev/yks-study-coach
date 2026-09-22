import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getCurrentSubscription, getEntitlements } from "../subscriptions/entitlementService";
import { listActivePlans, updateSubscription, writeAuditLog } from "../subscriptions/subscriptionDb";
import { paymentProviderFactory } from "../subscriptions/paymentProviders/factory";
import { assertValidSubscriptionTransition, type SubscriptionStatus } from "../../shared/subscriptionStateMachine";

export const subscriptionRouter = router({
  getPlans: publicProcedure.query(() => listActivePlans()),

  // Client'ın useEntitlement() hook'unun okuduğu tek snapshot (spec §8).
  getCurrent: protectedProcedure.query(({ ctx }) => getEntitlements(ctx.user.id)),
  getEntitlements: protectedProcedure.query(({ ctx }) => getEntitlements(ctx.user.id)),

  cancel: protectedProcedure.input(z.object({ immediate: z.boolean().optional() })).mutation(async ({ ctx, input }) => {
    const current = await getCurrentSubscription(ctx.user.id);
    const nextStatus: SubscriptionStatus = input.immediate ? "canceled" : (current.status as SubscriptionStatus);
    if (input.immediate) assertValidSubscriptionTransition(current.status as SubscriptionStatus, "canceled");
    await updateSubscription(ctx.user.id, { status: nextStatus, cancelAtPeriodEnd: input.immediate ? 0 : 1, canceledAt: new Date() });
    await writeAuditLog({ userId: ctx.user.id, action: "user_canceled", oldState: { status: current.status }, newState: { status: nextStatus, cancelAtPeriodEnd: !input.immediate } });
    return getEntitlements(ctx.user.id);
  }),

  resume: protectedProcedure.mutation(async ({ ctx }) => {
    const current = await getCurrentSubscription(ctx.user.id);
    if (!current.cancelAtPeriodEnd && current.status !== "canceled") return getEntitlements(ctx.user.id);
    assertValidSubscriptionTransition(current.status as SubscriptionStatus, "active");
    await updateSubscription(ctx.user.id, { status: "active", cancelAtPeriodEnd: 0, canceledAt: null });
    await writeAuditLog({ userId: ctx.user.id, action: "user_resumed", oldState: { status: current.status }, newState: { status: "active" } });
    return getEntitlements(ctx.user.id);
  }),

  restore: protectedProcedure.input(z.object({ providerToken: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    const provider = paymentProviderFactory();
    const result = await provider.restorePurchase({ userId: ctx.user.id, providerToken: input.providerToken });
    if (!result.valid) throw new Error(result.reason ?? "Satın alma doğrulanamadı");
    await writeAuditLog({ userId: ctx.user.id, action: "purchase_restored", newState: { providerSubscriptionId: result.providerSubscriptionId } });
    return getEntitlements(ctx.user.id);
  }),
});
