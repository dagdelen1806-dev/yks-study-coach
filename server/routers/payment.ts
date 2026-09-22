import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { getPlanByCode, listPaymentsForUser } from "../subscriptions/subscriptionDb";
import { paymentProviderFactory } from "../subscriptions/paymentProviders/factory";
import { processWebhookEvent } from "../subscriptions/webhookProcessor";

export const paymentRouter = router({
  createCheckout: protectedProcedure.input(z.object({ planCode: z.string().min(1), successUrl: z.string().url(), cancelUrl: z.string().url() })).mutation(async ({ ctx, input }) => {
    const plan = await getPlanByCode(input.planCode);
    if (!plan || !plan.isActive) throw new Error("Geçersiz veya pasif plan.");
    const provider = paymentProviderFactory();
    return provider.createCheckout({ userId: ctx.user.id, planCode: input.planCode, successUrl: input.successUrl, cancelUrl: input.cancelUrl });
  }),

  getHistory: protectedProcedure.query(({ ctx }) => listPaymentsForUser(ctx.user.id)),

  /**
   * SANDBOX-ONLY yardımcı uç nokta (spec §53: gerçek provider credential'ı
   * yokken "FAKE PAYMENT SUCCESS" davranışı UYGULANMAYACAK). Bu, gerçek bir
   * ödemeyi "başarılı" gibi göstermiyor — tam tersine, gerçek bir
   * sağlayıcının normalde webhook ile tetikleyeceği AYNI
   * `processWebhookEvent` yolunu, yalnızca `PAYMENT_PROVIDER=mock`
   * olduğunda ve yalnızca ÇAĞIRAN KULLANICININ KENDİ hesabı için tetikler —
   * Paywall'ı uçtan uca test edebilmek için var, production'da
   * `PAYMENT_PROVIDER` gerçek bir sağlayıcıya çevrildiğinde bu uç nokta
   * otomatik olarak devre dışı kalır.
   */
  completeMockCheckout: protectedProcedure.input(z.object({ planCode: z.string().min(1) })).mutation(async ({ ctx, input }) => {
    if (ENV.paymentProvider !== "mock") {
      throw new Error("Bu uç nokta yalnızca PAYMENT_PROVIDER=mock iken kullanılabilir.");
    }
    const plan = await getPlanByCode(input.planCode);
    if (!plan || !plan.isActive) throw new Error("Geçersiz veya pasif plan.");

    const result = await processWebhookEvent({
      provider: "mock",
      eventId: `mock_manual_${ctx.user.id}_${Date.now()}`,
      eventType: "checkout.completed",
      payload: { userId: ctx.user.id, planCode: input.planCode },
      rawPayloadForAudit: { userId: ctx.user.id, planCode: input.planCode, source: "completeMockCheckout" },
    });
    if (result.status === "failed") throw new Error(result.reason ?? "Sandbox ödemesi işlenemedi.");
    return result;
  }),
});
