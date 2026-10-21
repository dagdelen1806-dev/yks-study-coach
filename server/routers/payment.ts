import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { ENV } from "../_core/env";
import { getPlanByCode, listPaymentsForUser } from "../subscriptions/subscriptionDb";
import { paymentProviderFactory } from "../subscriptions/paymentProviders/factory";
import { completeMockCheckoutForUser, itemFromPlanCode } from "../subscriptions/checkout";
import { QuoteError } from "../../shared/checkoutQuote";
import { TRPCError } from "@trpc/server";
import { quoteItemsInput } from "./subscription";

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
  // Sepet (`items`: bir ya da birden çok sınav) ya da eski istemciler için tek `planCode`.
  // Tutar sunucuda hesaplanır: paket (2+ sınav) ve branş indirimi (shared/checkoutQuote.ts).
  completeMockCheckout: protectedProcedure.input(z.object({ planCode: z.string().min(1).optional(), items: quoteItemsInput.optional() })).mutation(async ({ ctx, input }) => {
    if (ENV.paymentProvider !== "mock") {
      throw new Error("Bu uç nokta yalnızca PAYMENT_PROVIDER=mock iken kullanılabilir.");
    }
    const items = input.items ?? (input.planCode ? [await itemFromPlanCode(input.planCode)] : null);
    if (!items) throw new Error("Sepet boş.");
    try {
      const { quote, checkoutId } = await completeMockCheckoutForUser(ctx.user.id, items);
      return { status: "processed" as const, checkoutId, total: quote.total, lines: quote.lines };
    } catch (error) {
      if (error instanceof QuoteError) throw new TRPCError({ code: "BAD_REQUEST", message: error.message });
      throw error;
    }
  }),
});
